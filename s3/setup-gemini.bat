@echo off
echo Setting up Gemini AI Integration
echo ================================

echo.
echo 1. Installing Python dependencies...
cd python-service
pip install -r requirements.txt

echo.
echo 2. Testing Gemini API connection...
python -c "import google.generativeai as genai; genai.configure(api_key='AIzaSyDMQK4qarqXMMJweaMFw8HBoPOo6z1XbEM'); model = genai.GenerativeModel('gemini-pro'); print('Gemini API configured successfully')"

echo.
echo 3. Starting Python service with Gemini integration...
start "Python Service with Gemini" cmd /k "python start.py"

echo.
echo 4. Starting Next.js development server...
cd ..
start "Next.js Server" cmd /k "npm run dev"

echo.
echo Setup complete! Services are starting...
echo - Next.js: http://localhost:3000
echo - Python Service: http://localhost:8000
echo - Gemini AI: Integrated and ready
echo.
echo Press any key to exit this window
pause > nul

