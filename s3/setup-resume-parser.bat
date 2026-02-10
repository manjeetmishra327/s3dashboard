@echo off
echo ========================================
echo Resume Parser Setup Script
echo ========================================
echo.

echo [1/4] Checking Python installation...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher from https://www.python.org/
    pause
    exit /b 1
)
echo Python found!
echo.

echo [2/4] Installing Python dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Python dependencies
    pause
    exit /b 1
)
echo Dependencies installed!
echo.

echo [3/4] Downloading spaCy English language model...
python -m spacy download en_core_web_sm
if %errorlevel% neq 0 (
    echo ERROR: Failed to download spaCy model
    pause
    exit /b 1
)
echo spaCy model downloaded!
echo.

echo [4/4] Creating temp directory...
if not exist "temp" mkdir temp
echo Temp directory created!
echo.

echo ========================================
echo Setup completed successfully!
echo ========================================
echo.
echo You can now run: npm run dev
echo.
pause
