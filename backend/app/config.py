from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
PRIVATE_ENV = BASE_DIR / "private" / ".env"
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "mengsu.db"
AUDIO_DIR = DATA_DIR / "audio"
XINCHAO_TOKEN_FILE = BASE_DIR / "private" / "xinchao-token.txt"
MEMORY_TOKEN_FILE = BASE_DIR / "private" / "memory-token.txt"
MEMORY_DIR = DATA_DIR / "memory"
EXPORT_DIR = DATA_DIR / "exports"
ATTACHMENT_DIR = DATA_DIR / "attachments"


def _read_env_file() -> None:
    if not PRIVATE_ENV.exists():
        return
    for raw in PRIVATE_ENV.read_text(encoding="utf-8-sig").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


@dataclass(frozen=True)
class Settings:
    api_key: str
    base_url: str
    chat_model: str
    tts_model: str
    timezone: str
    xinchao_base_url: str
    xinchao_token: str
    memory_base_url: str
    memory_token: str

    @property
    def llm_ready(self) -> bool:
        return bool(self.api_key)

    @property
    def xinchao_ready(self) -> bool:
        return bool(self.xinchao_token)

    @property
    def memory_ready(self) -> bool:
        return bool(self.memory_token)


def load_settings() -> Settings:
    _read_env_file()
    return Settings(
        api_key=(os.environ.get("QWEN_API_KEY", "") or os.environ.get("DASHSCOPE_API_KEY", "")).strip(),
        base_url=(os.environ.get("QWEN_BASE_URL", "").strip() or "https://dashscope.aliyuncs.com/compatible-mode/v1").rstrip("/"),
        chat_model=os.environ.get("QWEN_MODEL", "").strip() or "qwen-plus",
        tts_model=os.environ.get("QWEN_TTS_MODEL", "").strip() or "qwen3-tts-flash",
        timezone=os.environ.get("APP_TIMEZONE", "Asia/Shanghai").strip(),
        xinchao_base_url=os.environ.get("XINCHAO_BASE_URL", "http://127.0.0.1:18110").rstrip("/"),
        xinchao_token=os.environ.get("XINCHAO_SERVICE_TOKEN", "").strip() or _read_xinchao_token(),
        memory_base_url=os.environ.get("MEMORY_BASE_URL", "http://127.0.0.1:18001").rstrip("/"),
        memory_token=os.environ.get("OMBRE_MCP_SERVICE_TOKEN", "").strip() or _read_memory_token(),
    )


def _read_xinchao_token() -> str:
    if XINCHAO_TOKEN_FILE.exists():
        return XINCHAO_TOKEN_FILE.read_text(encoding="utf-8").strip()
    return ""


def _read_memory_token() -> str:
    if MEMORY_TOKEN_FILE.exists():
        return MEMORY_TOKEN_FILE.read_text(encoding="utf-8").strip()
    return ""


def ensure_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    ATTACHMENT_DIR.mkdir(parents=True, exist_ok=True)
