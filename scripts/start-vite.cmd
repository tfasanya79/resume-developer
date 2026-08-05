@echo off
setlocal
cd /d "%~dp0.."
set "NODE=%ProgramFiles%\nodejs\node.exe"
if not exist "%NODE%" set "NODE=node"
set "PATH=%USERPROFILE%\.cargo\bin;%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"

REM Free port 1420 if a previous Vite instance is still running
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":1420" ^| findstr "LISTENING"') do (
  taskkill /F /PID %%a >nul 2>&1
)

"%NODE%" "node_modules\vite\bin\vite.js"
exit /b %ERRORLEVEL%
