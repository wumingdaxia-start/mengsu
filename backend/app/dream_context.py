"""Read only the authenticated account's saved dream library."""
import json
import httpx
from fastapi import HTTPException, Request


def library_rows(values):
    def text(value):
        if isinstance(value, list):
            return '、'.join(str(v) for v in value if isinstance(v, (str, int, float)))
        return str(value or '') if not isinstance(value, dict) else ''
    materials = {str(m.get('id')): m for m in values.get('materials', []) if isinstance(m, dict)}
    result = []
    for record in values.get('snapshots', []):
        if not isinstance(record, dict) or record.get('demo') or record.get('kind') == 'core-report':
            continue
        source = materials.get(str(record.get('sourceId')), {})
        content = text(record.get('signal') or record.get('text') or record.get('content'))
        if not content.strip():
            continue
        title = text(record.get('title'))
        tags = record.get('tags') or source.get('tags') or []
        people = record.get('people') or source.get('people') or []
        result.append({'id': str(record.get('id', '')), 'fragment_date': text(record.get('date'))[:10],
                       'text': (title + '：' + content)[:6000],
                       'place': text(record.get('place') or record.get('location') or source.get('place') or source.get('location')),
                       'emotion': text(record.get('feeling') or record.get('emotion')),
                       'tags': json.dumps(tags if isinstance(tags, list) else [tags], ensure_ascii=False),
                       'people': json.dumps(people if isinstance(people, list) else [people], ensure_ascii=False)})
    return sorted(result, key=lambda row: row['fragment_date'], reverse=True)


async def account_dream_rows(request: Request):
    session = request.cookies.get('health_session')
    if not session:
        raise HTTPException(401, '请先登录账号，再分析自己的梦库')
    try:
        async with httpx.AsyncClient(timeout=15, trust_env=False) as client:
            headers = {'cookie': 'health_session=' + session}
            identity = await client.get('http://127.0.0.1:3001/api/me', headers=headers)
            if identity.status_code == 401:
                raise HTTPException(401, '登录已失效，请重新登录后分析梦库')
            if identity.status_code != 200:
                raise HTTPException(503, '账号服务暂时不可用，请稍后重试')
            headers['x-health-user'] = str(identity.json()['user']['id'])
            response = await client.get('http://127.0.0.1:3001/api/dream-data', headers=headers)
            if response.status_code != 200:
                raise HTTPException(response.status_code, '梦库未能读取，请刷新登录状态后重试')
            return library_rows(response.json().get('values', {}))
    except (httpx.HTTPError, ValueError, KeyError):
        raise HTTPException(503, '梦库暂时无法读取，请稍后重试') from None
