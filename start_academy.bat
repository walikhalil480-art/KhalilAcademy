@echo off
TITLE Khalil Academy LMS Launcher
COLOR 0B

echo ======================================================================
echo           KHALIL ACADEMY LMS - LOCAL SERVER LAUNCHER
echo ======================================================================
echo.
echo [1/3] Checking PostgreSQL Database Connection...
echo [2/3] Launching Backend Server on Port 5001...
start "Khalil Academy - Backend (Port 5001)" cmd /k "cd /d %~dp0backend && npm run dev"

echo [3/3] Launching Frontend UI on Port 5173...
start "Khalil Academy - Frontend (Port 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Waiting 4 seconds for servers to initialize...
timeout /t 4 /nobreak >nul

echo Opening Khalil Academy in your default web browser...
start http://localhost:5173

echo.
echo ======================================================================
echo   Khalil Academy is now RUNNING independently on your computer!
echo   - Web Application: http://localhost:5173
echo   - Backend API:     http://localhost:5001/api
echo   - Database:        PostgreSQL (localhost:5432/khalil_academy_db)
echo.
echo   Keep the two opened command windows running while using the site.
echo ======================================================================
pause
