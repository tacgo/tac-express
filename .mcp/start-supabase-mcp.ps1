#!/usr/bin/env pwsh
Param()

# start-supabase-mcp.ps1
# Loads SBP_MCP_ACCESS_TOKEN from environment or .env and runs the
# Supabase MCP server via npx.
#
# History (issue #29): this script previously assumed an
# `mcp-server-supabase.cmd` binary existed at `node_modules\.bin\` --
# but @supabase/mcp-server-supabase never shipped a .cmd entrypoint.
# Test-Path always returned false and the script exited 3 on every
# invocation, including --check.
#
# The supported invocation per Supabase docs is npx-based:
#   npx -y @supabase/mcp-server-supabase@latest --access-token=<token>
# This script wraps that, adding env/.env token loading and the
# --check sub-command for quick health verification.

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $scriptDir ".env"

# Token resolution: env var first, then .env file (stripped of quotes).
$token = $env:SBP_MCP_ACCESS_TOKEN

if (-not $token -and (Test-Path $envFile)) {
    foreach ($line in Get-Content $envFile) {
        if ($line -match '^\s*SBP_MCP_ACCESS_TOKEN\s*=\s*(.+)\s*$') {
            # Trim whitespace then strip optional surrounding quotes --
            # users sometimes write SBP_MCP_ACCESS_TOKEN="foo" with
            # quotes carried over from .env.example.
            $token = $Matches[1].Trim().Trim('"').Trim("'")
            break
        }
    }
}

# `--check` mode: verify the token is loaded + npx is reachable, then
# exit. Used by smoke-test scripts and IDE-side preflight checks.
if ($args -contains "--check") {
    Write-Host "tokenPresent:" ([string]::IsNullOrEmpty($token) -eq $false)
    if (-not [string]::IsNullOrEmpty($token)) {
        Write-Host "tokenPreview:" ($token -replace '(.{8}).+','${1}...')
    }
    $npxCommand = Get-Command npx -ErrorAction SilentlyContinue
    if (-not $npxCommand) {
        Write-Host "npx: missing -- install Node.js to provide it"
        exit 3
    }
    Write-Host "npx:" $npxCommand.Source
    Write-Host "transport: npx -y @supabase/mcp-server-supabase@latest"
    exit 0
}

if (-not $token) {
    Write-Error "Supabase access token not found. Set environment variable SBP_MCP_ACCESS_TOKEN or add it to $envFile"
    exit 2
}

# Feature set requested for the MCP server. Mirrors the Supabase
# default plus branching and debugging which are useful in dev.
$features = "account,database,functions,storage,branching,debugging"

# Invoke via npx. The `-y` flag skips the install-prompt; the
# `@latest` tag ensures we get the freshest release without needing
# to bump a version pin in this repo. Output streams through to the
# MCP host (Claude Desktop / Claude Code / Cursor / etc.).
& npx -y "@supabase/mcp-server-supabase@latest" --access-token=$token --features=$features

$exitCode = $LASTEXITCODE
if ($null -eq $exitCode) { $exitCode = 0 }
exit $exitCode
