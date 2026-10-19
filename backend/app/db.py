from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from typing import Any, Iterator

from .config import DB_PATH, ensure_dirs

SCHEMA = """
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    timezone TEXT NOT NULL,
    parsed_status TEXT NOT NULL DEFAULT 'pending',
    error TEXT
);

CREATE TABLE IF NOT EXISTS day_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_date TEXT NOT NULL,
    text TEXT NOT NULL,
    load_valence TEXT,
    load_intensity TEXT,
    handled INTEGER NOT NULL DEFAULT 0,
    message_id INTEGER,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sleep_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sleep_date TEXT NOT NULL,
    bed_at TEXT,
    sleep_at TEXT,
    wake_at TEXT,
    rise_at TEXT,
    night_wakes INTEGER,
    feeling TEXT,
    precision TEXT NOT NULL DEFAULT 'unspecified',
    source TEXT NOT NULL DEFAULT 'chat',
    message_id INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fragments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fragment_date TEXT NOT NULL,
    happened_at TEXT,
    kind TEXT NOT NULL DEFAULT 'dream',
    text TEXT NOT NULL,
    emotion TEXT,
    clarity TEXT,
    tags TEXT,
    people TEXT,
    place TEXT,
    message_id INTEGER,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cue_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_date TEXT NOT NULL,
    items TEXT NOT NULL,
    audio_path TEXT,
    played_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cue_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    review_date TEXT NOT NULL,
    appeared TEXT,
    note TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS narratives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'weekly',
    body TEXT NOT NULL,
    evidence TEXT,
    model TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""


def now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    ensure_dirs()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA)
        _add_missing_columns(conn)


def _add_missing_columns(conn: sqlite3.Connection) -> None:
    """给旧库补上新增字段，不破坏已有数据。"""
    additions = {
        "fragments": {
            "clarity_score": "INTEGER",
            "photo_path": "TEXT",
            "draft": "INTEGER NOT NULL DEFAULT 0",
        },
        "sleep_records": {"nap_minutes": "INTEGER"},
    }
    for table, columns in additions.items():
        existing = {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}
        for name, ddl in columns.items():
            if name not in existing:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}")


def insert(table: str, values: dict[str, Any]) -> int:
    columns = ", ".join(values)
    marks = ", ".join("?" for _ in values)
    with connect() as conn:
        cursor = conn.execute(f"INSERT INTO {table} ({columns}) VALUES ({marks})", list(values.values()))
        return int(cursor.lastrowid)


def query(sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(sql, params).fetchall()
    return [dict(row) for row in rows]


def query_one(sql: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
    rows = query(sql, params)
    return rows[0] if rows else None


def dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)
