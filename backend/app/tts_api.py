"""云端音色朗读：千问 qwen3-tts-flash。只做语音合成，不做诊断，也不保留合成之外的副本。

接口说明：非流式调用返回 output.audio.url（24 小时有效的 OSS 地址），
这里立即下载转存到本地 data/audio/，前端通过 /audio/<文件名> 播放。
单次合成上限 600 字符，长文本按句子分块合成后拼接为完整 WAV。
"""
from __future__ import annotations

import re
import struct
import time
import uuid
import wave
from pathlib import Path

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .config import AUDIO_DIR, ensure_dirs, load_settings

router = APIRouter(prefix="/api/dream-studio", tags=["dream-studio"])

TTS_ENDPOINT = (
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
)
MAX_CHARS = 580  # 接口单次上限 600 字符，留出标点与换行的安全余量
KEEP_HOURS = 6  # 转存音频的保留时长，过期即清理


class TtsBody(BaseModel):
    text: str = Field(min_length=1, max_length=6000)
    voice: str = Field(default="Serena", max_length=40)


def _split_text(text: str) -> list[str]:
    """按句子边界切成不超过 MAX_CHARS 的块；超长单句再按字符硬切。"""
    parts = re.findall(r"[^。！？\n]+[。！？]?", text.strip())
    chunks: list[str] = []
    current = ""
    for part in parts:
        while len(part) > MAX_CHARS:
            if current:
                chunks.append(current)
                current = ""
            chunks.append(part[:MAX_CHARS])
            part = part[MAX_CHARS:]
        if len(current) + len(part) > MAX_CHARS:
            chunks.append(current)
            current = part
        else:
            current += part
    if current.strip():
        chunks.append(current)
    return chunks or [text.strip()]


def _cleanup_expired() -> None:
    now = time.time()
    for path in AUDIO_DIR.glob("tts_*.wav"):
        try:
            if now - path.stat().st_mtime > KEEP_HOURS * 3600:
                path.unlink()
        except OSError:
            pass


def _normalize_wav(path: Path) -> None:
    """部分返回的 WAV 头长度字段不可靠，按实际数据重写头，避免播放器误判时长。"""
    raw = path.read_bytes()
    if len(raw) < 44 or raw[:4] != b"RIFF" or raw[8:12] != b"WAVE":
        return
    try:
        with wave.open(str(path), "rb") as check:
            frames = check.getnframes()
            rate = check.getframerate()
        if 0 < frames <= len(raw) and frames / rate < 3600:
            return  # 头部长度正常，无需处理
    except wave.Error:
        pass
    pos, fmt, pcm = 12, None, None
    while pos + 8 <= len(raw):
        chunk_id = raw[pos:pos + 4]
        size = int.from_bytes(raw[pos + 4:pos + 8], "little")
        body = raw[pos + 8:pos + 8 + size] if pos + 8 + size <= len(raw) else raw[pos + 8:]
        if chunk_id == b"fmt ":
            fmt = body
        elif chunk_id == b"data":
            pcm = body
            break
        pos += 8 + size + (size % 2)
    if not fmt or pcm is None or len(fmt) < 16:
        return
    channels, _, rate, _, _, bits = struct.unpack("<HHIIHH", fmt[:16])
    tmp = path.with_name(path.name + ".fix")
    with wave.open(str(tmp), "wb") as output:
        output.setnchannels(channels)
        output.setsampwidth(max(1, bits // 8))
        output.setframerate(rate)
        output.writeframes(pcm)
    tmp.replace(path)


def _concat_wav(paths: list[Path], target: Path) -> None:
    with wave.open(str(target), "wb") as output:
        for index, path in enumerate(paths):
            with wave.open(str(path), "rb") as source:
                if index == 0:
                    output.setparams(source.getparams())
                output.writeframes(source.readframes(source.getnframes()))


async def _synthesize_chunk(settings, text: str, voice: str, client: httpx.AsyncClient) -> bytes:
    payload = {
        "model": settings.tts_model,
        "input": {"text": text, "voice": voice, "language_type": "Chinese"},
    }
    headers = {"Authorization": f"Bearer {settings.api_key}"}
    response = await client.post(TTS_ENDPOINT, json=payload, headers=headers, timeout=120)
    if response.status_code == 401:
        raise HTTPException(503, "云端音色密钥无效，请在服务端 private/.env 检查 QWEN_API_KEY。")
    if response.status_code != 200:
        raise HTTPException(502, "云端音色暂时没有回应，请稍后再试，也可以先安静地读一遍故事。")
    data = response.json()
    audio_url = ((data.get("output") or {}).get("audio") or {}).get("url")
    if not audio_url:
        raise HTTPException(502, "云端音色暂时没有返回音频，请稍后再试。")
    audio = await client.get(audio_url, timeout=120)
    if audio.status_code != 200 or len(audio.content) < 1024:
        raise HTTPException(502, "音频下载失败，请稍后再试。")
    return audio.content


@router.post("/tts")
async def synthesize(body: TtsBody):
    text = body.text.strip()
    if not text:
        raise HTTPException(422, "先留下要朗读的文字。")
    settings = load_settings()
    if not settings.llm_ready:
        raise HTTPException(
            503,
            "云端音色还未配置，请在服务端 private/.env 填写 QWEN_API_KEY。你也可以先安静地阅读故事。",
        )

    ensure_dirs()
    _cleanup_expired()

    chunks = _split_text(text)
    try:
        async with httpx.AsyncClient() as client:
            contents = [await _synthesize_chunk(settings, chunk, body.voice, client) for chunk in chunks]
    except httpx.TimeoutException:
        raise HTTPException(504, "声音点亮得有点慢，请稍后再试一次。") from None
    except httpx.HTTPError:
        raise HTTPException(502, "网络不太安稳，云端音色暂时无法使用，请稍后再试。") from None

    stem = f"tts_{uuid.uuid4().hex}"
    if len(contents) == 1:
        target = AUDIO_DIR / f"{stem}.wav"
        target.write_bytes(contents[0])
        _normalize_wav(target)
    else:
        parts = [AUDIO_DIR / f"{stem}_{i}.wav" for i in range(len(contents))]
        for path, content in zip(parts, contents):
            path.write_bytes(content)
            _normalize_wav(path)
        target = AUDIO_DIR / f"{stem}.wav"
        try:
            _concat_wav(parts, target)
        finally:
            for path in parts:
                path.unlink(missing_ok=True)

    return {"url": f"/audio/{target.name}", "voice": body.voice, "chunks": len(contents)}
