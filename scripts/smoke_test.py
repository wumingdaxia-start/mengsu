"""不启动服务器，直接用 TestClient 验证接口与数据库。"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from fastapi.testclient import TestClient

from app.main import app


def show(title: str, payload: object) -> None:
    print(f"== {title} ==")
    print(json.dumps(payload, ensure_ascii=True))


def main() -> None:
    client = TestClient(app)
    show("health", client.get("/api/health").json())

    show(
        "fragment",
        client.post(
            "/api/fragment",
            json={
                "text": "梦到在一条很长的走廊里找门",
                "kind": "dream",
                "emotion": "anxious",
                "clarity": "mixed",
                "tags": ["chase"],
                "people": ["mother"],
                "place": "old house",
            },
        ).json(),
    )

    cue = client.post("/api/cue", json={"items": ["today meeting", "talk with friend"]}).json()
    show("cue", cue)
    show("cue played", client.post("/api/cue/played", json={"session_id": cue["id"]}).json())
    show(
        "cue review",
        client.post(
            "/api/cue/review",
            json={"session_id": cue["id"], "appeared": "unsure", "note": "似乎有一点"},
        ).json(),
    )

    day = client.get("/api/day/2026-10-15").json()
    show("day counts", {key: len(value) for key, value in day.items() if isinstance(value, list)})
    show("timeline", client.get("/api/timeline", params={"start": "2026-10-01", "end": "2026-10-31"}).json())
    show(
        "narrative",
        client.post("/api/narrative", json={"start": "2026-10-01", "end": "2026-10-15"}).json(),
    )


if __name__ == "__main__":
    main()
