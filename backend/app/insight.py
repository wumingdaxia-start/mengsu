from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from typing import Any

from . import db
from .config import EXPORT_DIR, load_settings
from .llm import LLMError, chat

MOOD = {
    "快乐": 0.9,
    "兴奋": 0.8,
    "好奇": 0.72,
    "希望": 0.76,
    "平静": 0.62,
    "麻木": 0.38,
    "孤独": 0.32,
    "焦虑": 0.3,
    "愤怒": 0.26,
    "悲伤": 0.2,
    "恐惧": 0.18,
    "慌": 0.25,
}

ARCHETYPES = {
    "漫游者": ["城市", "森林", "海边", "飞行", "路上", "旅行", "陌生"],
    "守夜人": ["家人", "朋友", "平静", "希望", "陪", "守"],
    "造物者": ["工作", "考试", "学校", "写", "做", "建"],
    "解谜者": ["追逐", "找", "出口", "门", "迷路", "钥匙"],
    "归乡者": ["家", "老屋", "童年", "故乡", "回"],
    "破壁者": ["愤怒", "焦虑", "争执", "吵架", "压力"],
}


def _rows(start: str | None = None, end: str | None = None) -> list[dict[str, Any]]:
    if start and end:
        return db.query(
            "SELECT * FROM fragments WHERE fragment_date BETWEEN ? AND ? ORDER BY fragment_date, id",
            (start, end),
        )
    return db.query("SELECT * FROM fragments ORDER BY fragment_date, id")


def _loads(value: Any) -> list[str]:
    if not value:
        return []
    try:
        data = json.loads(value)
    except (TypeError, ValueError):
        return []
    return [str(item) for item in data] if isinstance(data, list) else []


def mood_score(emotion: str | None) -> float:
    if not emotion:
        return 0.5
    return MOOD.get(emotion.strip(), 0.5)


def stats() -> dict[str, Any]:
    rows = _rows()
    today = datetime.now().astimezone().date()
    month_prefix = today.strftime("%Y-%m")
    days = {row["fragment_date"] for row in rows}
    streak = 0
    cursor = today
    while cursor.isoformat() in days:
        streak += 1
        cursor -= timedelta(days=1)
    words = [len(re.sub(r"\s+", "", row["text"] or "")) for row in rows]
    return {
        "total": len(rows),
        "this_month": sum(1 for row in rows if str(row["fragment_date"]).startswith(month_prefix)),
        "days_recorded": len(days),
        "streak": streak,
        "avg_words": round(sum(words) / len(words)) if words else 0,
        "avg_mood": round(sum(mood_score(row["emotion"]) for row in rows) / len(rows), 1) if rows else None,
    }


def search(query: str, limit: int = 30) -> list[dict[str, Any]]:
    keyword = query.strip()
    if not keyword:
        return []
    pattern = f"%{keyword}%"
    return db.query(
        """
        SELECT * FROM fragments
        WHERE text LIKE ? OR people LIKE ? OR place LIKE ? OR tags LIKE ? OR emotion LIKE ?
        ORDER BY fragment_date DESC, id DESC LIMIT ?
        """,
        (pattern, pattern, pattern, pattern, pattern, limit),
    )


def insight(start: str | None = None, end: str | None = None) -> dict[str, Any]:
    rows = _rows(start, end)
    emotion_counter: Counter[str] = Counter()
    tag_counter: Counter[str] = Counter()
    people_counter: Counter[str] = Counter()
    place_counter: Counter[str] = Counter()
    timeline: dict[str, list[float]] = defaultdict(list)

    for row in rows:
        emotion_counter[row["emotion"] or "未标注"] += 1
        for tag in _loads(row["tags"]):
            tag_counter[tag] += 1
        for person in _loads(row["people"]):
            people_counter[person] += 1
        if row["place"]:
            place_counter[str(row["place"])] += 1
        timeline[str(row["fragment_date"])].append(mood_score(row["emotion"]))

    trend = [
        {"date": day, "mood": round(sum(values) / len(values), 2), "count": len(values)}
        for day, values in sorted(timeline.items())
    ]
    return {
        "total": len(rows),
        "emotions": emotion_counter.most_common(),
        "tags": tag_counter.most_common(12),
        "people": people_counter.most_common(12),
        "places": place_counter.most_common(12),
        "trend": trend,
        "avg_mood": round(sum(mood_score(row["emotion"]) for row in rows) / len(rows), 2) if rows else None,
        "recent": rows[-8:],
    }


def dna(start: str | None = None, end: str | None = None) -> dict[str, Any]:
    rows = _rows(start, end)
    if not rows:
        return {"sample": 0, "shares": []}
    scores: dict[str, int] = {name: 0 for name in ARCHETYPES}
    for row in rows:
        haystack = " ".join(
            [row["text"] or "", row["place"] or "", row["emotion"] or "", " ".join(_loads(row["tags"]))]
        )
        for name, keywords in ARCHETYPES.items():
            if any(keyword in haystack for keyword in keywords):
                scores[name] += 1
    total = sum(scores.values())
    if total == 0:
        even = round(100 / len(ARCHETYPES))
        shares = [{"name": name, "share": even, "hits": 0} for name in ARCHETYPES]
    else:
        shares = [
            {"name": name, "share": round(hits / total * 100), "hits": hits}
            for name, hits in sorted(scores.items(), key=lambda item: -item[1])
        ]
    return {"sample": len(rows), "shares": shares}


def network(limit: int = 40) -> dict[str, Any]:
    rows = _rows()[-60:]
    nodes = [
        {
            "id": row["id"],
            "label": (row["text"] or "")[:14],
            "date": row["fragment_date"],
            "emotion": row["emotion"],
        }
        for row in rows
    ]
    links: list[dict[str, Any]] = []
    for index, left in enumerate(rows):
        left_keys = set(_loads(left["tags"])) | set(_loads(left["people"]))
        if left["place"]:
            left_keys.add(str(left["place"]))
        for right in rows[index + 1 :]:
            right_keys = set(_loads(right["tags"])) | set(_loads(right["people"]))
            if right["place"]:
                right_keys.add(str(right["place"]))
            shared = left_keys & right_keys
            if shared:
                links.append(
                    {
                        "source": left["id"],
                        "target": right["id"],
                        "weight": len(shared),
                        "via": sorted(shared)[:3],
                    }
                )
    links.sort(key=lambda item: -item["weight"])
    people_links: Counter[tuple[str, str]] = Counter()
    for row in rows:
        people = _loads(row["people"])
        for index, left in enumerate(people):
            for right in people[index + 1 :]:
                people_links[tuple(sorted((left, right)))] += 1
    return {
        "nodes": nodes,
        "links": links[:limit],
        "people_pairs": [
            {"pair": list(pair), "count": count} for pair, count in people_links.most_common(15)
        ],
        "people": Counter(person for row in rows for person in _loads(row["people"])).most_common(15),
        "places": Counter(str(row["place"]) for row in rows if row["place"]).most_common(15),
    }


def day_title(day: str) -> str:
    pool = [
        "南柯小记",
        "枕上拾光",
        "夜行散记",
        "半醒录",
        "潮汐笔记",
        "浮生残页",
        "灯下集",
    ]
    try:
        parsed = date.fromisoformat(day)
    except ValueError:
        return pool[0]
    return pool[parsed.toordinal() % len(pool)]


def list_fragments(
    *,
    start: str | None = None,
    end: str | None = None,
    emotion: str | None = None,
    tag: str | None = None,
    person: str | None = None,
    place: str | None = None,
    kind: str | None = None,
    query: str | None = None,
    limit: int = 200,
) -> list[dict[str, Any]]:
    sql = "SELECT * FROM fragments WHERE draft = 0"
    params: list[Any] = []
    if start and end:
        sql += " AND fragment_date BETWEEN ? AND ?"
        params.extend([start, end])
    if emotion:
        sql += " AND emotion = ?"
        params.append(emotion)
    if tag:
        sql += " AND tags LIKE ?"
        params.append(f"%{tag}%")
    if person:
        sql += " AND people LIKE ?"
        params.append(f"%{person}%")
    if place:
        sql += " AND place LIKE ?"
        params.append(f"%{place}%")
    if kind:
        sql += " AND kind = ?"
        params.append(kind)
    if query:
        sql += " AND (text LIKE ? OR tags LIKE ? OR people LIKE ? OR place LIKE ?)"
        params.extend([f"%{query}%"] * 4)
    sql += " ORDER BY fragment_date DESC, id DESC LIMIT ?"
    params.append(limit)
    return db.query(sql, tuple(params))


def get_fragment(fragment_id: int) -> dict[str, Any] | None:
    return db.query_one("SELECT * FROM fragments WHERE id = ?", (fragment_id,))


def delete_fragment(fragment_id: int) -> bool:
    with db.connect() as conn:
        cursor = conn.execute("DELETE FROM fragments WHERE id = ?", (fragment_id,))
        return cursor.rowcount > 0


def mood_palette(limit: int = 60) -> list[dict[str, Any]]:
    """按记录顺序累积的情绪色带。"""
    rows = db.query(
        "SELECT fragment_date, emotion FROM fragments WHERE draft = 0 "
        "ORDER BY fragment_date, id LIMIT ?",
        (limit,),
    )
    return [{"date": row["fragment_date"], "emotion": row["emotion"], "score": mood_score(row["emotion"])} for row in rows]


def home() -> dict[str, Any]:
    today = datetime.now().astimezone().date().isoformat()
    fragments = list_fragments(limit=200)
    today_rows = [row for row in fragments if row["fragment_date"] == today]
    places = Counter(str(row["place"]) for row in fragments if row["place"])
    people = Counter(person for row in fragments for person in _loads(row["people"]))
    recent_places = [
        {"place": str(row["place"]), "date": row["fragment_date"]}
        for row in fragments
        if row["place"]
    ][:6]
    summary = insight()
    return {
        "day_title": day_title(today),
        "today": today,
        "today_rows": today_rows,
        "recent": fragments[:10],
        "stats": stats(),
        "emotions": summary["emotions"],
        "palette": mood_palette(),
        "trend": summary["trend"][-14:],
        "network": network(limit=12),
        "places": {
            "total": len(places),
            "top": places.most_common(8),
            "recent": recent_places,
        },
        "people": {"total": len(people), "top": people.most_common(8)},
    }


def dream_map() -> dict[str, Any]:
    """梦境地图：地点做点位，同一条梦里出现过的地点连成线。"""
    rows = [
        row
        for row in db.query("SELECT * FROM fragments WHERE draft = 0 ORDER BY fragment_date, id")
        if row["place"]
    ]
    grouped: dict[str, dict[str, Any]] = {}
    for row in rows:
        place = str(row["place"]).strip()
        if not place:
            continue
        entry = grouped.setdefault(
            place,
            {"name": place, "count": 0, "emotions": Counter(), "last_date": row["fragment_date"], "ids": []},
        )
        entry["count"] += 1
        entry["ids"].append(row["id"])
        if row["emotion"]:
            entry["emotions"][row["emotion"]] += 1
        if row["fragment_date"] > entry["last_date"]:
            entry["last_date"] = row["fragment_date"]

    places = [
        {
            "name": entry["name"],
            "count": entry["count"],
            "emotion": entry["emotions"].most_common(1)[0][0] if entry["emotions"] else None,
            "last_date": entry["last_date"],
            "ids": entry["ids"],
        }
        for entry in grouped.values()
    ]
    places.sort(key=lambda item: (-item["count"], item["name"]))

    edges: Counter[tuple[str, str]] = Counter()
    for row in rows:
        same_day = [item for item in rows if item["fragment_date"] == row["fragment_date"]]
        names = {str(item["place"]).strip() for item in same_day if item["place"]}
        for left in names:
            for right in names:
                if left < right:
                    edges[(left, right)] += 1
    return {
        "places": places,
        "edges": [
            {"source": pair[0], "target": pair[1], "weight": weight}
            for pair, weight in edges.most_common(40)
        ],
        "total_places": len(places),
        "total_dreams_with_place": len(rows),
    }


async def ask(question: str, limit: int = 8) -> dict[str, Any]:
    rows = _rows()
    keywords = _keywords(question, rows)
    scored: list[tuple[int, dict[str, Any]]] = []
    for row in rows:
        haystack = " ".join(
            [
                row["text"] or "",
                row["place"] or "",
                row["emotion"] or "",
                " ".join(_loads(row["tags"])),
                " ".join(_loads(row["people"])),
            ]
        )
        score = sum(haystack.count(keyword) * weight for keyword, weight in keywords)
        if score:
            scored.append((score, row))
    scored.sort(key=lambda item: (-item[0], item[1]["fragment_date"]))
    evidence = [row for _, row in scored[:limit]]

    if not evidence:
        return {
            "answer": "记录里还没有能和这个问题对上的内容。等记下几条之后再来问，我再帮你翻。",
            "evidence": [],
        }

    context = "\n".join(
        f"[{row['fragment_date']}] {row['text']}（情绪：{row['emotion'] or '未标注'}，"
        f"人物：{'、'.join(_loads(row['people'])) or '无'}，地点：{row['place'] or '无'}）"
        for row in evidence
    )
    settings = load_settings()
    if not settings.llm_ready:
        return {
            "answer": "模型还没配置，先把相关记录列出来。",
            "evidence": evidence,
        }
    try:
        answer = await chat(
            settings,
            [
                {
                    "role": "system",
                    "content": (
                        "你在帮用户回顾自己的梦境与睡眠记录。只依据给出的记录回答，"
                        "不编造没有出现的日期、人物或情节。引用时写明日期。"
                        "不做诊断，不给用药建议。回答控制在 200 字以内。"
                    ),
                },
                {"role": "user", "content": f"问题：{question}\n\n记录：\n{context}"},
            ],
            temperature=0.3,
            max_tokens=700,
        )
    except LLMError as exc:
        answer = f"模型调用失败：{exc}"
    return {"answer": answer, "evidence": evidence}


def _keywords(question: str, rows: list[dict[str, Any]]) -> list[tuple[str, int]]:
    """中文问句没有空格，先拿语料里出现过的人物/地点/标签/情绪去问句里找，
    找不到再退化成二字切片。实体命中的权重更高。"""
    entities: set[str] = set()
    for row in rows:
        entities.update(_loads(row["people"]))
        entities.update(_loads(row["tags"]))
        if row["place"]:
            entities.add(str(row["place"]))
        if row["emotion"]:
            entities.add(str(row["emotion"]))
    hits = [(entity, 3) for entity in entities if entity and entity in question]
    if hits:
        return hits
    chunks = [word for word in re.split(r"[\s，。、？,?.！!]+", question) if len(word) >= 2]
    grams: list[tuple[str, int]] = [(chunk, 1) for chunk in chunks]
    for chunk in chunks:
        grams.extend((chunk[index : index + 2], 1) for index in range(len(chunk) - 1))
    seen: dict[str, int] = {}
    for keyword, weight in grams:
        seen.setdefault(keyword, weight)
    return list(seen.items())[:16]


def export_markdown(start: str, end: str) -> dict[str, Any]:
    rows = _rows(start, end)
    summary = insight(start, end)
    lines = [
        f"# 花屿星记录导出 {start} 至 {end}",
        "",
        f"- 记录条数：{len(rows)}",
        f"- 平均情绪分：{summary['avg_mood'] if summary['avg_mood'] is not None else '样本不足'}",
        "",
        "## 逐条记录",
        "",
    ]
    for row in rows:
        lines.append(f"### {row['fragment_date']} · {row['kind']}")
        lines.append("")
        lines.append(row["text"] or "")
        meta = []
        if row["emotion"]:
            meta.append(f"情绪：{row['emotion']}")
        if row["clarity_score"] is not None:
            meta.append(f"清晰度：{row['clarity_score']}/10")
        if row["place"]:
            meta.append(f"地点：{row['place']}")
        people = _loads(row["people"])
        if people:
            meta.append("人物：" + "、".join(people))
        tags = _loads(row["tags"])
        if tags:
            meta.append("标签：" + "、".join(tags))
        if meta:
            lines.append("")
            lines.append("；".join(meta))
        lines.append("")
    body = "\n".join(lines)
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    target = EXPORT_DIR / f"dreams_{start}_{end}.md"
    target.write_text(body, encoding="utf-8")
    return {"file": target.name, "path": str(target), "body": body, "count": len(rows)}
