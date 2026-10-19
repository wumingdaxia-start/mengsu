"""打印健康状态与当日视图，用于快速自检。"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from fastapi.testclient import TestClient

from app.main import app
from app.service import today_iso


def main() -> None:
    client = TestClient(app)
    print(json.dumps(client.get("/api/health").json(), ensure_ascii=True))
    day = client.get(f"/api/day/{today_iso()}").json()
    print(json.dumps({key: len(value) for key, value in day.items() if isinstance(value, list)}, ensure_ascii=True))
    root = client.get("/")
    print(
        json.dumps(
            {
                "root_status": root.status_code,
                "has_app_mount": "id=\"app\"" in root.text,
                "companion": client.get("/api/companion/now").json().get("connected"),
            },
            ensure_ascii=True,
        )
    )


if __name__ == "__main__":
    main()
