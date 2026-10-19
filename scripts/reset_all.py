"""清空本地数据：记录库、长期记忆、线索音频。启动时会自动重建。"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.config import AUDIO_DIR, DB_PATH, MEMORY_DIR  # noqa: E402


def _remove_dir(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)
        print(f"removed {path}")


def _remove_file(path: Path) -> None:
    if path.exists():
        path.unlink()
        print(f"removed {path}")


def main() -> None:
    _remove_file(DB_PATH)
    _remove_dir(MEMORY_DIR)
    _remove_dir(AUDIO_DIR)


if __name__ == "__main__":
    main()
