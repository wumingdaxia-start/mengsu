from __future__ import annotations

from typing import Any

from . import db
from .config import load_settings
from .llm import LLMError, chat

SYSTEM_PROMPT = """你在为一个睡眠与记忆记录工具写叙事报告。

要求：
1. 不输出任何分数，不出现 0-100、评级、优良中差这类判断。
2. 只描述数据里出现过的内容，样本不足时直接说明，不要补全。
3. 用「同时变化」「出现在同一段时期」描述关联，不用「导致」「造成」。
4. 用第二人称、平静的语气，篇幅不超过 350 字。
5. 不做诊断，不给用药建议。
"""


def collect(start: str, end: str) -> dict[str, Any]:
    return {
        "notes": db.query(
            "SELECT note_date, text, load_valence, load_intensity FROM day_notes "
            "WHERE note_date BETWEEN ? AND ? ORDER BY note_date",
            (start, end),
        ),
        "sleep": db.query(
            "SELECT sleep_date, bed_at, sleep_at, wake_at, rise_at, night_wakes, feeling, precision "
            "FROM sleep_records WHERE sleep_date BETWEEN ? AND ? ORDER BY sleep_date",
            (start, end),
        ),
        "fragments": db.query(
            "SELECT fragment_date, kind, emotion, clarity, tags, people, place FROM fragments "
            "WHERE fragment_date BETWEEN ? AND ? ORDER BY fragment_date",
            (start, end),
        ),
        "cues": db.query(
            "SELECT session_date, items, played_at FROM cue_sessions "
            "WHERE session_date BETWEEN ? AND ?",
            (start, end),
        ),
        "cue_reviews": db.query(
            "SELECT review_date, appeared, note FROM cue_reviews WHERE review_date BETWEEN ? AND ?",
            (start, end),
        ),
    }


def fallback_text(start: str, end: str, data: dict[str, Any]) -> str:
    days = len(
        {row["sleep_date"] for row in data["sleep"]}
        | {row["note_date"] for row in data["notes"]}
        | {row["fragment_date"] for row in data["fragments"]}
    )
    return (
        f"{start} 到 {end} 之间，共有 {days} 天留下记录：睡眠 {len(data['sleep'])} 条、"
        f"白天记忆 {len(data['notes'])} 条、梦境与夜醒碎片 {len(data['fragments'])} 条。"
        "样本还不足，暂时看不出稳定的变化规律，等记录多一些再回顾会更有意义。"
    )


async def generate(start: str, end: str, kind: str = "weekly") -> dict[str, Any]:
    settings = load_settings()
    data = collect(start, end)
    body: str
    if settings.llm_ready:
        try:
            body = await chat(
                settings,
                [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": (
                            f"区间：{start} 至 {end}\n数据：{data}\n\n"
                            "写一份叙事报告，说明这段时间睡眠与白天记忆呈现出的情况，并指出数据缺口。"
                        ),
                    },
                ],
                temperature=0.4,
                max_tokens=900,
            )
        except LLMError:
            body = fallback_text(start, end, data)
    else:
        body = fallback_text(start, end, data)

    narrative_id = db.insert(
        "narratives",
        {
            "period_start": start,
            "period_end": end,
            "kind": kind,
            "body": body,
            "evidence": db.dumps(data),
            "model": settings.chat_model if settings.llm_ready else "template",
            "created_at": db.now_iso(),
        },
    )
    return {"id": narrative_id, "start": start, "end": end, "body": body}


def latest() -> dict[str, Any] | None:
    return db.query_one("SELECT * FROM narratives ORDER BY id DESC LIMIT 1")
