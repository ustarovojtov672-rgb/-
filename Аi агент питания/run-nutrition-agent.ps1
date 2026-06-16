$ErrorActionPreference = "Stop"

$agentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$scriptPath = Join-Path $agentDir "run-nutrition-agent.sh"

& "C:\Program Files\Git\bin\bash.exe" $scriptPath @args
exit $LASTEXITCODE
