from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

CONTROL_CHARS = re.compile(r"[\u0000-\u0008\u000b\u000c\u000e-\u001f]")
TAG_SPLIT = re.compile(r"[,，、;；\n]")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MAX_TAGS = 20
MAX_TAG_LENGTH = 30


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        value = str(value)
    return CONTROL_CHARS.sub("", value).strip()


def clean_line(value: Any) -> str:
    return re.sub(r"\s+", " ", clean_text(value)).strip()


def clean_tags(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        source = TAG_SPLIT.split(value)
    elif isinstance(value, (list, tuple)):
        source = value
    else:
        return []

    tags: list[str] = []
    seen: set[str] = set()
    for raw in source:
        tag = clean_line(raw).lstrip("#").strip()[:MAX_TAG_LENGTH]
        if not tag:
            continue
        key = tag.casefold()
        if key in seen:
            continue
        seen.add(key)
        tags.append(tag)
        if len(tags) >= MAX_TAGS:
            break
    return tags


class KnowledgePayload(BaseModel):
    title: str = Field(max_length=120)
    content: str = Field(default="", max_length=12000)
    mnemonic: str = Field(default="", max_length=2000)
    category: str = Field(default="", max_length=30)
    tags: list[str] = Field(default_factory=list, max_length=MAX_TAGS)
    source: str = Field(default="", max_length=300)
    favorite: bool = False

    @field_validator("title", mode="before")
    @classmethod
    def normalize_title(cls, value: Any) -> str:
        title = clean_line(value)[:120]
        if not title:
            raise ValueError("标题不能为空")
        return title

    @field_validator("content", mode="before")
    @classmethod
    def normalize_content(cls, value: Any) -> str:
        return clean_text(value)[:12000]

    @field_validator("mnemonic", mode="before")
    @classmethod
    def normalize_mnemonic(cls, value: Any) -> str:
        return clean_text(value)[:2000]

    @field_validator("category", mode="before")
    @classmethod
    def normalize_category(cls, value: Any) -> str:
        return clean_line(value)[:30]

    @field_validator("source", mode="before")
    @classmethod
    def normalize_source(cls, value: Any) -> str:
        return clean_line(value)[:300]

    @field_validator("tags", mode="before")
    @classmethod
    def normalize_tags(cls, value: Any) -> list[str]:
        return clean_tags(value)

    @field_validator("favorite", mode="before")
    @classmethod
    def normalize_favorite(cls, value: Any) -> bool:
        if isinstance(value, str):
            return value.strip().casefold() in {"true", "1", "yes", "on"}
        return bool(value)


class KnowledgeCreate(KnowledgePayload):
    id: str | None = Field(default=None, max_length=100)
    createdAt: datetime | None = None
    updatedAt: datetime | None = None
    mastered: bool = False

    @field_validator("id", mode="before")
    @classmethod
    def normalize_id(cls, value: Any) -> str | None:
        if value is None:
            return None
        cleaned = clean_line(value)[:100]
        return cleaned or None

    @field_validator("mastered", mode="before")
    @classmethod
    def normalize_mastered(cls, value: Any) -> bool:
        if isinstance(value, str):
            return value.strip().casefold() in {"true", "1", "yes", "on"}
        return bool(value)


class KnowledgeUpdate(KnowledgePayload):
    pass


class FavoritePayload(BaseModel):
    favorite: bool


class MasteredPayload(BaseModel):
    mastered: bool


class ImportRequest(BaseModel):
    # 逐条校验，坏记录/null 跳过，不影响其余数据。
    items: list[Any] = Field(default_factory=list, max_length=2000)


class RegisterPayload(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(min_length=8, max_length=128)
    displayName: str = Field(default="", max_length=80)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: Any) -> str:
        email = clean_line(value).lower()
        if not EMAIL_RE.match(email):
            raise ValueError("请输入有效的邮箱地址")
        return email

    @field_validator("displayName", mode="before")
    @classmethod
    def normalize_display_name(cls, value: Any) -> str:
        return clean_line(value)[:80]


class LoginPayload(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: Any) -> str:
        return clean_line(value).lower()
