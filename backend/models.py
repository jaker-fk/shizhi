from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, JSON, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    """MySQL DATETIME 不保存时区，统一存 UTC 的 naive 时间。"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    __table_args__ = {
        "mysql_charset": "utf8mb4",
        "mysql_collate": "utf8mb4_unicode_ci",
    }

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utcnow, onupdate=utcnow
    )

    sessions: Mapped[list[UserSession]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class UserSession(Base):
    __tablename__ = "sessions"
    __table_args__ = (
        Index("ix_sessions_expires_at", "expires_at"),
        {
            "mysql_charset": "utf8mb4",
            "mysql_collate": "utf8mb4_unicode_ci",
        },
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)
    ip: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    user_agent: Mapped[str] = mapped_column(String(255), nullable=False, default="")

    user: Mapped[User] = relationship(back_populates="sessions")


class KnowledgePoint(Base):
    __tablename__ = "knowledge_points"
    __table_args__ = (
        Index("ix_knowledge_points_owner_updated", "owner_id", "updated_at"),
        Index("ix_knowledge_points_updated_at", "updated_at"),
        Index("ix_knowledge_points_category", "category"),
        Index("ix_knowledge_points_favorite", "favorite"),
        {
            "mysql_charset": "utf8mb4",
            "mysql_collate": "utf8mb4_unicode_ci",
        },
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    owner_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    mnemonic: Mapped[str] = mapped_column(String(2000), nullable=False, default="")
    category: Mapped[str] = mapped_column(String(30), nullable=False, default="")
    tags: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    source: Mapped[str] = mapped_column(String(300), nullable=False, default="")
    favorite: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    mastered: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utcnow, onupdate=utcnow
    )


class KnowledgeTable(Base):
    __tablename__ = "knowledge_tables"
    __table_args__ = (
        Index("ix_knowledge_tables_owner_updated", "owner_id", "updated_at"),
        {
            "mysql_charset": "utf8mb4",
            "mysql_collate": "utf8mb4_unicode_ci",
        },
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    owner_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    columns: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    rows: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utcnow, onupdate=utcnow
    )
