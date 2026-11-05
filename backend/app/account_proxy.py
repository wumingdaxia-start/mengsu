"""Expose the local account service through the website's single origin."""
import re
import ssl
import httpx
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import Response
from .ai_settings import check_origin, request_config, REGIONS

router = APIRouter()
PREFIX = '/account-service'
# Loading the Windows certificate store per asset blocks the event loop.
_LOCAL_SSL_CONTEXT = ssl.create_default_context()


@router.api_route(PREFIX+'/{path:path}', methods=['GET','POST','PUT','DELETE','PATCH','OPTIONS'], include_in_schema=False)
async def account_proxy(path: str, request: Request):
    if request.method not in ('GET', 'OPTIONS'):
        check_origin(request)
    # Fixed upstream: callers cannot choose another host or forward their AI key.
    if '..' in path.split('/') or '\\' in path or path.startswith('/'):
        raise HTTPException(400, '无效路径')
    headers = {k:v for k,v in request.headers.items() if k.lower() in ('content-type','cookie','x-health-user','accept')}
    headers['host'] = request.headers.get('host', 'localhost')
    personal = request_config.get()
    if personal:
        headers['x-huayuxing-ai-key'] = personal['key']
        headers['x-huayuxing-ai-region'] = personal['region']
        headers['x-huayuxing-ai-model'] = personal['chat_model']
    if request.headers.get('origin'):
        headers['origin'] = request.headers['origin']
    # The AI session cookie has no meaning to the account service.
    headers['cookie'] = '; '.join(p.strip() for p in headers.get('cookie','').split(';') if p.strip().startswith('health_session='))
    try:
        # This fixed loopback upstream must bypass OS/environment proxies.
        async with httpx.AsyncClient(timeout=90, trust_env=False, verify=_LOCAL_SSL_CONTEXT) as client:
            upstream = await client.request(request.method, 'http://127.0.0.1:3001/'+path,
                                            params=request.query_params, headers=headers, content=await request.body())
    except httpx.HTTPError:
        raise HTTPException(503, '账号服务暂时无法连接，请稍后重试。') from None
    kind = upstream.headers.get('content-type','')
    content = upstream.content
    # Keep the bundled health application's root-relative assets and APIs in its namespace.
    if any(t in kind for t in ('text/html','javascript','text/css')):
        text = upstream.text
        text = re.sub(r'''(["'`])/api/''', r'\1'+PREFIX+'/api/', text)
        text = re.sub(r'''((?:src|href)=["'])/(?!/)''', r'\1'+PREFIX+'/', text)
        text = re.sub(r'''(url\(["']?)/(?!/)''', r'\1'+PREFIX+'/', text)
        content = text.encode('utf-8')
    response = Response(content, status_code=upstream.status_code, headers={'content-type':kind,'cache-control':'no-store'})
    for cookie in upstream.headers.get_list('set-cookie'):
        if request.url.scheme == 'https' and 'secure' not in cookie.lower():
            cookie += '; Secure'
        response.headers.append('set-cookie',cookie)
    if upstream.headers.get('location'):
        location = upstream.headers['location']
        response.headers['location'] = PREFIX+location if location.startswith('/') else location
    return response
