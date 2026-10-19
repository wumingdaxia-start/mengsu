"""清空本地数据库，用于丢弃测试数据。下次启动会自动重建表结构。"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.config import DB_PATH, ensure_dirs  # noqa: E402


def main() -> None:
    ensure_dirs()
    if DB_PATH.exists():
        DB_PATH.unlink()
        print(f"removed: {DB_PATH}")
    else:
        print("nothing to remove")


if __name__ == "__main__":
    main()
