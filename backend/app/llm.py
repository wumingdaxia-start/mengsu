from __future__ import annotations

import json
from typing import Any
from urllib.parse import urlsplit

import httpx

from .config import Settings


class LLMError(RuntimeError):
    pass


async def chat(
    settings: Settings,
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.3,
    max_tokens: int = 900,
    json_mode: bool = False,
    timeout: float = 60.0,
) -> str:
    if not settings.llm_ready:
        raise LLMError("文字模型尚未连接，请打开「AI 服务设置」配置并测试。")

    payload: dict[str, Any] = {
        "model": settings.chat_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    # DashScope Qwen3 non-streaming calls require thinking to be disabled.
    # Keep third-party OpenAI-compatible gateways free of vendor parameters.
    host = urlsplit(settings.base_url).hostname or ""
    if host == "dashscope.aliyuncs.com" or host.endswith(".dashscope.aliyuncs.com") or host == "dashscope-intl.aliyuncs.com":
        payload["enable_thinking"] = False

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            f"{settings.base_url}/chat/completions",
            headers={"Authorization": f"Bearer {settings.api_key}"},
            json=payload,
        )
    if response.status_code >= 400:
        raise LLMError(f"模型连接失败（{response.status_code}），请检查 AI 服务设置中的密钥、模型权限和余额。")
    data = response.json()
    return data["choices"][0]["message"]["content"]


async def chat_json(
    settings: Settings,
    messages: list[dict[str, str]],
    *,
    max_tokens: int = 900,
) -> dict[str, Any]:
    raw = await chat(settings, messages, temperature=0.1, max_tokens=max_tokens, json_mode=True)
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise LLMError(f"模型未返回合法 JSON: {raw[:200]}") from exc
