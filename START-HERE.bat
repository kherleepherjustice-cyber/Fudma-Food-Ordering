@echo off
title FUDMA Food Ordering System
echo ============================================
echo   FUDMA Food Ordering - Starting...
echo ============================================
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js is not installed. Download it from https://nodejs.org ^(click the LTS button^),
  echo install it, then double-click this file again.
  pause
  exit /b
)
if not exist node_modules (
  echo Installing, please wait about 30 seconds...
  call npm install
)
start "" http://localhost:3000
call npm start
pause
