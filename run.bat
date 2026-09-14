@echo off
setlocal

set "SOURCE_DIR=%~dp0"
set "SOURCE_DIR=%SOURCE_DIR:\=\%"

set "TARGET_DIR=%TEMP%\GameTheorySim"
if exist "%TARGET_DIR%" rmdir /s /q "%TARGET_DIR%"
mkdir "%TARGET_DIR%"

echo Copying files...
xcopy "%SOURCE_DIR%*" "%TARGET_DIR%\" /E /I /Y /Q

echo Starting Game Theory Simulation on http://localhost:8081
echo Press Ctrl+C to stop
echo.

powershell -Command "Start-Process cmd -ArgumentList '/c python -m http.server 8081' -WorkingDirectory '%TARGET_DIR%'"
timeout /t 2 >nul
start "" http://localhost:8081