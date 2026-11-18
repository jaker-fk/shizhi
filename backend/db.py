from __future__ import annotations

import logging
import os
import time

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import URL
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker

from models import Base

logger = logging.getLogger("shizhi.db")

DB_HOST = os.getenv("DB_HOST", "mysql")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_NAME = os.getenv("DB_NAME", "shizhi")
DB_USER = os.getenv("DB_USER", "shizhi")
DB_PASSWORD = os.getenv("DB_PASSWORD", "shizhi_dev_password")

database_url = URL.create(
    "mysql+pymysql",
    username=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME,
    query={"charset": "utf8mb4"},
)

engine = create_engine(
    database_url,
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_size=5,
    max_overflow=10,
    connect_args={"connect_timeout": 5},
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


def migrate_schema() -> None:
    """为单用户旧库补充 owner_id；新库由 create_all 直接建好。"""
    inspector = inspect(engine)
    if "knowledge_points" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("knowledge_points")}
    if "owner_id" not in columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE knowledge_points "
                    "ADD COLUMN owner_id CHAR(36) NULL AFTER id"
                )
            )
        logger.info("Added owner_id column to existing knowledge_points table.")

    indexes = {
        index["name"] for index in inspect(engine).get_indexes("knowledge_points")
    }
    if "ix_knowledge_points_owner_updated" not in indexes:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "CREATE INDEX ix_knowledge_points_owner_updated "
                    "ON knowledge_points (owner_id, updated_at)"
                )
            )
        logger.info("Created owner_id index.")


def init_db(max_attempts: int = 30, delay_seconds: float = 2.0) -> None:
    """等待 MySQL 就绪并建表。Compose 已经等到 healthy，这里再兜底一次。"""
    last_error: Exception | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            Base.metadata.create_all(bind=engine)
            migrate_schema()
            logger.info("MySQL connected; schema is ready.")
            return
        except OperationalError as error:
            last_error = error
            logger.warning(
                "MySQL not ready (%s/%s): %s",
                attempt,
                max_attempts,
                error.__class__.__name__,
            )
            time.sleep(delay_seconds)
    raise RuntimeError("MySQL did not become ready in time") from last_error


def get_db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
