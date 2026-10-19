from __future__ import annotations

from typing import Any

import httpx

from .config import Settings


class XinchaoClient:
    """心潮服务的只读访问与对话事件上报。任何失败都不影响主流程。"""

    def __init__(self, settings: Settings) -> None:
        self._base = settings.xinchao_base_url.rstrip("/")
        self._token = settings.xinchao_token
        self._headers = {"Authorization": f"Bearer {self._token}"}

    async def _get(self, path: str) -> dict[str, Any] | None:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(f"{self._base}{path}", headers=self._headers)
        except httpx.HTTPError:
            return None
        if response.status_code >= 400:
            return None
        try:
            data = response.json()
        except ValueError:
            return {"raw": response.text}
        return data if isinstance(data, dict) else {"value": data}

    async def now(self) -> dict[str, Any] | None:
        return await self._get("/v1/now")

    async def context(self) -> dict[str, Any] | None:
        return await self._get("/v1/context")

    async def state(self) -> dict[str, Any] | None:
        return await self._get("/v1/state")

    async def send_conversation(self, text: str) -> bool:
        payload = {"recent": text, "exchange": f"用户：{text}"}
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.post(
                    f"{self._base}/v1/conversation-event",
                    headers=self._headers,
                    json=payload,
                )
        except httpx.HTTPError:
            return False
        return response.status_code < 400
