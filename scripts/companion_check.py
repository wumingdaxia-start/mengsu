"""验证心潮连接：健康状态、此刻状态、对话事件上报。"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from fastapi.testclient import TestClient

from app.main import app


def main() -> None:
    client = TestClient(app)
    print(json.dumps(client.get("/api/health").json(), ensure_ascii=True))
    print(json.dumps(client.get("/api/companion/now").json(), ensure_ascii=True))
    result = client.post("/api/input", json={"text": "今天有点累，下午睡了一会儿"}).json()
    print(json.dumps({"reply": result.get("reply"), "items": result.get("items")}, ensure_ascii=True))


if __name__ == "__main__":
    main()
