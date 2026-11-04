"""Browser-isolated, expiring AI credentials. Never return or persist API keys."""
import secrets
import time
from contextvars import ContextVar
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field, SecretStr

router = APIRouter(prefix='/api/ai-settings', tags=['ai-settings'])
request_config = ContextVar('ai_request_config', default=None)
COOKIE = 'huayuxing_ai_session'
TTL = 12 * 3600
sessions = {}
REGIONS = {
    'cn': 'https://dashscope.aliyuncs.com',
    'intl': 'https://dashscope-intl.aliyuncs.com',
}


class Configuration(BaseModel):
    region: Literal['cn', 'intl'] = 'cn'
    api_key: SecretStr = Field(min_length=1, max_length=512)
    chat_model: str = Field(default='qwen-plus', pattern=r'^[a-zA-Z0-9_.-]{1,100}$')
    tts_model: str = Field(default='qwen3-tts-flash', pattern=r'^qwen[a-zA-Z0-9_.-]{1,100}$')


def current(request):
    now = time.time()
    for token in list(sessions):
        if sessions.get(token, {}).get('expires', 0) < now:
            sessions.pop(token, None)
    return sessions.get(request.cookies.get(COOKIE, ''))


def check_origin(request):
    # Cross-site forms must never replace a visitor's credentials.
    origin = request.headers.get('origin')
    if origin and origin.rstrip('/') != str(request.base_url).rstrip('/'):
        raise HTTPException(403, '请在当前网站内操作 API 设置。')
    if request.headers.get('sec-fetch-site') == 'cross-site':
        raise HTTPException(403, '请在当前网站内操作 API 设置。')


@router.get('')
def status(request: Request, response: Response):
    from .config import load_settings
    config = current(request)
    settings = load_settings()
    response.headers['Cache-Control'] = 'no-store'
    return {'configured': settings.llm_ready, 'source': 'personal' if config else 'server' if settings.llm_ready else 'none',
            'region': config['region'] if config else 'cn', 'chat_model': settings.chat_model,
            'tts_model': settings.tts_model, 'expires_in': max(0, int(config['expires']-time.time())) if config else None}


@router.put('')
def save(body: Configuration, request: Request, response: Response):
    check_origin(request)
    key = body.api_key.get_secret_value().strip()
    if not key or any(ord(c) < 33 or ord(c) > 126 for c in key):
        raise HTTPException(400, '密钥格式不正确，请重新复制完整的 API Key。')
    current(request)  # Evict expired entries before admitting a new session.
    old = request.cookies.get(COOKIE, '')
    if len(sessions) >= 1000 and old not in sessions:
        raise HTTPException(503, '当前设置人数较多，请稍后再试。')
    sessions.pop(old, None)
    token = secrets.token_urlsafe(32)
    sessions[token] = {'key': key, 'region': body.region, 'chat_model': body.chat_model,
                       'tts_model': body.tts_model, 'expires': time.time()+TTL}
    response.set_cookie(COOKIE, token, httponly=True, secure=request.url.scheme=='https',
                        samesite='strict', max_age=TTL, path='/')
    response.headers['Cache-Control'] = 'no-store'
    return {'saved': True}


@router.delete('')
def clear(request: Request, response: Response):
    check_origin(request)
    sessions.pop(request.cookies.get(COOKIE, ''), None)
    response.delete_cookie(COOKIE, path='/')
    return {'cleared': True}


class TestBody(BaseModel):
    kind: Literal['chat', 'voice'] = 'chat'


@router.post('/test')
async def test_connection(body: TestBody, request: Request):
    from .config import load_settings
    from .llm import chat, LLMError
    from .tts_api import _synthesize_chunk
    check_origin(request)
    settings = load_settings()
    if not settings.llm_ready:
        raise HTTPException(503, '请先保存 API 密钥，再测试连接。')
    try:
        if body.kind == 'chat':
            await chat(settings, [{'role':'user','content':'请回复：连接成功'}], max_tokens=20, timeout=20)
        else:
            async with httpx.AsyncClient() as client:
                await _synthesize_chunk(settings, '晚安，愿你有个好梦。', 'Serena', client)
        return {'ok': True, 'message': '文字模型连接成功' if body.kind=='chat' else '云端音色连接成功'}
    except HTTPException:
        raise
    except (httpx.HTTPError, LLMError, ValueError, KeyError, IndexError, TypeError):
        raise HTTPException(502, '连接未成功，请检查密钥、所属地域、模型权限及账户余额。') from None
