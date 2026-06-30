@echo off
echo ============================================================
echo  NEM Bid Analyser — Starting up
echo ============================================================
echo.

:: Check Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found.
    echo Please install Python 3.11+ from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)

:: Install Python dependencies if needed
echo Checking Python dependencies...
cd backend
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo ERROR: Failed to install Python dependencies.
    pause
    exit /b 1
)

:: Check for .env file
if not exist ".env" (
    echo.
    echo WARNING: No .env file found in backend\ folder.
    echo Copy backend\.env.example to backend\.env and add your ANTHROPIC_API_KEY.
    echo The app will work without it, but AI narratives will be disabled.
    echo.
)

echo Starting Python backend on http://localhost:8000 ...
start "NEM Backend" cmd /k "python main.py"
cd ..

:: Wait for backend to start
timeout /t 3 /nobreak >nul

:: Install Node dependencies if needed
if not exist "node_modules" (
    echo Installing Node.js dependencies...
    call npm install
)

echo Starting React frontend on http://localhost:5173 ...
start "NEM Frontend" cmd /k "npm run dev"

echo.
echo ============================================================
echo  Both servers are starting up.
echo  Open http://localhost:5173 in your browser.
echo  (Allow 10-15 seconds for the first data sync to begin)
echo ============================================================
echo.
pause
