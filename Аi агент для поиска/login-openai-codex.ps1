$ErrorActionPreference = "Stop"

$agentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$scriptPath = Join-Path $agentDir "login-openai-codex.sh"

& "C:\Program Files\Git\bin\bash.exe" $scriptPath
exit $LASTEXITCODE
