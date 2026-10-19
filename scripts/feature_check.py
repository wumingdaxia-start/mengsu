"""用演示数据验证梦境OS 全部功能对应的接口。"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from fastapi.testclient import TestClient

from app.main import app

DEMO = [
    {
        "text": "在一栋老楼里找出口，走廊一直延伸，找不到门",
        "day": "2026-10-09",
        "emotion": "焦虑",
        "clarity_score": 7,
        "tags": ["追逐", "城市"],
        "people": ["母亲"],
        "place": "老楼",
    },
    {
        "text": "沿着一条溪流走，水声很响，最后走到一间亮灯的小屋",
        "day": "2026-10-10",
        "emotion": "平静",
        "clarity_score": 9,
        "tags": ["森林", "家"],
        "people": [],
        "place": "溪边",
    },
    {
        "text": "在考场里找不到座位，卷子上的字全都不认识",
        "day": "2026-10-11",
        "emotion": "恐惧",
        "clarity_score": 5,
        "tags": ["考试", "学校"],
        "people": ["同学"],
        "place": "学校",
    },
    {
        "text": "和父亲在海边散步，他一直在说以前的事",
        "day": "2026-10-12",
        "emotion": "希望",
        "clarity_score": 8,
        "tags": ["海边", "家人"],
        "people": ["父亲"],
        "place": "海边",
    },
    {
        "text": "梦里能飞，从城市上空掠过，风很大",
        "day": "2026-10-13",
        "emotion": "快乐",
        "clarity_score": 6,
        "tags": ["飞行", "城市"],
        "people": ["父亲"],
        "place": "城市",
    },
    {
        "text": "又梦到父亲的梦，在老屋里一起修一扇门",
        "day": "2026-10-14",
        "emotion": "平静",
        "clarity_score": 8,
        "tags": ["家", "家人"],
        "people": ["父亲"],
        "place": "老屋",
    },
]


def show(title: str, payload: object) -> None:
    print(f"== {title} ==")
    print(json.dumps(payload, ensure_ascii=True)[:700])


def main() -> None:
    client = TestClient(app)
    for index, item in enumerate(DEMO):
        body = dict(item)
        body["kind"] = "dream"
        result = client.post("/api/fragments", json=body).json()
        print(json.dumps({"created": index, "id": result.get("id")}, ensure_ascii=True))

    show("home", {key: value for key, value in client.get("/api/home").json().items() if key != "palette"})
    show("stats", client.get("/api/dreams/stats").json())
    show("dna", client.get("/api/dreams/dna").json())
    show("search 父亲", [row["text"] for row in client.get("/api/dreams/search", params={"query": "父亲"}).json()])
    network = client.get("/api/dreams/network").json()
    show("network", {"nodes": len(network["nodes"]), "links": len(network["links"]), "people": network["people"][:4]})
    insight_data = client.get("/api/dreams/insight").json()
    show("insight", {"emotions": insight_data["emotions"], "tags": insight_data["tags"][:5], "avg_mood": insight_data["avg_mood"]})
    palette = client.get("/api/dreams/palette").json()
    show("palette rows", len(palette))
    show("day title", client.get("/api/dreams/day-title", params={"day": "2026-10-15"}).json())
    ask = client.post("/api/dreams/ask", json={"question": "我们聊过多少次关于父亲的梦？"}).json()
    show("ask", {"answer": ask.get("answer"), "evidence": [row["fragment_date"] for row in ask.get("evidence", [])]})
    export = client.post("/api/dreams/export", json={"start": "2026-10-01", "end": "2026-10-15"}).json()
    show("export", {"file": export.get("file"), "count": export.get("count"), "chars": len(export.get("body", ""))})


if __name__ == "__main__":
    main()
