@echo off
setlocal
cd /d "%~dp0"
title Crypt of Ashes

echo Starting Crypt of Ashes...

REM Reuse an already running game server.
curl -fsS -o nul http://localhost:3000
if not errorlevel 1 goto open_game

REM Start Vite in a separate minimized window.
start "Crypt of Ashes Server" /min cmd /c "npm run dev"

REM Wait up to 30 seconds for Vite to become available.
set /a attempts=0
:wait_server
timeout /t 1 /nobreak >nul
curl -fsS -o nul http://localhost:3000
if not errorlevel 1 goto open_game
set /a attempts+=1
if %attempts% LSS 30 goto wait_server

echo Could not start the game server. Make sure Node.js and npm are installed.
pause
exit /b 1

:open_game
echo Opening game window...
set "GAME_URL=http://localhost:3000"
set "BROWSER_EXE="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER_EXE if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER_EXE if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "BROWSER_EXE=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if defined BROWSER_EXE (
    start "Crypt of Ashes" "%BROWSER_EXE%" --app=%GAME_URL% --new-window --window-size=1280,800
) else (
    start "" msedge --app=%GAME_URL% --new-window --window-size=1280,800
)
exit /b 0
