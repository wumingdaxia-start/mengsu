param([int[]]$Ports = @(8000, 18110, 18001, 3001))

# ASCII-only file, same reason as start.ps1.

$ErrorActionPreference = "Stop"

foreach ($port in $Ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if (-not $connections) {
        Write-Host "[mengsu] port $port already free"
        continue
    }
    foreach ($processId in ($connections.OwningProcess | Select-Object -Unique)) {
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($process) {
            Stop-Process -Id $processId -Force
            Write-Host "[mengsu] stopped $($process.ProcessName) on port $port (pid $processId)"
        }
    }
}

Write-Host "[mengsu] done"
