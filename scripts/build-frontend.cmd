@echo off
setlocal
cd /d "%~dp0.."
set "NODE=%ProgramFiles%\nodejs\node.exe"
if not exist "%NODE%" set "NODE=node"
set "PATH=%USERPROFILE%\.cargo\bin;%ProgramFiles%\nodejs;%APPDATA%\npm;%PATH%"
"%NODE%" "node_modules\typescript\bin\tsc"
if errorlevel 1 exit /b %ERRORLEVEL%
"%NODE%" "node_modules\vite\bin\vite.js" build
exit /b %ERRORLEVEL%
