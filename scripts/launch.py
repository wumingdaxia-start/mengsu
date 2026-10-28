"""Portable local launcher. Only Python and Node/npm must be installed."""
from pathlib import Path
import argparse
import getpass
import hashlib
import json
import os
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / 'data' / 'setup'


def run(args, **kwargs):
    subprocess.run([str(a) for a in args], cwd=ROOT, check=True, **kwargs)


def fingerprint(*files):
    return hashlib.sha256(b''.join(p.read_bytes() for p in files)).hexdigest()


def environment():
    if sys.version_info < (3, 10):
        raise RuntimeError('Python 3.10+ required (recommended: Python 3.12).')
    node, npm = shutil.which('node'), shutil.which('npm.cmd' if os.name == 'nt' else 'npm')
    if not node or not npm:
        raise RuntimeError('Install Node.js 22.12+ LTS (including npm), then reopen the terminal.')
    version = subprocess.check_output([node, '--version'], text=True).strip().lstrip('v')
    major, minor = [int(x) for x in version.split('.')[:2]]
    if (major, minor) < (22, 12):
        raise RuntimeError('Node.js 22.12+ required; please install a current LTS version.')
    venv = ROOT / '.venv'
    candidates = [venv / name for name in ('Scripts/python.exe', 'bin/python.exe', 'bin/python')]
    python = next((p for p in candidates if p.exists()), candidates[0 if os.name == 'nt' else 2])
    if Path(sys.prefix).resolve() != venv.resolve():
        if not python.exists():
            print('[mengsu] Creating isolated Python environment...', flush=True)
            run([sys.executable, '-m', 'venv', venv])
            python = next((p for p in candidates if p.exists()), python)
        run([python, Path(__file__).resolve(), *sys.argv[1:]])
        sys.exit(0)
    STATE.mkdir(parents=True, exist_ok=True)
    digest = fingerprint(ROOT / 'requirements.txt')
    stamp = STATE / 'python.txt'
    if not stamp.exists() or stamp.read_text() != digest:
        print('[mengsu] Installing Python dependencies...', flush=True)
        run([sys.executable, '-m', 'pip', 'install', '-r', ROOT / 'requirements.txt'])
        stamp.write_text(digest)
    for relative in ['services/safety', 'frontend']:
        directory = ROOT / relative
        digest = fingerprint(directory / 'package.json', directory / 'package-lock.json')
        stamp = STATE / (relative.replace('/', '-') + '.txt')
        changed = not stamp.exists() or stamp.read_text() != digest or not (directory / 'node_modules').exists()
        if changed:
            print('[mengsu] Installing ' + relative + ' dependencies...', flush=True)
            run([npm, 'ci', '--prefix', directory])
            stamp.write_text(digest)
    # Rebuild when sources/configuration change; repeated starts skip this step.
    directory = ROOT / 'frontend'
    inputs = sorted(p for folder in ['src', 'public'] for p in (directory / folder).rglob('*') if p.is_file())
    inputs += sorted(p for p in directory.iterdir() if p.is_file())
    digest = fingerprint(*inputs)
    stamp = STATE / 'build.txt'
    if not stamp.exists() or stamp.read_text() != digest or not (directory / 'dist/index.html').exists():
        print('[mengsu] Building frontend...', flush=True)
        run([npm, 'run', 'build', '--prefix', directory])
        stamp.write_text(digest)
    return node


def load_env():
    file = ROOT / 'private/.env'
    if not file.exists():
        return
    for raw in file.read_text(encoding='utf-8-sig').splitlines():
        line = raw.strip()
        if line and not line.startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            os.environ.setdefault(key.strip(), value.strip().strip('\"\''))


def create_account(node, account=None, password=None):
    account = account or input('New account (letters/numbers, 3-64 characters): ').strip()
    password = password or getpass.getpass('New password (8+ characters): ')
    run([node, ROOT / 'services/safety/create-account.cjs'], input=json.dumps({'account': account, 'password': password}), text=True)


def wait_ready(url, child, expected):
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        if child.poll() is not None:
            raise RuntimeError('Service exited during startup; see output above.')
        try:
            with urllib.request.urlopen(url, timeout=1) as response:
                if response.status == expected:
                    return
        except urllib.error.HTTPError as exc:
            if exc.code == expected:
                return
        except (OSError, urllib.error.URLError):
            pass
        time.sleep(.3)
    raise RuntimeError('Service did not become ready: ' + url)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--no-browser', action='store_true')
    parser.add_argument('--setup-only', action='store_true')
    parser.add_argument('--create-account', action='store_true')
    args = parser.parse_args()
    node = environment()
    load_env()
    if args.create_account:
        create_account(node)
        return
    if args.setup_only:
        print('[mengsu] Setup complete.')
        return
    # A fresh local installation gets a documented public demo account, never copied personal data.
    if not os.environ.get('MYSQL_HOST') and not (ROOT / 'data/safety/users.json').exists():
        create_account(node, 'demo', 'MengsuDemo2026!')
        print('[mengsu] Local demo login: demo / MengsuDemo2026! (shared demo, use no private data)', flush=True)
    for port in [args.port, 3001]:
        with socket.socket() as probe:
            if probe.connect_ex(('127.0.0.1', port)) == 0:
                raise RuntimeError(f'Port {port} is in use. Stop the existing app first.')
    children = []
    try:
        env = dict(os.environ, MENGSU_PARENT_PORT=str(args.port))
        safety = subprocess.Popen([node, str(ROOT / 'scripts/safety-workspace.cjs')], cwd=ROOT, env=env)
        children.append(safety)
        wait_ready('http://127.0.0.1:3001/api/me', safety, 401)
        backend = subprocess.Popen([sys.executable, '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', str(args.port)], cwd=ROOT / 'backend')
        children.append(backend)
        wait_ready(f'http://127.0.0.1:{args.port}/api/health', backend, 200)
        url = f'http://127.0.0.1:{args.port}/entry'
        print('[mengsu] Ready: ' + url + ' | Ctrl+C to stop', flush=True)
        if not args.no_browser:
            webbrowser.open(url)
        while all(child.poll() is None for child in children):
            time.sleep(.5)
        raise RuntimeError('A service exited unexpectedly; see output above.')
    except KeyboardInterrupt:
        print('\n[mengsu] Stopping...')
    finally:
        for child in reversed(children):
            if child.poll() is None:
                child.terminate()
        for child in children:
            try:
                child.wait(timeout=8)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait()


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, subprocess.CalledProcessError, OSError) as exc:
        print('[mengsu] Startup failed: ' + str(exc), file=sys.stderr)
        sys.exit(1)
