param([string]$PythonPath = "", [int]$Port = 8000, [switch]$NoBrowser, [switch]$SetupOnly, [switch]$NoXinchao, [switch]$NoMemory)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$launcherArgs = @((Join-Path $root "scripts/launch.py"), '--port', [string]$Port)
if ($NoBrowser) { $launcherArgs += '--no-browser' }
if ($SetupOnly) { $launcherArgs += '--setup-only' }
if ($PythonPath) { & $PythonPath @launcherArgs }
elseif (Get-Command py -ErrorAction SilentlyContinue) { & py -3 @launcherArgs }
elseif (Get-Command python -ErrorAction SilentlyContinue) { & python @launcherArgs }
else { Write-Host 'Install Python 3.12 and Node.js LTS, then run start.cmd again.'; exit 1 }
exit $LASTEXITCODE
