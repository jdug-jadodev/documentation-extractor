@echo off
setlocal
cd /d "%~dp0"
call npm.cmd start
set "DOCSYS_EXIT=%ERRORLEVEL%"
if not "%DOCSYS_EXIT%"=="0" pause
exit /b %DOCSYS_EXIT%
