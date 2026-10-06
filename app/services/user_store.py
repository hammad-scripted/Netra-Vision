"""SQLite storage for application accounts."""

from contextlib import contextmanager
from datetime import datetime, timezone
import sqlite3
from typing import Any, Iterator
from uuid import uuid4

from services.database import database_connection


@contextmanager
def _connection() -> Iterator[sqlite3.Connection]:
    with database_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL COLLATE NOCASE UNIQUE,
                email TEXT NOT NULL COLLATE NOCASE UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        yield connection


def _user_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return {
        "id": row["id"],
        "username": row["username"],
        "email": row["email"],
        "created_at": row["created_at"],
        "password_hash": row["password_hash"],
    }


def create_user(username: str, email: str, password_hash: str) -> tuple[dict[str, Any], bool]:
    """Create an account and report whether it is the first account."""
    user = {
        "id": str(uuid4()),
        "username": username.casefold(),
        "email": email.casefold(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "password_hash": password_hash,
    }
    with _connection() as connection:
        connection.execute("BEGIN IMMEDIATE")
        account_count = connection.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        connection.execute(
            "INSERT INTO users (id, username, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
            (user["id"], user["username"], user["email"], password_hash, user["created_at"]),
        )
    return user, account_count == 0


def get_user_by_identifier(identifier: str) -> dict[str, Any] | None:
    normalized = identifier.strip().casefold()
    with _connection() as connection:
        row = connection.execute(
            "SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1",
            (normalized, normalized),
        ).fetchone()
    return _user_dict(row)


def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    with _connection() as connection:
        row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return _user_dict(row)
