"""清空长期记忆库，用于丢弃验证数据。下次启动记忆服务会自动重建。"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.config import MEMORY_DIR  # noqa: E402


def main() -> None:
    if MEMORY_DIR.exists():
        shutil.rmtree(MEMORY_DIR)
        print(f"removed {MEMORY_DIR}")
    else:
        print("nothing to remove")


if __name__ == "__main__":
    main()
