from __future__ import annotations

import logging
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Annotated
from urllib.parse import urlparse

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy import delete, func, select, text, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from db import get_db, init_db
from models import KnowledgePoint, KnowledgeTable, User, UserSession, utcnow
from schemas import (
    FavoritePayload,
    ImportRequest,
    KnowledgeCreate,
    KnowledgeUpdate,
    LoginPayload,
    MasteredPayload,
    RegisterPayload,
    TablePayload,
    clean_line,
    clean_text,
)
from security import (
    SESSION_COOKIE,
    clear_session_cookie,
    create_session,
    hash_password,
    hash_session_token,
    password_needs_rehash,
    verify_password,
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
    version="1.1.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)


@app.middleware("http")
async def api_guard(request: Request, call_next):
    """同源校验 + API 禁用缓存，降低 CSRF 与缓存泄露风险。"""
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        origin = request.headers.get("origin")
        if origin:
            origin_host = urlparse(origin).netloc.lower()
            request_host = request.headers.get("host", "").lower()
            if not request_host or origin_host != request_host:
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"detail": "跨站请求被拒绝"},
                )

    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


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
        "mnemonic": point.mnemonic or "",
        "category": point.category,
        "tags": point.tags or [],
        "source": point.source,
        "favorite": bool(point.favorite),
        "mastered": bool(point.mastered),
        "createdAt": as_iso(point.created_at),
        "updatedAt": as_iso(point.updated_at),
    }


def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "displayName": user.display_name or user.email.split("@")[0],
        "createdAt": as_iso(user.created_at),
    }


def apply_payload(point: KnowledgePoint, payload: KnowledgeUpdate) -> None:
    point.title = payload.title
    point.content = payload.content
    point.mnemonic = payload.mnemonic
    point.category = payload.category
    point.tags = payload.tags
    point.source = payload.source
    point.favorite = payload.favorite


def normalize_table_payload(payload: TablePayload) -> tuple[str, str, list[str], list[list[str]]]:
    title = clean_line(payload.title)[:120] or "未命名表格"
    description = clean_text(payload.description)[:500]
    columns = [
        clean_line(column)[:40] or f"列 {index + 1}"
        for index, column in enumerate(payload.columns[:20])
    ]
    if not columns:
        columns = ["列 1"]

    rows = []
    for raw_row in payload.rows[:500]:
        row = []
        for index in range(len(columns)):
            value = raw_row[index] if index < len(raw_row) else ""
            row.append(clean_text(value)[:2000])
        rows.append(row)
    return title, description, columns, rows


def serialize_table(table: KnowledgeTable) -> dict:
    columns = table.columns or []
    rows = table.rows or []
    return {
        "id": table.id,
        "title": table.title,
        "description": table.description or "",
        "columns": columns,
        "rows": rows,
        "columnCount": len(columns),
        "rowCount": len(rows),
        "createdAt": as_iso(table.created_at),
        "updatedAt": as_iso(table.updated_at),
    }


def get_owned_table(db: Session, table_id: str, user: User) -> KnowledgeTable:
    table = db.scalar(
        select(KnowledgeTable).where(
            KnowledgeTable.id == table_id,
            KnowledgeTable.owner_id == user.id,
        )
    )
    if table is None:
        raise HTTPException(status_code=404, detail="表格不存在")
    return table


def get_current_session(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> UserSession:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="请先登录",
        )

    session = db.scalar(
        select(UserSession).where(
            UserSession.token_hash == hash_session_token(token),
            UserSession.expires_at > utcnow(),
        )
    )
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录已过期，请重新登录",
        )
    return session


def get_current_user(
    session: Annotated[UserSession, Depends(get_current_session)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    user = db.get(User, session.user_id)
    if user is None or user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="账号不可用，请重新登录",
        )
    return user


def get_owned_point(
    db: Session,
    item_id: str,
    user: User,
) -> KnowledgePoint:
    point = db.scalar(
        select(KnowledgePoint).where(
            KnowledgePoint.id == item_id,
            KnowledgePoint.owner_id == user.id,
        )
    )
    if point is None:
        # 对别人的记录统一返回 404，避免暴露记录是否存在。
        raise HTTPException(status_code=404, detail="知识点不存在")
    return point


@app.get("/api/health")
def health(db: Annotated[Session, Depends(get_db)]) -> dict:
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "mysql"}


@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterPayload,
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    first_user = db.scalar(select(func.count()).select_from(User)) == 0
    registration_open = os.getenv("ALLOW_REGISTRATION", "true").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    if not registration_open and not first_user:
        raise HTTPException(status_code=403, detail="注册已关闭，请联系管理员")

    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(status_code=409, detail="这个邮箱已经注册过了")

    user = User(
        id=str(uuid.uuid4()),
        email=payload.email,
        password_hash=hash_password(payload.password),
        display_name=payload.displayName or payload.email.split("@")[0],
        status="active",
        created_at=utcnow(),
        updated_at=utcnow(),
    )
    db.add(user)
    try:
        db.flush()
        if first_user:
            # 兼容旧版单用户数据：第一个注册的账号接管未被归属的记录。
            db.execute(
                update(KnowledgePoint)
                .where(KnowledgePoint.owner_id.is_(None))
                .values(owner_id=user.id)
            )
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="这个邮箱已经注册过了") from error

    db.refresh(user)
    create_session(db, user, request, response)
    return serialize_user(user)


@app.post("/api/auth/login")
def login(
    payload: LoginPayload,
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_password(user.password_hash, payload.password):
        raise HTTPException(status_code=401, detail="邮箱或密码不正确")
    if user.status != "active":
        raise HTTPException(status_code=403, detail="账号已被停用")

    db.execute(delete(UserSession).where(UserSession.expires_at <= utcnow()))
    if password_needs_rehash(user.password_hash):
        user.password_hash = hash_password(payload.password)
    db.commit()

    create_session(db, user, request, response)
    return serialize_user(user)


@app.get("/api/auth/me")
def me(user: Annotated[User, Depends(get_current_user)]) -> dict:
    return serialize_user(user)


@app.post("/api/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    session: Annotated[UserSession, Depends(get_current_session)],
    db: Annotated[Session, Depends(get_db)],
    response: Response,
) -> Response:
    db.delete(session)
    db.commit()
    clear_session_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@app.get("/api/knowledge")
def list_knowledge(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    points = db.scalars(
        select(KnowledgePoint)
        .where(KnowledgePoint.owner_id == user.id)
        .order_by(KnowledgePoint.updated_at.desc())
    ).all()
    return {"items": [serialize(point) for point in points], "count": len(points)}


@app.get("/api/knowledge/{item_id}")
def get_knowledge(
    item_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    return serialize(get_owned_point(db, item_id, user))


@app.post("/api/knowledge", status_code=status.HTTP_201_CREATED)
def create_knowledge(
    payload: KnowledgeCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    item_id = payload.id or str(uuid.uuid4())
    if db.get(KnowledgePoint, item_id) is not None:
        raise HTTPException(status_code=409, detail="知识点 ID 已存在")

    now = utcnow()
    point = KnowledgePoint(
        id=item_id,
        owner_id=user.id,
        title=payload.title,
        content=payload.content,
        mnemonic=payload.mnemonic,
        category=payload.category,
        tags=payload.tags,
        source=payload.source,
        favorite=payload.favorite,
        mastered=payload.mastered,
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
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    point = get_owned_point(db, item_id, user)
    apply_payload(point, payload)
    point.updated_at = utcnow()
    db.commit()
    db.refresh(point)
    return serialize(point)


@app.patch("/api/knowledge/{item_id}/favorite")
def set_favorite(
    item_id: str,
    payload: FavoritePayload,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    point = get_owned_point(db, item_id, user)
    if point.favorite != payload.favorite:
        point.favorite = payload.favorite
        db.commit()
        db.refresh(point)
    return serialize(point)


@app.patch("/api/knowledge/{item_id}/mastered")
def set_mastered(
    item_id: str,
    payload: MasteredPayload,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    point = get_owned_point(db, item_id, user)
    if point.mastered != payload.mastered:
        point.mastered = payload.mastered
        db.commit()
        db.refresh(point)
    return serialize(point)


@app.delete("/api/knowledge/{item_id}")
def delete_knowledge(
    item_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    point = get_owned_point(db, item_id, user)
    db.delete(point)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.post("/api/knowledge/import")
def import_knowledge(
    payload: ImportRequest,
    user: Annotated[User, Depends(get_current_user)],
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
        existing = db.scalar(
            select(KnowledgePoint).where(
                KnowledgePoint.id == item_id,
                KnowledgePoint.owner_id == user.id,
            )
        )

        if existing is None:
            # 如果这个 ID 属于其他用户，跳过，绝不跨租户覆盖。
            if db.get(KnowledgePoint, item_id) is not None:
                skipped += 1
                continue
            created_at = as_utc_naive(item.createdAt) or now
            point = KnowledgePoint(
                id=item_id,
                owner_id=user.id,
                title=item.title,
                content=item.content,
                mnemonic=item.mnemonic,
                category=item.category,
                tags=item.tags,
                source=item.source,
                favorite=item.favorite,
                mastered=item.mastered,
                created_at=created_at,
                updated_at=as_utc_naive(item.updatedAt) or created_at,
            )
            db.add(point)
            added += 1
        else:
            apply_payload(existing, item)
            if "mastered" in item.model_fields_set:
                existing.mastered = item.mastered
            existing.created_at = as_utc_naive(item.createdAt) or existing.created_at
            existing.updated_at = as_utc_naive(item.updatedAt) or now
            updated += 1

    if added == 0 and updated == 0:
        raise HTTPException(status_code=422, detail="没有可导入的有效知识点")

    db.commit()
    logger.info(
        "Imported knowledge points: user=%s added=%s updated=%s skipped=%s",
        user.id,
        added,
        updated,
        skipped,
    )
    return {"added": added, "updated": updated, "skipped": skipped}


@app.get("/api/tables")
def list_tables(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    tables = db.scalars(
        select(KnowledgeTable)
        .where(KnowledgeTable.owner_id == user.id)
        .order_by(KnowledgeTable.updated_at.desc())
    ).all()
    return {"items": [serialize_table(table) for table in tables], "count": len(tables)}


@app.get("/api/tables/{table_id}")
def get_table(
    table_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    return serialize_table(get_owned_table(db, table_id, user))


@app.post("/api/tables", status_code=status.HTTP_201_CREATED)
def create_table(
    payload: TablePayload,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    title, description, columns, rows = normalize_table_payload(payload)
    now = utcnow()
    table = KnowledgeTable(
        id=str(uuid.uuid4()),
        owner_id=user.id,
        title=title,
        description=description,
        columns=columns,
        rows=rows,
        created_at=now,
        updated_at=now,
    )
    db.add(table)
    db.commit()
    db.refresh(table)
    return serialize_table(table)


@app.put("/api/tables/{table_id}")
def update_table(
    table_id: str,
    payload: TablePayload,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    table = get_owned_table(db, table_id, user)
    title, description, columns, rows = normalize_table_payload(payload)
    table.title = title
    table.description = description
    table.columns = columns
    table.rows = rows
    table.updated_at = utcnow()
    db.commit()
    db.refresh(table)
    return serialize_table(table)


@app.delete("/api/tables/{table_id}")
def delete_table(
    table_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    table = get_owned_table(db, table_id, user)
    db.delete(table)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
