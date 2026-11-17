from __future__ import annotations

import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Response, status
from pydantic import ValidationError
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from db import get_db, init_db
from models import KnowledgePoint, utcnow
from schemas import (
    FavoritePayload,
    ImportRequest,
    KnowledgeCreate,
    KnowledgeUpdate,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("shizhi.api")


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="拾知 API",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)


def as_iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def as_utc_naive(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is not None:
        value = value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def serialize(point: KnowledgePoint) -> dict:
    return {
        "id": point.id,
        "title": point.title,
        "content": point.content,
        "category": point.category,
        "tags": point.tags or [],
        "source": point.source,
        "favorite": bool(point.favorite),
        "createdAt": as_iso(point.created_at),
        "updatedAt": as_iso(point.updated_at),
    }


def apply_payload(point: KnowledgePoint, payload: KnowledgeUpdate) -> None:
    point.title = payload.title
    point.content = payload.content
    point.category = payload.category
    point.tags = payload.tags
    point.source = payload.source
    point.favorite = payload.favorite


@app.get("/api/health")
def health(db: Annotated[Session, Depends(get_db)]) -> dict:
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "mysql"}


@app.get("/api/knowledge")
def list_knowledge(db: Annotated[Session, Depends(get_db)]) -> dict:
    points = db.scalars(
        select(KnowledgePoint).order_by(KnowledgePoint.updated_at.desc())
    ).all()
    return {"items": [serialize(point) for point in points], "count": len(points)}


@app.get("/api/knowledge/{item_id}")
def get_knowledge(
    item_id: str,
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    point = db.get(KnowledgePoint, item_id)
    if point is None:
        raise HTTPException(status_code=404, detail="知识点不存在")
    return serialize(point)


@app.post("/api/knowledge", status_code=status.HTTP_201_CREATED)
def create_knowledge(
    payload: KnowledgeCreate,
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    item_id = payload.id or str(uuid.uuid4())
    if db.get(KnowledgePoint, item_id) is not None:
        raise HTTPException(status_code=409, detail="知识点 ID 已存在")

    now = utcnow()
    point = KnowledgePoint(
        id=item_id,
        title=payload.title,
        content=payload.content,
        category=payload.category,
        tags=payload.tags,
        source=payload.source,
        favorite=payload.favorite,
        created_at=as_utc_naive(payload.createdAt) or now,
        updated_at=as_utc_naive(payload.updatedAt) or now,
    )
    db.add(point)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="知识点 ID 已存在") from error
    db.refresh(point)
    return serialize(point)


@app.put("/api/knowledge/{item_id}")
def update_knowledge(
    item_id: str,
    payload: KnowledgeUpdate,
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    point = db.get(KnowledgePoint, item_id)
    if point is None:
        raise HTTPException(status_code=404, detail="知识点不存在")
    apply_payload(point, payload)
    point.updated_at = utcnow()
    db.commit()
    db.refresh(point)
    return serialize(point)


@app.patch("/api/knowledge/{item_id}/favorite")
def set_favorite(
    item_id: str,
    payload: FavoritePayload,
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    point = db.get(KnowledgePoint, item_id)
    if point is None:
        raise HTTPException(status_code=404, detail="知识点不存在")
    if point.favorite != payload.favorite:
        point.favorite = payload.favorite
        db.commit()
        db.refresh(point)
    return serialize(point)


@app.delete("/api/knowledge/{item_id}")
def delete_knowledge(
    item_id: str,
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    point = db.get(KnowledgePoint, item_id)
    if point is None:
        raise HTTPException(status_code=404, detail="知识点不存在")
    db.delete(point)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.post("/api/knowledge/import")
def import_knowledge(
    payload: ImportRequest,
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    added = 0
    updated = 0
    skipped = 0
    now = utcnow()

    for raw in payload.items:
        try:
            item = KnowledgeCreate.model_validate(raw)
        except ValidationError:
            skipped += 1
            continue

        item_id = item.id or str(uuid.uuid4())
        existing = db.get(KnowledgePoint, item_id)
        if existing is None:
            created_at = as_utc_naive(item.createdAt) or now
            point = KnowledgePoint(
                id=item_id,
                title=item.title,
                content=item.content,
                category=item.category,
                tags=item.tags,
                source=item.source,
                favorite=item.favorite,
                created_at=created_at,
                updated_at=as_utc_naive(item.updatedAt) or created_at,
            )
            db.add(point)
            added += 1
        else:
            apply_payload(existing, item)
            existing.created_at = as_utc_naive(item.createdAt) or existing.created_at
            existing.updated_at = as_utc_naive(item.updatedAt) or now
            updated += 1

    if added == 0 and updated == 0:
        raise HTTPException(status_code=422, detail="没有可导入的有效知识点")

    db.commit()
    logger.info(
        "Imported knowledge points: added=%s updated=%s skipped=%s",
        added,
        updated,
        skipped,
    )
    return {"added": added, "updated": updated, "skipped": skipped}
