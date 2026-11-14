@echo off
title CampusConnect Server
echo ========================================================
echo Starting CampusConnect Student Management Portal...
echo ========================================================
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
    set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.20.0-win-x64;%PATH%"
)

start "" http://localhost:8080
node server.js
pause
