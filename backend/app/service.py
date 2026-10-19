from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from . import db
from .audio import build_cue_audio, duration_seconds
from .config import Settings, load_settings
from .extraction import extract_items
from .llm import LLMError
from .memory import MemoryClient
from .xinchao import XinchaoClient

LABELS = {
    "day_note": "白天记忆",
    "sleep": "睡眠记录",
    "dream_fragment": "梦境碎片",
    "awakening": "夜醒碎片",
}


def today_iso() -> str:
    return datetime.now().astimezone().date().isoformat()


def store_message(role: str, content: str, status: str = "stored", error: str | None = None) -> int:
    return db.insert(
        "messages",
        {
            "role": role,
            "content": content,
            "created_at": db.now_iso(),
            "timezone": load_settings().timezone,
            "parsed_status": status,
            "error": error,
        },
    )


async def notify_companion(settings: Settings, text: str) -> bool:
    if not settings.xinchao_ready:
        return False
    return await XinchaoClient(settings).send_conversation(text)


async def remember_entry(settings: Settings, text: str, saved: list[dict[str, Any]]) -> bool:
    """把值得长期保留的一条记录交给记忆服务。失败不影响记录本身。"""
    if not settings.memory_ready or not saved:
        return False
    tags = ",".join(sorted({entry["type"] for entry in saved}))
    content = f"{saved[0]['date']} 用户记录：{text}"
    try:
        await MemoryClient(settings).remember(content, tags=tags)
    except Exception:
        return False
    return True


def _clean(value: Any) -> Any:
    if isinstance(value, str):
        cleaned = value.strip()
        return cleaned or None
    return value


def persist_items(items: list[dict[str, Any]], message_id: int, created_at: str) -> list[dict[str, Any]]:
    saved: list[dict[str, Any]] = []
    for item in items:
        kind = str(item.get("type") or "unknown").strip()
        payload = item.get("payload") or {}
        day = _clean(item.get("date")) or today_iso()

        if kind == "day_note":
            text = _clean(payload.get("text"))
            if not text:
                continue
            db.insert(
                "day_notes",
                {
                    "note_date": day,
                    "text": text,
                    "load_valence": _clean(payload.get("load_valence")),
                    "load_intensity": _clean(payload.get("load_intensity")),
                    "handled": 0,
                    "message_id": message_id,
                    "created_at": created_at,
                },
            )
        elif kind == "sleep":
            provided = [
                _clean(payload.get(key))
                for key in ("bed_at", "sleep_at", "wake_at", "rise_at", "feeling", "night_wakes")
            ]
            if not any(provided):
                continue
            db.insert(
                "sleep_records",
                {
                    "sleep_date": day,
                    "bed_at": _clean(payload.get("bed_at")),
                    "sleep_at": _clean(payload.get("sleep_at")),
                    "wake_at": _clean(payload.get("wake_at")),
                    "rise_at": _clean(payload.get("rise_at")),
                    "night_wakes": payload.get("night_wakes"),
                    "feeling": _clean(payload.get("feeling")),
                    "precision": _clean(payload.get("precision")) or "unspecified",
                    "source": "chat",
                    "message_id": message_id,
                    "created_at": created_at,
                    "updated_at": created_at,
                },
            )
        elif kind in {"dream_fragment", "awakening"}:
            text = _clean(payload.get("text"))
            if not text:
                continue
            db.insert(
                "fragments",
                {
                    "fragment_date": day,
                    "happened_at": _clean(payload.get("happened_at")),
                    "kind": "dream" if kind == "dream_fragment" else "awakening",
                    "text": text,
                    "emotion": _clean(payload.get("emotion")),
                    "clarity": _clean(payload.get("clarity")),
                    "tags": db.dumps(payload.get("tags") or []),
                    "people": db.dumps(payload.get("people") or []),
                    "place": _clean(payload.get("place")),
                    "message_id": message_id,
                    "created_at": created_at,
                },
            )
        else:
            continue
        saved.append({"type": kind, "date": day})
    return saved


def summarize(saved: list[dict[str, Any]]) -> str:
    if not saved:
        return "这句话里没有需要归档的内容，先留在对话里。"
    counts: dict[str, int] = {}
    for entry in saved:
        counts[entry["type"]] = counts.get(entry["type"], 0) + 1
    parts = [f"{LABELS.get(kind, kind)} {count} 条" for kind, count in counts.items()]
    return "已归档：" + "、".join(parts) + "。"


async def handle_input(text: str) -> dict[str, Any]:
    settings = load_settings()
    created_at = db.now_iso()
    message_id = store_message("user", text)
    await notify_companion(settings, text)

    if not settings.llm_ready:
        reply = "原文已保存。配置千问 QWEN_API_KEY 后可以自动整理成结构化记录。"
        store_message("assistant", reply)
        return {"message_id": message_id, "items": [], "reply": reply, "extracted": False}

    try:
        data = await extract_items(settings, text, created_at, settings.timezone)
        saved = persist_items(data.get("items") or [], message_id, created_at)
        remembered = await remember_entry(settings, text, saved)
        reply = summarize(saved)
        store_message("assistant", reply)
        return {
            "message_id": message_id,
            "items": saved,
            "reply": reply,
            "extracted": True,
            "remembered": remembered,
        }
    except LLMError as exc:
        reply = "原文已保存，这次整理没有成功，稍后可以重新整理。"
        store_message("assistant", reply, status="error", error=str(exc))
        return {
            "message_id": message_id,
            "items": [],
            "reply": reply,
            "extracted": False,
            "error": str(exc),
        }


def day_view(day: str) -> dict[str, Any]:
    return {
        "date": day,
        "notes": db.query("SELECT * FROM day_notes WHERE note_date = ? ORDER BY id", (day,)),
        "sleep": db.query("SELECT * FROM sleep_records WHERE sleep_date = ? ORDER BY id", (day,)),
        "fragments": db.query("SELECT * FROM fragments WHERE fragment_date = ? ORDER BY id", (day,)),
        "cues": db.query("SELECT * FROM cue_sessions WHERE session_date = ? ORDER BY id", (day,)),
        "cue_reviews": db.query("SELECT * FROM cue_reviews WHERE review_date = ? ORDER BY id", (day,)),
    }


def pending_notes() -> list[dict[str, Any]]:
    return db.query(
        "SELECT * FROM day_notes WHERE handled = 0 AND load_intensity IN ('medium','heavy') "
        "ORDER BY note_date DESC, id DESC LIMIT 20"
    )


def create_cue_session(day: str, items: list[str]) -> dict[str, Any]:
    session_id = db.insert(
        "cue_sessions",
        {"session_date": day, "items": db.dumps(items), "created_at": db.now_iso()},
    )
    return {"id": session_id, "date": day, "items": items}


def mark_cue_played(session_id: int) -> None:
    with db.connect() as conn:
        conn.execute("UPDATE cue_sessions SET played_at = ? WHERE id = ?", (db.now_iso(), session_id))


def build_audio_for(session_id: int) -> dict[str, Any] | None:
    row = db.query_one("SELECT * FROM cue_sessions WHERE id = ?", (session_id,))
    if row is None:
        return None
    items = json.loads(row["items"]) if row.get("items") else []
    path = build_cue_audio(session_id, items)
    with db.connect() as conn:
        conn.execute("UPDATE cue_sessions SET audio_path = ? WHERE id = ?", (path.name, session_id))
    return {
        "file": path.name,
        "url": f"/audio/{path.name}",
        "seconds": round(duration_seconds(path), 1),
        "items": items,
    }


def review_cue(session_id: int, day: str, appeared: str, note: str | None) -> dict[str, Any]:
    review_id = db.insert(
        "cue_reviews",
        {
            "session_id": session_id,
            "review_date": day,
            "appeared": appeared,
            "note": note,
            "created_at": db.now_iso(),
        },
    )
    return {"id": review_id, "session_id": session_id, "date": day, "appeared": appeared}


def timeline(start: str, end: str) -> list[dict[str, Any]]:
    return db.query(
        """
        SELECT fragment_date AS day, COUNT(*) AS fragments, NULL AS sleep_hours FROM fragments
        WHERE fragment_date BETWEEN ? AND ?
        GROUP BY fragment_date
        UNION ALL
        SELECT sleep_date AS day, NULL AS fragments,
               CASE WHEN wake_at IS NOT NULL AND sleep_at IS NOT NULL
                    THEN ROUND((julianday(wake_at) - julianday(sleep_at)) * 24.0, 2) END AS sleep_hours
        FROM sleep_records
        WHERE sleep_date BETWEEN ? AND ?
        ORDER BY day
        """,
        (start, end, start, end),
    )
