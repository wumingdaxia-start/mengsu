"""No live API keys or paid provider requests are used by these tests."""
import os
import unittest
import httpx
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from app.main import app
from app.ai_settings import sessions, request_config
from app.config import load_settings


class AiSettingsTests(unittest.TestCase):
    def setUp(self):
        sessions.clear()
        self.env = patch.dict(os.environ, {}, clear=True)
        self.env.start()
        self.files = patch('app.config._read_env_file')
        self.files.start()
        self.a = TestClient(app)
        self.b = TestClient(app)

    def tearDown(self):
        self.a.close(); self.b.close()
        self.files.stop(); self.env.stop(); sessions.clear()

    def save(self, client, key='sk-test-only-not-real', **extra):
        return client.put('/api/ai-settings', json={'api_key':key, **extra})

    def test_isolation_and_no_key_echo(self):
        self.assertFalse(self.b.get('/api/ai-settings').json()['configured'])
        response = self.save(self.a)
        self.assertEqual(response.status_code, 200)
        self.assertIn('HttpOnly', response.headers['set-cookie'])
        status = self.a.get('/api/ai-settings')
        self.assertEqual(status.json()['source'], 'personal')
        self.assertNotIn('sk-test-only', status.text)
        self.assertFalse(self.b.get('/api/ai-settings').json()['configured'])
        self.assertFalse(load_settings().llm_ready)

    def test_clear_and_expiry(self):
        self.save(self.a)
        self.a.delete('/api/ai-settings')
        self.assertFalse(self.a.get('/api/ai-settings').json()['configured'])
        self.save(self.a)
        for config in sessions.values(): config['expires']=0
        self.assertFalse(self.a.get('/api/ai-settings').json()['configured'])

    def test_validation_does_not_return_secret(self):
        secret='x'*513
        response=self.save(self.a, secret)
        self.assertEqual(response.status_code,422)
        self.assertNotIn(secret,response.text)
        self.assertEqual(self.save(self.a,region='other').status_code,422)
        self.assertEqual(self.a.put('/api/ai-settings',json={'api_key':'test'},headers={'Origin':'https://elsewhere.test'}).status_code,403)

    def test_personal_config_reaches_chat_and_voice(self):
        self.save(self.a, region='intl', chat_model='qwen-turbo')
        async def reply(settings, *args, **kwargs):
            self.assertEqual(settings.api_key,'sk-test-only-not-real')
            self.assertEqual(settings.chat_model,'qwen-turbo')
            self.assertIn('dashscope-intl',settings.base_url)
            return '连接成功'
        with patch('app.llm.chat',side_effect=reply):
            self.assertEqual(self.a.post('/api/ai-settings/test',json={'kind':'chat'}).status_code,200)
        with patch('app.tts_api._synthesize_chunk',new=AsyncMock(return_value=b'test')) as synth:
            self.assertEqual(self.a.post('/api/ai-settings/test',json={'kind':'voice'}).status_code,200)
            self.assertEqual(synth.call_args.args[0].api_key,'sk-test-only-not-real')
        self.assertIsNone(request_config.get())

    def test_missing_key_guidance(self):
        response=self.b.post('/api/dream-studio/tts',json={'text':'晚安'})
        self.assertEqual(response.status_code,503)
        self.assertIn('AI 服务设置',response.json()['detail'])
        self.assertNotIn('private/',response.text)

    def test_proxy_preserves_session_and_rewrites_assets(self):
        async def upstream(method, url, **kwargs):
            self.assertEqual(url, 'http://127.0.0.1:3001/api/login')
            self.assertEqual(kwargs['headers']['host'],'testserver')
            self.assertNotIn('huayuxing_ai_session',kwargs['headers']['cookie'])
            return httpx.Response(200,json={'ok':True},headers={'set-cookie':'health_session=test; HttpOnly; Path=/'})
        self.save(self.a)
        with patch('app.account_proxy.httpx.AsyncClient.request',side_effect=upstream):
            response=self.a.post('/account-service/api/login',json={})
            self.assertEqual(response.status_code,200)
            self.assertIn('health_session=test',response.headers['set-cookie'])
        with patch('app.account_proxy.httpx.AsyncClient.request',new=AsyncMock(return_value=httpx.Response(200,
            text='<script src="/app.js"></script>',headers={'content-type':'text/html'}))):
            self.assertIn('/account-service/app.js',self.a.get('/account-service/').text)

    def test_local_proxy_ignores_system_proxy(self):
        # A broken proxy must not intercept the account service on loopback.
        with patch.dict('os.environ', {'HTTP_PROXY':'http://127.0.0.1:1', 'ALL_PROXY':'http://127.0.0.1:1', 'NO_PROXY':''}):
            with patch('app.account_proxy.httpx.AsyncClient.request', new=AsyncMock(return_value=httpx.Response(200, json={'ok':True}))) as request:
                original = httpx.AsyncClient.__init__
                options = []
                def capture(client, *args, **kwargs):
                    options.append(kwargs)
                    original(client, *args, **kwargs)
                with patch('app.account_proxy.httpx.AsyncClient.__init__', new=capture):
                    self.assertEqual(self.a.get('/account-service/api/me').status_code, 200)
                self.assertFalse(options[0]['trust_env'])
                self.assertEqual(request.call_args.args[1], 'http://127.0.0.1:3001/api/me')


if __name__ == '__main__':
    unittest.main()
