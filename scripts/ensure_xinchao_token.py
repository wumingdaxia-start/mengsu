"""为心潮生成并保存服务令牌，已存在则不覆盖。"""

from __future__ import annotations

import secrets
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.config import XINCHAO_TOKEN_FILE  # noqa: E402


def main() -> None:
    XINCHAO_TOKEN_FILE.parent.mkdir(parents=True, exist_ok=True)
    if XINCHAO_TOKEN_FILE.exists() and XINCHAO_TOKEN_FILE.read_text(encoding="utf-8").strip():
        print("token exists")
        return
    XINCHAO_TOKEN_FILE.write_text(secrets.token_hex(32), encoding="utf-8")
    print("token created")


if __name__ == "__main__":
    main()
