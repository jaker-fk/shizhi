from __future__ import annotations

import logging
import os
import time

from sqlalchemy import create_engine, text
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


def init_db(max_attempts: int = 30, delay_seconds: float = 2.0) -> None:
    """等待 MySQL 就绪并建表。Compose 已经等到 healthy，这里再兜底一次。"""
    last_error: Exception | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            Base.metadata.create_all(bind=engine)
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
