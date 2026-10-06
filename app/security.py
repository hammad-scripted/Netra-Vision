"""JWT authentication for signed-in application accounts."""

from datetime import datetime, timedelta, timezone
import os
from typing import Any
from uuid import uuid4

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError

from services.user_store import get_user_by_id


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)


def get_signing_secret() -> str:
    secret = os.getenv("NETRA_AUTH_SECRET_KEY", "").strip()
    if len(secret.encode("utf-8")) < 32:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured. Set NETRA_AUTH_SECRET_KEY to a random secret of at least 32 bytes.",
        )
    return secret


def create_access_token(user_id: str, secret: str, expires_in: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(seconds=expires_in),
        "jti": str(uuid4()),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def get_current_user(token: str | None = Depends(oauth2_scheme)) -> dict[str, Any]:
    """Validate an expiring bearer token and load its account."""
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in to continue.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    secret = get_signing_secret()
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"require": ["exp", "iat", "sub"]},
        )
        user_id = payload.get("sub")
        if not isinstance(user_id, str):
            raise InvalidTokenError("Invalid account claim")
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your sign-in has expired or is invalid. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = get_user_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account is no longer available. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {key: user[key] for key in ("id", "username", "email", "created_at")}
