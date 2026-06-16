$ErrorActionPreference = "Stop"

$agentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDir = Split-Path -Parent $agentDir
$defaultCodexAuthPath = Join-Path $env:USERPROFILE ".codex\auth.json"
$codexAuthPath = if ($env:CODEX_AUTH_PATH) { $env:CODEX_AUTH_PATH } else { $defaultCodexAuthPath }
$targetDir = if ($env:PI_NUTRITION_AGENT_DIR) {
  $env:PI_NUTRITION_AGENT_DIR
} else {
  Join-Path $agentDir ".pi-agent"
}
$targetAuthPath = Join-Path $targetDir "auth.json"

function ConvertFrom-Base64UrlJson {
  param([Parameter(Mandatory = $true)][string]$Value)

  $base64 = $Value.Replace("-", "+").Replace("_", "/")
  while ($base64.Length % 4 -ne 0) {
    $base64 += "="
  }

  $json = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($base64))
  return $json | ConvertFrom-Json
}

function Write-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Value
  )

  $encoding = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText($Path, $Value, $encoding)
}

if (!(Test-Path -LiteralPath $codexAuthPath)) {
  throw "Codex auth was not found: $codexAuthPath. Sign in to Codex first."
}

$codexAuth = Get-Content -LiteralPath $codexAuthPath -Raw -Encoding UTF8 | ConvertFrom-Json
$tokens = $codexAuth.tokens

if (!$tokens -or !$tokens.access_token -or !$tokens.refresh_token) {
  throw "Codex auth does not contain access_token or refresh_token. Refresh Codex sign-in first."
}

$accessToken = [string]$tokens.access_token
$jwtParts = $accessToken.Split(".")

if ($jwtParts.Count -ne 3) {
  throw "Codex access_token is not a JWT. Auth sync stopped."
}

$payload = ConvertFrom-Base64UrlJson -Value $jwtParts[1]

if (!$payload.exp) {
  throw "Codex access_token does not contain exp. Auth sync stopped."
}

$accountClaim = $payload."https://api.openai.com/auth"
$accountId = if ($accountClaim -and $accountClaim.chatgpt_account_id) {
  [string]$accountClaim.chatgpt_account_id
} elseif ($tokens.account_id) {
  [string]$tokens.account_id
} else {
  throw "Codex auth does not contain ChatGPT account id. Auth sync stopped."
}

$expires = [int64]$payload.exp * 1000
$expiresAt = [DateTimeOffset]::FromUnixTimeMilliseconds($expires).UtcDateTime

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

$next = [ordered]@{}
if (Test-Path -LiteralPath $targetAuthPath) {
  $existingRaw = Get-Content -LiteralPath $targetAuthPath -Raw -Encoding UTF8
  if ($existingRaw.Trim().Length -gt 0) {
    $existing = $existingRaw | ConvertFrom-Json
    foreach ($property in $existing.PSObject.Properties) {
      $next[$property.Name] = $property.Value
    }
  }
}

$next["openai-codex"] = [ordered]@{
  type = "oauth"
  access = $accessToken
  refresh = [string]$tokens.refresh_token
  expires = $expires
  accountId = $accountId
}

$json = ($next | ConvertTo-Json -Depth 12) + [Environment]::NewLine
Write-Utf8NoBom -Path $targetAuthPath -Value $json

Write-Output "Codex auth synced to the nutrition Pi agent."
Write-Output "File: $targetAuthPath"
Write-Output "Provider: openai-codex"
Write-Output "Valid until UTC: $($expiresAt.ToString('o'))"
