#!/usr/bin/env pwsh
<#
PowerShell script to install backend and widget modules and run them.
This script is intended to be run from PowerShell on Windows.

If you're in Git Bash or another POSIX shell, use the included `run-all.bat`
or run PowerShell explicitly:

  powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\run-all.ps1

Behavior:
- Ensures backend `.env` exists (will copy from `.env.example` if present).
- Installs backend deps (npm or pip) and starts the backend in background.
- Installs `apsara-widget-app` deps and launches Electron (or `npm start`).

#>

Param()

function Ensure-EnvFile {
    param(
        [string]$Dir
    )
    $envPath = Join-Path $Dir '.env'
    $envExample = Join-Path $Dir '.env.example'
    if (-not (Test-Path $envPath)) {
        if (Test-Path $envExample) {
            Write-Host "'.env' not found in $Dir. Copying from .env.example..."
            Copy-Item -Path $envExample -Destination $envPath -Force
            Write-Host "Copied $envExample -> $envPath. Please review and update any secrets/keys if needed."
        } else {
            Write-Host "ERROR: .env not found and no .env.example present in $Dir. Create .env before continuing." -ForegroundColor Red
            throw "Missing .env"
        }
    } else {
        Write-Host ".env found in $Dir"
    }
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
# Prefer explicit backend and widget folders if present
if (Test-Path (Join-Path $ScriptDir 'backend')) { $BackDir = Join-Path $ScriptDir 'backend' } else { $BackDir = $ScriptDir }
if (Test-Path (Join-Path $ScriptDir 'apsara-widget-app')) { $WidgetDir = Join-Path $ScriptDir 'apsara-widget-app' } else { $WidgetDir = Join-Path $ScriptDir '..' }

Write-Host "Running install+start helper (PowerShell)"
Write-Host "Backend dir: $BackDir"
Write-Host "Widget dir:  $WidgetDir"

try {
    Ensure-EnvFile -Dir $BackDir
} catch {
    Write-Host "Aborting due to missing .env" -ForegroundColor Red
    exit 2
}

# --- Backend: install & run ---
if (Test-Path (Join-Path $BackDir 'package.json')) {
    Write-Host "Detected Node backend (package.json). Installing..."
    Push-Location $BackDir
    npm install
    Pop-Location

    Write-Host "Starting backend (npm run start) in background. Logs: $BackDir\back.log"
    # Use npm.cmd on Windows to avoid "not a valid Win32 application" when invoking npm from Start-Process
    $npmExe = Join-Path ${env:AppData} 'npm\npm.cmd'
    if (-not (Test-Path $npmExe)) { $npmExe = 'npm.cmd' }
    Start-Process -FilePath $npmExe -ArgumentList 'run','start','--prefix',$BackDir -WindowStyle Hidden -RedirectStandardOutput "$BackDir\back.log" -RedirectStandardError "$BackDir\back.err"

} elseif (Test-Path (Join-Path $BackDir 'requirements.txt')) {
    Write-Host "Detected Python backend (requirements.txt). Setting up venv and installing..."
    & python -m venv (Join-Path $BackDir '.venv')
    $activate = Join-Path $BackDir '.venv\Scripts\Activate.ps1'
    if (Test-Path $activate) {
        & $activate
    }
    pip install --upgrade pip
    pip install -r (Join-Path $BackDir 'requirements.txt')

    # Try common entrypoints
    $entry = if (Test-Path (Join-Path $BackDir 'app.py')) { 'app.py' } elseif (Test-Path (Join-Path $BackDir 'server.py')) { 'server.py' } elseif (Test-Path (Join-Path $BackDir 'main.py')) { 'main.py' } else { '' }

    if ($entry -ne '') {
        Write-Host "Starting Python backend ($entry) in background. Logs: $BackDir\back.log"
        Start-Process -FilePath python -ArgumentList (Join-Path $BackDir $entry) -WindowStyle Hidden -RedirectStandardOutput "$BackDir\back.log" -RedirectStandardError "$BackDir\back.err"
    } else {
        Write-Host "No obvious Python entrypoint found (app.py/server.py/main.py). Start your backend manually after install." -ForegroundColor Yellow
    }

} else {
    Write-Host "No package.json or requirements.txt found in $BackDir. Skipping backend install/start." -ForegroundColor Yellow
}

# --- Widget (frontend / electron) install & run ---
if (Test-Path (Join-Path $WidgetDir 'package.json')) {
    Write-Host "Installing widget (frontend) modules..."
    Push-Location $WidgetDir
    npm install
    Pop-Location

    # Prefer electron script if present
    try {
        $pkg = Get-Content (Join-Path $WidgetDir 'package.json') -Raw | ConvertFrom-Json
    } catch {
        $pkg = $null
    }

    if ($pkg -and $pkg.scripts) {
        $scriptNames = $pkg.scripts.PSObject.Properties.Name
        $npmExe = Join-Path ${env:AppData} 'npm\npm.cmd'
        if (-not (Test-Path $npmExe)) { $npmExe = 'npm.cmd' }

        if ($scriptNames -contains 'electron') {
            Write-Host "Running 'npm run electron'..."
            Start-Process -FilePath $npmExe -ArgumentList 'run','electron','--prefix',$WidgetDir -NoNewWindow -Wait
        } elseif ($scriptNames -contains 'start') {
            Write-Host "Running 'npm run start'..."
            Start-Process -FilePath $npmExe -ArgumentList 'run','start','--prefix',$WidgetDir -NoNewWindow -Wait
        } else {
            Write-Host "No start/electron script found in $WidgetDir\package.json. Skipping run." -ForegroundColor Yellow
        }
    } else {
        Write-Host "No start/electron script found in $WidgetDir\package.json. Skipping run." -ForegroundColor Yellow
    }
} else {
    Write-Host "No package.json in widget dir ($WidgetDir). Cannot install/start widget." -ForegroundColor Yellow
}

Write-Host "Done. If something failed, check the log files in the backend folder (back.log/back.err)."
