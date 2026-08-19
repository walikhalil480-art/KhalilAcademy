Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "          KHALIL ACADEMY LMS - LOCAL SERVER LAUNCHER" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "[1/3] Starting Backend Server (Port 5001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$Root\backend'; npm run dev"

Write-Host "[2/3] Starting Frontend Application (Port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$Root\frontend'; npm run dev"

Write-Host "[3/3] Waiting 4 seconds for services to initialize..." -ForegroundColor Green
Start-Sleep -Seconds 4

Write-Host "Opening http://localhost:5173 in browser..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "  Khalil Academy is now running live on your computer!" -ForegroundColor Green
Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  - Backend:  http://localhost:5001/api" -ForegroundColor White
Write-Host "  - Database: PostgreSQL on localhost:5432 (khalil_academy_db)" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Green
