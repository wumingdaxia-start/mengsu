param(
    [string]$PythonPath = "E:\Anaconda\envs\sleep-agent\python.exe",
    [string]$NodePath = "node",
    [int]$Port = 8000,
    [switch]$NoXinchao,
    [switch]$NoMemory
)

# Keep this file ASCII-only. Windows PowerShell reads .ps1 as ANSI unless the file
# carries a BOM, and non-ASCII text would break parsing at load time.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$repositoryRoot = Split-Path -Parent $root
$xinchaoRoot = Join-Path $root "vendor\xinchao"
$memoryRoot = Join-Path $root "vendor\ombre-brain"
# In the published repository Dreamtrace lives in mengsu/, while the two
# services live alongside it at the repository root. Keep vendor/ as a local
# development fallback so the standalone workspace remains runnable.
if (-not (Test-Path -LiteralPath $xinchaoRoot)) { $xinchaoRoot = Join-Path $repositoryRoot "xinchao" }
if (-not (Test-Path -LiteralPath $memoryRoot)) { $memoryRoot = Join-Path $repositoryRoot "ombre-brain" }
$logs = Join-Path $root "data\logs"
New-Item -ItemType Directory -Force -Path $logs | Out-Null

if (-not (Test-Path -LiteralPath $PythonPath)) {
    Write-Host "[mengsu] Python not found: $PythonPath" -ForegroundColor Red
    exit 1
}

$envFile = Join-Path $root "private\.env"
if (-not (Test-Path -LiteralPath $envFile)) {
    Write-Host "[mengsu] missing private\.env - copy it from private\.env.example first" -ForegroundColor Yellow
}

& $PythonPath (Join-Path $root "scripts\ensure_xinchao_token.py") | Out-Null
& $PythonPath (Join-Path $root "scripts\ensure_memory_token.py") | Out-Null

$qwenConfig = @{}
if (Test-Path -LiteralPath $envFile) {
    foreach ($raw in (Get-Content -LiteralPath $envFile)) {
        if ($raw -match '^\s*(QWEN_API_KEY|DASHSCOPE_API_KEY|QWEN_BASE_URL|QWEN_MODEL)\s*=(.*)$') {
            $qwenConfig[$Matches[1]] = $Matches[2].Trim().Trim([char]34).Trim([char]39)
        }
    }
}
# Resolve Qwen credentials only. Never fall back to another provider's key.
$qwenKey = $env:QWEN_API_KEY
if (-not $qwenKey) { $qwenKey = $qwenConfig['QWEN_API_KEY'] }
if (-not $qwenKey) { $qwenKey = $env:DASHSCOPE_API_KEY }
if (-not $qwenKey) { $qwenKey = $qwenConfig['DASHSCOPE_API_KEY'] }
$qwenBaseUrl = $env:QWEN_BASE_URL
if (-not $qwenBaseUrl) { $qwenBaseUrl = $qwenConfig['QWEN_BASE_URL'] }
if (-not $qwenBaseUrl) { $qwenBaseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1' }
$qwenModel = $env:QWEN_MODEL
if (-not $qwenModel) { $qwenModel = $qwenConfig['QWEN_MODEL'] }
if (-not $qwenModel) { $qwenModel = 'qwen-plus' }

$xinchaoProcess = $null
$memoryProcess = $null

if (-not $NoXinchao) {
    $stateDir = Join-Path $root "data\xinchao"
    New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
    $env:PORT = "18110"
    $env:STATE_PATH = Join-Path $stateDir "state.json"
    $env:PERSONALITY_PATH = Join-Path $stateDir "personality.json"
    $env:TRANSITION_JOURNAL_PATH = Join-Path $stateDir "transitions.jsonl"
    $env:MODEL_ENABLED = "false"
    $env:DREAM_ENABLED = "false"
    $env:SERVICE_TOKEN = (Get-Content -LiteralPath (Join-Path $root "private\xinchao-token.txt") -Raw).Trim()

    $xinchaoProcess = Start-Process -FilePath $NodePath -ArgumentList "src/server.js" `
        -WorkingDirectory $xinchaoRoot -PassThru -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $logs "xinchao.out.log") `
        -RedirectStandardError (Join-Path $logs "xinchao.err.log")
    Write-Host "[mengsu] xinchao started, pid $($xinchaoProcess.Id)" -ForegroundColor Green
}

if (-not $NoMemory) {
    $memoryDir = Join-Path $root "data\memory"
    New-Item -ItemType Directory -Force -Path $memoryDir | Out-Null
    $env:OMBRE_CONFIG_PATH = Join-Path $memoryRoot "config.yaml"
    $env:OMBRE_VAULT_DIR = $memoryDir
    $env:OMBRE_PORT = "18001"
    $env:OMBRE_MCP_SERVICE_TOKEN = (Get-Content -LiteralPath (Join-Path $root "private\memory-token.txt") -Raw).Trim()
    $env:OMBRE_COMPRESS_API_KEY = $qwenKey
    $env:OMBRE_COMPRESS_BASE_URL = $qwenBaseUrl
    $env:OMBRE_COMPRESS_MODEL = $qwenModel

    $memoryProcess = Start-Process -FilePath $PythonPath -ArgumentList "src/server.py" `
        -WorkingDirectory $memoryRoot -PassThru -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $logs "memory.out.log") `
        -RedirectStandardError (Join-Path $logs "memory.err.log")
    Write-Host "[mengsu] memory service started, pid $($memoryProcess.Id)" -ForegroundColor Green
}

Start-Sleep -Seconds 3
Write-Host "[mengsu] open http://127.0.0.1:$Port/  (api docs at /docs)" -ForegroundColor Green

# 等接口起来后自动打开浏览器，省得手动输地址
Start-Job -ScriptBlock {
    param($url)
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Seconds 1
        try {
            $probe = Invoke-WebRequest -Uri $url -TimeoutSec 2 -UseBasicParsing
            if ($probe.StatusCode -eq 200) { break }
        } catch { }
    }
    Start-Process $url
} -ArgumentList "http://127.0.0.1:$Port/" | Out-Null

Push-Location (Join-Path $root "backend")
try {
    & $PythonPath -m uvicorn app.main:app --host 127.0.0.1 --port $Port
}
finally {
    Pop-Location
    foreach ($proc in @($memoryProcess, $xinchaoProcess)) {
        if ($proc -and -not $proc.HasExited) {
            Stop-Process -Id $proc.Id -Force
        }
    }
    Write-Host "[mengsu] background services stopped" -ForegroundColor Yellow
}
