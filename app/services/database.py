"""Shared SQLite connection for application data."""

from contextlib import contextmanager
import os
from pathlib import Path
import sqlite3
from typing import Iterator


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def database_path() -> Path:
    """Return the configured SQLite file path, rooted at the repository by default."""
    configured_path = Path(
        os.getenv("NETRA_AUTH_DATABASE") or "uploads/netra_auth.sqlite3"
    )
    if not configured_path.is_absolute():
        configured_path = PROJECT_ROOT / configured_path
    return configured_path


@contextmanager
def database_connection() -> Iterator[sqlite3.Connection]:
    """Open a transaction-capable connection to the shared application database."""
    path = database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path, timeout=15, isolation_level="IMMEDIATE")
    connection.row_factory = sqlite3.Row
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
