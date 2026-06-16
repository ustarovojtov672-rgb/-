$ErrorActionPreference = "Stop"

$agentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$scriptPath = Join-Path $agentDir "run-search-agent.sh"

& "C:\Program Files\Git\bin\bash.exe" $scriptPath @args
exit $LASTEXITCODE
