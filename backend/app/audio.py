from __future__ import annotations

import base64
import os
import subprocess
import wave
from pathlib import Path
from xml.sax.saxutils import escape

import numpy as np

from .config import AUDIO_DIR, BASE_DIR, ensure_dirs

SAMPLE_RATE = 22050
CHANNELS = 1
SAMPLE_WIDTH = 2
TTS_SCRIPT = BASE_DIR / "scripts" / "tts.ps1"


def _write_wav(path: Path, samples: np.ndarray) -> None:
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(CHANNELS)
        handle.setsampwidth(SAMPLE_WIDTH)
        handle.setframerate(SAMPLE_RATE)
        handle.writeframes(samples.astype("<i2").tobytes())


def _tone(seconds: float = 2.2, freq: float = 196.0) -> np.ndarray:
    """一声柔和的提示音，起落各留一点渐变，不刺耳。"""
    count = int(SAMPLE_RATE * seconds)
    timeline = np.linspace(0, seconds, count, endpoint=False)
    attack = np.clip(timeline / 0.5, 0, 1)
    release = np.clip((seconds - timeline) / 0.8, 0, 1)
    wave_data = np.sin(2 * np.pi * freq * timeline)
    return (wave_data * attack * release * 0.22 * 32767).astype("<i2")


def _silence(seconds: float) -> np.ndarray:
    return np.zeros(int(SAMPLE_RATE * seconds), dtype="<i2")


def _ssml(items: list[str]) -> str:
    lines = ["<speak version=\"1.0\" xmlns=\"http://www.w3.org/2001/10/synthesis\" xml:lang=\"zh-CN\">"]
    lines.append("今晚要放下的几件事。<break time=\"1400ms\"/>")
    for index, item in enumerate(items, start=1):
        clipped = item.strip()[:60]
        lines.append(f"第{index}件，{escape(clipped)}。<break time=\"2600ms\"/>")
    lines.append("记下来就好。<break time=\"1200ms\"/></speak>")
    return "".join(lines)


def _speak(items: list[str], out_file: Path) -> bool:
    if not TTS_SCRIPT.exists():
        return False
    env = dict(os.environ)
    env["CUE_SSML_B64"] = base64.b64encode(_ssml(items).encode("utf-8")).decode("ascii")
    try:
        result = subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(TTS_SCRIPT),
                "-OutFile",
                str(out_file),
            ],
            env=env,
            capture_output=True,
            timeout=120,
        )
    except (OSError, subprocess.SubprocessError):
        return False
    return result.returncode == 0 and out_file.exists() and out_file.stat().st_size > 1024


def _append(paths: list[Path], out_file: Path) -> None:
    with wave.open(str(out_file), "wb") as output:
        output.setnchannels(CHANNELS)
        output.setsampwidth(SAMPLE_WIDTH)
        output.setframerate(SAMPLE_RATE)
        for path in paths:
            with wave.open(str(path), "rb") as source:
                output.writeframes(source.readframes(source.getnframes()))


def build_cue_audio(session_id: int, items: list[str]) -> Path:
    """生成线索音频：提示音 + 逐条念出 + 尾音静默。合成不可用时退回提示音。"""
    ensure_dirs()
    head = AUDIO_DIR / f"cue_{session_id}_tone.wav"
    body = AUDIO_DIR / f"cue_{session_id}_voice.wav"
    target = AUDIO_DIR / f"cue_{session_id}.wav"

    _write_wav(head, np.concatenate([_tone(), _silence(0.8)]))

    parts = [head]
    if items and _speak(items, body):
        parts.append(body)
    parts.append(AUDIO_DIR / f"cue_{session_id}_tail.wav")
    _write_wav(parts[-1], _silence(2.0 if len(parts) > 2 else 1.2))

    _append(parts, target)

    for leftover in (head, body):
        if leftover.exists():
            leftover.unlink()
    tail = parts[-1]
    if tail.exists() and tail != target:
        tail.unlink()
    return target


def duration_seconds(path: Path) -> float:
    with wave.open(str(path), "rb") as handle:
        return handle.getnframes() / float(handle.getframerate())
