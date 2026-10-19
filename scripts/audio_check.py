"""验证线索音频生成：建一条线索会话并合成音频。"""

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
    cue = client.post(
        "/api/cue",
        json={"items": ["和导师的谈话", "明天要交的稿子"]},
    ).json()
    print(json.dumps(cue, ensure_ascii=True))
    audio = client.post(f"/api/cue/{cue['id']}/audio").json()
    print(json.dumps(audio, ensure_ascii=True))
    path = ROOT / "data" / "audio" / audio["file"]
    print(json.dumps({"exists": path.exists(), "bytes": path.stat().st_size}, ensure_ascii=True))


if __name__ == "__main__":
    main()
