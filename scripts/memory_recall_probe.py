"""探测记忆召回在不同查询下的表现。"""

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
    client = MemoryClient(settings)
    for query in ("两点", "睡眠", "用户记录"):
        try:
            text = await client.recall(query, max_results=3)
        except Exception as exc:
            text = f"ERROR {exc}"
        print(json.dumps({"query": query, "result": text[:400]}, ensure_ascii=True))


if __name__ == "__main__":
    asyncio.run(main())
