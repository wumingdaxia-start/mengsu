import unittest
from datetime import date, timedelta
from types import SimpleNamespace
from unittest.mock import patch, AsyncMock
import httpx
from fastapi.testclient import TestClient
from app.main import app
from app.dream_context import library_rows
from app import insight


class DreamAskTests(unittest.TestCase):
    def test_conversion_excludes_demo_and_unsaved_materials(self):
        rows = library_rows({'snapshots': [{'id': 'a', 'date': '2026-11-17', 'signal': '走过森林', 'sourceId': 'm'}, {'demo': True, 'signal': '示例'}, {'kind': 'core-report', 'signal': '报告'}], 'materials': [{'id': 'm', 'people': ['朋友']}, {'signal': '未保存的素材'}]})
        self.assertEqual(len(rows), 1)
        self.assertIn('朋友', rows[0]['people'])

    def test_api_account_isolation_and_general_question(self):
        original = httpx.AsyncClient
        def transport(req):
            cookie = req.headers.get('cookie', '')
            owner = 'alice' if 'alice' in cookie else 'bob'
            if req.url.path == '/api/me':
                return httpx.Response(200, json={'user': {'id': owner}})
            self.assertEqual(req.headers['x-health-user'], owner)
            return httpx.Response(200, json={'values': {'snapshots': [{'id': owner, 'date': date.today().isoformat(), 'signal': owner + '梦见森林'}]}})
        def client(**kwargs):
            return original(**kwargs, transport=httpx.MockTransport(transport))
        with TestClient(app) as browser:
            with patch('app.dream_context.httpx.AsyncClient', side_effect=client), patch('app.insight.load_settings', return_value=SimpleNamespace(llm_ready=True)), patch('app.insight.chat', new_callable=AsyncMock, return_value='根据记录分析') as model, patch('app.insight._rows', side_effect=AssertionError('must not read legacy shared data')):
                self.assertEqual(browser.post('/api/dreams/ask', json={'question': '最近有什么规律'}).status_code, 401)
                for owner in ('alice', 'bob'):
                    browser.cookies.set('health_session', owner)
                    response = browser.post('/api/dreams/ask', json={'question': '最近有什么规律'}, headers={'x-health-user': 'forged'})
                    self.assertEqual(response.status_code, 200, response.text)
                    self.assertEqual(response.json()['evidence'][0]['id'], owner)
                    self.assertIn(owner, model.call_args.args[1][1]['content'])
                    self.assertNotIn('bob' if owner == 'alice' else 'alice', response.text)

    def test_week_filter_and_no_legacy_fallback(self):
        import asyncio
        old = (date.today() - timedelta(days=20)).isoformat()
        rows = library_rows({'snapshots': [{'id': 'old', 'date': old, 'signal': '森林'}]})
        result = asyncio.run(insight.ask('分析最近一周的梦', rows=rows))
        self.assertEqual(result['evidence'], [])
        self.assertIn('最近一周', result['answer'])
        with patch('app.insight._rows', side_effect=AssertionError('legacy leak')):
            result = asyncio.run(insight.ask('最近有什么规律', rows=[]))
            self.assertEqual(result['evidence'], [])

if __name__ == '__main__':
    unittest.main()
