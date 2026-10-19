"""用真实语句验证抽取、日期归属与入库结果。"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from fastapi.testclient import TestClient

from app.main import app
from app.service import today_iso

MESSAGES = [
    "昨晚两点才睡，六点半醒的，中间醒了一次",
    "今天下午跟导师讨论论文，被说了一顿，有点闷",
    "刚才梦到在一栋老楼里找出口，一直找不到，有点慌",
]


def main() -> None:
    client = TestClient(app)
    print(json.dumps(client.get("/api/health").json(), ensure_ascii=True))

    for text in MESSAGES:
        result = client.post("/api/input", json={"text": text}).json()
        print(json.dumps({"input": text, "reply": result.get("reply"), "items": result.get("items")}, ensure_ascii=True))

    day = client.get(f"/api/day/{today_iso()}").json()
    print(json.dumps(day, ensure_ascii=True))
    print(json.dumps({"pending": client.get("/api/pending").json()}, ensure_ascii=True))


if __name__ == "__main__":
    main()
