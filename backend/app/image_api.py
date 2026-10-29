"""Server-side adapter for an OpenAI-compatible image generation service."""
import base64
import binascii
import os

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .config import load_settings

router = APIRouter(prefix="/api/images", tags=["images"])


class ImageRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=1000)


@router.post("/generate")
async def generate_image(body: ImageRequest):
    prompt = body.prompt.strip()
    if not prompt:
        raise HTTPException(422, "请先描述你想留下的梦境画面。")
    load_settings()  # Also loads private/.env; credentials never reach the browser.
    key = os.getenv("IMAGE_API_KEY", "")
    base = os.getenv("IMAGE_BASE_URL", "").rstrip("/")
    model = os.getenv("IMAGE_MODEL", "")
    if not all((key, base, model)):
        raise HTTPException(503, "图像生成模型尚未配置，请配置 IMAGE_API_KEY、IMAGE_BASE_URL 和 IMAGE_MODEL。")
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                f"{base}/images/generations",
                headers={"Authorization": f"Bearer {key}"},
                json={"model": model, "prompt": prompt, "n": 1,
                      "size": "1024x1024", "response_format": "b64_json"},
            )
            response.raise_for_status()
            encoded = response.json()["data"][0]["b64_json"]
            if not isinstance(encoded, str) or len(encoded) > 20_000_000:
                raise ValueError("Invalid image size")
            raw = base64.b64decode(encoded, validate=True)
            mime = ("image/png" if raw.startswith(b"\x89PNG\r\n\x1a\n") else
                    "image/jpeg" if raw.startswith(b"\xff\xd8\xff") else
                    "image/webp" if raw[:4] == b"RIFF" and raw[8:12] == b"WEBP" else None)
            if not mime:
                raise ValueError("Unsupported image")
            return {"image": f"data:{mime};base64,{encoded}"}
    except httpx.TimeoutException:
        raise HTTPException(504, "画面生成超时，请稍后重试。") from None
    except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError, binascii.Error):
        raise HTTPException(502, "图像服务暂时未能生成画面，请检查模型配置或稍后重试。") from None
