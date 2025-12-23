@echo off
REM Windows wrapper to run the PowerShell helper in this repo.
REM Usage: double-click or run from Git Bash / cmd.exe

SETLOCAL
SET SCRIPT_DIR=%~dp0
REM Execute the PowerShell script with Bypass execution policy
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-all.ps1"
ENDLOCAL
