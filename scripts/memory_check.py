"""验证记忆服务：列出 MCP 工具、写入一条记忆、再召回。"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.config import load_settings  # noqa: E402
from app.memory import MemoryClient  # noqa: E402


async def main() -> None:
    settings = load_settings()
    print(
        json.dumps(
            {"memory_ready": settings.memory_ready, "url": settings.memory_base_url},
            ensure_ascii=True,
        )
    )
    client = MemoryClient(settings)
    try:
        tools = await client.list_tools()
        print(json.dumps({"tools": tools}, ensure_ascii=True))
        written = await client.remember(
            "2026-10-15 用户记录：昨晚两点才睡，六点半醒，中间醒过一次",
            tags="sleep",
            importance=6,
        )
        print(json.dumps({"hold": written[:300]}, ensure_ascii=True))
        recalled = await client.recall("最近的睡眠", max_results=3)
        print(json.dumps({"breath": recalled[:600]}, ensure_ascii=True))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=True))


if __name__ == "__main__":
    asyncio.run(main())
