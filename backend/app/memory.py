from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, TYPE_CHECKING

if TYPE_CHECKING:
    from mcp import ClientSession

from .config import Settings


class MemoryUnavailable(RuntimeError):
    """记忆服务不可用。调用方应当降级，不要中断记录流程。"""


class MemoryClient:
    """通过 MCP 访问长期记忆：hold 写入，breath 召回。"""

    def __init__(self, settings: Settings) -> None:
        if not settings.memory_ready:
            raise MemoryUnavailable("未配置记忆服务令牌")
        self._url = f"{settings.memory_base_url.rstrip('/')}/mcp"
        self._headers = {"Authorization": f"Bearer {settings.memory_token}"}

    @asynccontextmanager
    async def _session(self) -> AsyncIterator[ClientSession]:
        try:
            from mcp import ClientSession
            from mcp.client.streamable_http import streamablehttp_client
        except ImportError as exc:
            raise MemoryUnavailable("可选记忆客户端未安装，请运行 pip install -r requirements-memory.txt") from exc
        async with streamablehttp_client(self._url, headers=self._headers) as (read, write, _):
            async with ClientSession(read, write) as session:
                await session.initialize()
                yield session

    async def list_tools(self) -> list[str]:
        async with self._session() as session:
            result = await session.list_tools()
        return [tool.name for tool in result.tools]

    async def call(self, name: str, arguments: dict[str, Any]) -> str:
        async with self._session() as session:
            result = await session.call_tool(name, arguments)
        chunks = [getattr(block, "text", "") for block in result.content]
        return "\n".join(chunk for chunk in chunks if chunk)

    async def remember(self, content: str, tags: str = "", importance: int = 5) -> str:
        return await self.call(
            "hold",
            {"content": content, "tags": tags, "importance": importance},
        )

    async def recall(self, query: str, max_results: int = 5) -> str:
        return await self.call("breath", {"query": query, "max_results": max_results})
