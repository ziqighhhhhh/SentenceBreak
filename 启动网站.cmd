@echo off
setlocal

cd /d "%~dp0"

if not exist ".env" (
  echo [ERROR] Missing .env file. Create it from .env.example first.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

echo Starting backend API on http://localhost:8787 ...
start "SentenceBreak API" /D "%~dp0" cmd /k "npm run dev:api"

timeout /t 2 /nobreak >nul

echo Starting frontend on http://localhost:3000 ...
start "SentenceBreak Web" /D "%~dp0" cmd /k "npm run dev"

echo.
echo Open this URL in your browser:
echo http://localhost:3000
echo.
echo Close the two opened command windows to stop the website.
pause
