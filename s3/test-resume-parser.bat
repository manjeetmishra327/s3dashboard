@echo off
echo ========================================
echo Testing Resume Parser
echo ========================================
echo.

echo Testing Python script directly...
echo.

if not exist "services\resume_parser.py" (
    echo ERROR: resume_parser.py not found in services directory
    pause
    exit /b 1
)

echo Creating a test text file...
echo Sample Resume > temp\test-resume.txt
echo John Doe >> temp\test-resume.txt
echo Email: john.doe@example.com >> temp\test-resume.txt
echo Phone: +1234567890 >> temp\test-resume.txt
echo. >> temp\test-resume.txt
echo Skills: Python, JavaScript, React, Node.js, SQL >> temp\test-resume.txt
echo. >> temp\test-resume.txt
echo Experience: >> temp\test-resume.txt
echo Software Engineer at Tech Company (2020-2023) >> temp\test-resume.txt
echo. >> temp\test-resume.txt
echo Education: >> temp\test-resume.txt
echo Bachelor of Science in Computer Science >> temp\test-resume.txt

echo.
echo Running parser on test file...
python services\resume_parser.py temp\test-resume.txt

echo.
echo ========================================
echo Test completed!
echo ========================================
echo.
pause
