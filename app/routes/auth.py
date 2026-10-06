"""Account registration and password-based sign-in."""

import os
import re
import secrets
import sqlite3
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pwdlib import PasswordHash

from schemas.auth import AuthResponse, RegistrationRequest, UserResponse
from services.user_store import create_user, get_user_by_identifier
from security import create_access_token, get_current_user, get_signing_secret
from services.analysis_store import assign_unowned_analysis_results


router = APIRouter(prefix="/auth", tags=["Authentication"])
_password_hasher = PasswordHash.recommended()
_dummy_password_hash = _password_hasher.hash(secrets.token_urlsafe(32))
_username_pattern = re.compile(r"^[A-Za-z0-9_.-]{3,32}$")


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_account(request: RegistrationRequest) -> dict[str, Any]:
    """Create a username/email account and start its session."""
    if not _username_pattern.fullmatch(request.username):
        raise HTTPException(status_code=422, detail="Username must be 3–32 letters, numbers, dots, dashes, or underscores.")
    signing_secret = get_signing_secret()
    expires_in = _token_lifetime_seconds()
    try:
        user, is_first_user = create_user(
            request.username,
            str(request.email),
            _password_hasher.hash(request.password),
        )
    except sqlite3.IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That username or email is already registered.",
        ) from exc

    if is_first_user:
        assign_unowned_analysis_results(user["id"])
    token = create_access_token(user["id"], signing_secret, expires_in)
    return _auth_response(user, token, expires_in)


@router.post("/token", response_model=AuthResponse)
def login_account(form_data: OAuth2PasswordRequestForm = Depends()) -> dict[str, Any]:
    """Sign in with a username or email address and password."""
    user = get_user_by_identifier(form_data.username)
    candidate_hash = user["password_hash"] if user else _dummy_password_hash
    try:
        password_matches = _password_hasher.verify(form_data.password, candidate_hash)
    except Exception:
        password_matches = False
    if user is None or not password_matches:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    expires_in = _token_lifetime_seconds()
    token = create_access_token(user["id"], get_signing_secret(), expires_in)
    return _auth_response(user, token, expires_in)


@router.get("/me", response_model=UserResponse)
def read_current_account(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    """Return the signed-in account profile."""
    return user


def _token_lifetime_seconds() -> int:
    try:
        minutes = int(os.getenv("NETRA_ACCESS_TOKEN_MINUTES", "60"))
    except ValueError as exc:
        raise HTTPException(status_code=503, detail="NETRA_ACCESS_TOKEN_MINUTES must be a positive integer.") from exc
    if minutes < 1 or minutes > 1440:
        raise HTTPException(status_code=503, detail="NETRA_ACCESS_TOKEN_MINUTES must be between 1 and 1440.")
    return minutes * 60


def _auth_response(user: dict[str, Any], token: str, expires_in: int) -> dict[str, Any]:
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": expires_in,
        "user": UserResponse(**{key: user[key] for key in ("id", "username", "email", "created_at")}),
    }
