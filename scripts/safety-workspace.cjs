'use strict';
// Reuse the local safety app and its database. No account or record files are copied.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const SAFETY_ROOT = process.env.MENGSU_SAFETY_ROOT || 'D:/\u6d4b\u8bd5/\u5b89\u5168';
const EMBED_PATH = '/__mengsu/';

function integrateServer(server, { parentPort = 8000 } = {}) {
  const allowedParents = ['http://127.0.0.1:' + parentPort, 'http://localhost:' + parentPort];
  const handlers = server.listeners('request');
  server.removeAllListeners('request');
  server.on('request', (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const requestOrigin = req.headers.origin;
    const allowOrigin = allowedParents.includes(requestOrigin) ? requestOrigin : null;
    // Normalize only the explicitly trusted local parents for the original
    // same-origin write check. Untrusted origins retain that protection.
    if (allowOrigin) req.headers.origin = 'http://' + req.headers.host;
    if (req.method === 'OPTIONS' && allowOrigin) {
      res.writeHead(204, { 'Access-Control-Allow-Origin': allowOrigin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type, X-Health-User', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', Vary: 'Origin' });
      return res.end();
    }
    const asset = { [EMBED_PATH + 'embed.css']: ['safety-embed.css', 'text/css'], [EMBED_PATH + 'embed.js']: ['safety-embed.js', 'text/javascript'] }[url.pathname];
    if (asset) {
      let source = fs.readFileSync(path.join(__dirname, asset[0]), 'utf8');
      if (asset[0].endsWith('.js')) source = source.replace("['http://127.0.0.1:8000', 'http://localhost:8000']", JSON.stringify(allowedParents));
      res.writeHead(200, { 'Content-Type': asset[1] + '; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      return res.end(source);
    }
    const originalHead = res.writeHead;
    const originalEnd = res.end;
    let html = false;
    res.writeHead = function(status, headers) {
      html = (headers?.['Content-Type'] || '').includes('text/html');
      if (html) {
        headers = { ...headers, 'Content-Security-Policy': String(headers['Content-Security-Policy'] || "default-src 'self'; script-src 'self'; style-src 'self'").replace(/;?\s*frame-ancestors[^;]*/g, '') + "; frame-ancestors 'self' " + allowedParents.join(' ') };
        delete headers['Content-Length'];
      }
      if (allowOrigin) headers = { ...headers, 'Access-Control-Allow-Origin': allowOrigin, 'Access-Control-Allow-Credentials': 'true', Vary: 'Origin' };
      return originalHead.call(this, status, headers);
    };
    res.end = function(body, encoding, callback) {
      if (html && body) {
        body = body.toString().replace('</head>', '<link rel="stylesheet" href="' + EMBED_PATH + 'embed.css"><script src="' + EMBED_PATH + 'embed.js" defer></script></head>');
      }
      return originalEnd.call(this, body, encoding, callback);
    };
    for (const handler of handlers) handler.call(server, req, res);
  });
  return server;
}

function canConnect(port, host = '127.0.0.1') {
  return new Promise(resolve => {
    const socket = net.createConnection({ port, host });
    const finish = result => { socket.destroy(); resolve(result); };
    socket.setTimeout(700);
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.once('timeout', () => finish(false));
  });
}
async function ensureMysql(config) {
  if (!config || !['127.0.0.1', 'localhost'].includes(config.host) || await canConnect(config.port, config.host)) return;
  const root = path.resolve(SAFETY_ROOT, '../mysql-local');
  const executable = path.join(root, 'mysql-8.4.11-winx64/bin/mysqld.exe');
  const ini = path.join(root, 'my.ini');
  if (!fs.existsSync(executable) || !fs.existsSync(ini)) throw Error('Local MySQL is unavailable. Start the safety app database first.');
  const child = spawn(executable, ['--defaults-file=' + ini], { cwd: root, windowsHide: true, stdio: 'ignore', detached: true });
  child.on('error', () => {});
  child.unref();
  for (let i = 0; i < 30; i++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (await canConnect(config.port, config.host)) return;
  }
  throw Error('Local MySQL did not become ready.');
}
async function start() {
  if (!fs.existsSync(path.join(SAFETY_ROOT, 'server.js'))) throw Error('Safety app missing. Set MENGSU_SAFETY_ROOT to its folder.');
  for (const name of ['HEALTH_AI_API_KEY', 'HEALTH_AI_MODEL', 'HEALTH_AI_BASE_URL']) {
    // Existing safety environment settings are inherited; never copy credentials into source.
    if (process.env[name] === '') delete process.env[name];
  }
  const { loadMysqlConfig } = require(path.join(SAFETY_ROOT, 'mysql-store.js'));
  await ensureMysql(loadMysqlConfig());
  const { createServer } = require(path.join(SAFETY_ROOT, 'server.js'));
  const server = integrateServer(createServer(), { parentPort: Number(process.env.MENGSU_PARENT_PORT || 8000) });
  await server.ready;
  const port = Number(process.env.MENGSU_SAFETY_PORT || 3001);
  server.on('error', error => { console.error('[mengsu] Safety service: ' + error.code); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log('[mengsu] Safety workspace ready at http://127.0.0.1:' + port));
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  return server;
}
if (require.main === module) start().catch(error => { console.error('[mengsu] ' + error.message); process.exitCode = 1; });
module.exports = { integrateServer };
