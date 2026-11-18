from __future__ import annotations

import hashlib
import os
import secrets
import uuid
from datetime import timedelta

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import Request, Response
from sqlalchemy.orm import Session

from models import User, UserSession, utcnow

SESSION_COOKIE = "shizhi_session"
SESSION_DAYS = max(1, min(int(os.getenv("SESSION_DAYS", "14")), 90))
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}

password_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=2,
    hash_len=32,
    salt_len=16,
)


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return password_hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def password_needs_rehash(password_hash: str) -> bool:
    try:
        return password_hasher.check_needs_rehash(password_hash)
    except InvalidHashError:
        return False


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=SESSION_DAYS * 24 * 60 * 60,
        path="/",
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=SESSION_COOKIE,
        path="/",
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
    )


def create_session(
    db: Session,
    user: User,
    request: Request,
    response: Response,
) -> UserSession:
    token = secrets.token_urlsafe(32)
    now = utcnow()
    session = UserSession(
        id=str(uuid.uuid4()),
        user_id=user.id,
        token_hash=hash_session_token(token),
        expires_at=now + timedelta(days=SESSION_DAYS),
        created_at=now,
        last_seen_at=now,
        ip=(request.client.host if request.client else "")[:64],
        user_agent=request.headers.get("user-agent", "")[:255],
    )
    db.add(session)
    db.commit()
    set_session_cookie(response, token)
    return session
