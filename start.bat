@echo off
cd /d "%~dp0server"
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)
echo.
echo Seeding demo data...
call npm run seed
if errorlevel 1 pause & exit /b 1
echo.
echo Starting DoSJE Smart Monitoring...
call npm start
