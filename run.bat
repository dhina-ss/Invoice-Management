@echo off
title Bill Generator
echo Starting Bill Generator Server...
cd /d "%~dp0backend"
env\Scripts\python.exe main.py
if %ERRORLEVEL% neq 0 (
    echo.
    echo Error: Failed to start the server. Make sure Python is installed and the virtual environment is set up.
    pause
)
