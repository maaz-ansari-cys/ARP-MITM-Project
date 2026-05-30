@echo off
REM Setup script for Windows

echo Creating Python virtual environment...
python -m venv venv

echo.
echo Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Installing dependencies...
pip install -r requirements.txt

echo.
echo Setup complete!
echo.
echo To activate the virtual environment in the future, run:
echo   venv\Scripts\activate.bat
echo.
echo To start the service (requires Administrator privileges):
echo   python main.py
echo.
pause
