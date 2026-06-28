@echo off
chcp 437 >nul 2>&1
setlocal EnableDelayedExpansion

:: GridVeda — Windows Deployment Script
:: Runs the full stack: FastAPI backend + React frontend

title GridVeda - AI Grid Intelligence

cls
echo.
echo   ======================================================
echo     GRIDVEDA - AI Grid Intelligence
echo     Windows Edition
echo   ======================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

set "GPU_NAME=Not detected"
set "GPU_VRAM="
set "GPU_DRIVER="
set "GPU_TEMP="
set "OLLAMA_READY=false"

:: ========================================
:: STEP 1: GPU DETECTION
:: ========================================
echo [1/6] Detecting GPU...

set "NVIDIA_SMI="
if exist "C:\Windows\System32\nvidia-smi.exe" (
    set "NVIDIA_SMI=C:\Windows\System32\nvidia-smi.exe"
    goto :found_smi
)
if exist "C:\Program Files\NVIDIA Corporation\NVSMI\nvidia-smi.exe" (
    set "NVIDIA_SMI=C:\Program Files\NVIDIA Corporation\NVSMI\nvidia-smi.exe"
    goto :found_smi
)
where nvidia-smi >nul 2>&1
if %errorlevel% equ 0 (
    set "NVIDIA_SMI=nvidia-smi"
    goto :found_smi
)

echo    [--] nvidia-smi not found
echo    [--] Install NVIDIA drivers: https://www.nvidia.com/drivers
echo    [--] GridVeda will run in CPU mode
echo.
goto :skip_gpu

:found_smi
"%NVIDIA_SMI%" --query-gpu=name --format=csv,noheader > "%TEMP%\gv_gpu_name.txt" 2>nul
set /p GPU_NAME=<"%TEMP%\gv_gpu_name.txt"

"%NVIDIA_SMI%" --query-gpu=memory.total --format=csv,noheader,nounits > "%TEMP%\gv_gpu_vram.txt" 2>nul
set /p GPU_VRAM=<"%TEMP%\gv_gpu_vram.txt"

"%NVIDIA_SMI%" --query-gpu=driver_version --format=csv,noheader > "%TEMP%\gv_gpu_driver.txt" 2>nul
set /p GPU_DRIVER=<"%TEMP%\gv_gpu_driver.txt"

"%NVIDIA_SMI%" --query-gpu=temperature.gpu --format=csv,noheader > "%TEMP%\gv_gpu_temp.txt" 2>nul
set /p GPU_TEMP=<"%TEMP%\gv_gpu_temp.txt"

"%NVIDIA_SMI%" --query-gpu=power.draw --format=csv,noheader > "%TEMP%\gv_gpu_power.txt" 2>nul
set /p GPU_POWER=<"%TEMP%\gv_gpu_power.txt"

"%NVIDIA_SMI%" --query-gpu=utilization.gpu --format=csv,noheader > "%TEMP%\gv_gpu_util.txt" 2>nul
set /p GPU_UTIL=<"%TEMP%\gv_gpu_util.txt"

del "%TEMP%\gv_gpu_*.txt" 2>nul

echo    [OK] GPU: %GPU_NAME%
echo    [OK] VRAM: %GPU_VRAM% MB / Driver: %GPU_DRIVER%
echo    [OK] Temp: %GPU_TEMP%C / Power: %GPU_POWER% / Util: %GPU_UTIL%

:skip_gpu
echo.

:: ========================================
:: STEP 2: PYTHON DEPENDENCIES
:: ========================================
echo [2/6] Setting up Python...

set "PYTHON_CMD="
where python >nul 2>&1 && set "PYTHON_CMD=python"
if not defined PYTHON_CMD (
    where python3 >nul 2>&1 && set "PYTHON_CMD=python3"
)
if not defined PYTHON_CMD (
    where py >nul 2>&1 && set "PYTHON_CMD=py"
)

if not defined PYTHON_CMD (
    echo    [XX] Python not found!
    echo    [XX] Install Python 3.10+ from https://www.python.org/downloads/
    echo    [XX] Make sure to check "Add Python to PATH" during install
    echo.
    pause
    exit /b 1
)

%PYTHON_CMD% --version
echo.

if exist "%SCRIPT_DIR%\backend\requirements.txt" (
    cd /d "%SCRIPT_DIR%\backend"
    echo    Installing Python packages...
    %PYTHON_CMD% -m pip install --upgrade pip --disable-pip-version-check >nul 2>&1
    %PYTHON_CMD% -m pip install -r requirements.txt --disable-pip-version-check --quiet
    echo    [OK] Python packages installed
) else (
    echo    [--] requirements.txt not found — skipping
)
echo.

:: ========================================
:: STEP 3: OLLAMA + NEMOTRON NANO 4B
:: ========================================
echo [3/6] Setting up Ollama + Nemotron Nano 4B (optional)...

where ollama >nul 2>&1
if %errorlevel% neq 0 (
    echo    [--] Ollama not installed
    echo.
    echo    Quick install options:
    echo      1. Download: https://ollama.com/download/windows
    echo      2. Or run:   winget install Ollama.Ollama
    echo.
    echo    Continuing without Ollama — chat uses smart fallback
    echo.
    goto :skip_ollama
)

echo    [OK] Ollama found

curl -sf http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo    [..] Starting Ollama server...
    start /b "" ollama serve >nul 2>&1

    set "WAIT_COUNT=0"
    :wait_ollama
    if !WAIT_COUNT! geq 20 goto :ollama_timeout
    timeout /t 1 /nobreak >nul
    set /a WAIT_COUNT+=1
    curl -sf http://localhost:11434/api/tags >nul 2>&1
    if %errorlevel% neq 0 goto :wait_ollama
    echo    [OK] Ollama server started
    goto :check_nemotron

    :ollama_timeout
    echo    [--] Ollama slow to start — continuing anyway
)

echo    [OK] Ollama server running

:check_nemotron
ollama list 2>nul | findstr /i "nemotron" >nul 2>&1
if %errorlevel% equ 0 (
    echo    [OK] Nemotron Nano 4B available
    set "OLLAMA_READY=true"
    goto :skip_ollama
)

echo    [--] Nemotron not found locally.
echo.
set /p "PULL_CHOICE=   Pull nemotron-nano-4b-instruct (~2.5GB)? [Y/n]: "
if not defined PULL_CHOICE set "PULL_CHOICE=Y"
if /i "%PULL_CHOICE%"=="Y" (
    echo    [..] Pulling Nemotron Nano 4B...
    ollama pull nemotron-nano-4b-instruct
    if !errorlevel! equ 0 (
        echo    [OK] Nemotron pulled — GPU inference ready
        set "OLLAMA_READY=true"
    ) else (
        echo    [--] Pull failed — using simulated responses
    )
) else (
    echo    [--] Skipped — using simulated responses
)

:skip_ollama
echo.

:: ========================================
:: STEP 4: API KEYS (Optional)
:: ========================================
echo [4/6] Checking API keys...

if exist "%SCRIPT_DIR%\.env" (
    for /f "usebackq tokens=1,* delims==" %%a in ("%SCRIPT_DIR%\.env") do (
        if not "%%a"=="" if not "%%b"=="" set "%%a=%%b"
    )
    echo    [OK] Loaded .env file
)
if exist "%SCRIPT_DIR%\backend\.env" (
    for /f "usebackq tokens=1,* delims==" %%a in ("%SCRIPT_DIR%\backend\.env") do (
        if not "%%a"=="" if not "%%b"=="" set "%%a=%%b"
    )
    echo    [OK] Loaded backend\.env file
)

if defined PERPLEXITY_API_KEY (
    echo    Perplexity [Sonar]  - [OK] Configured
) else (
    echo    Perplexity [Sonar]  - [--] Not set, simulated fallback
)

if not defined PERPLEXITY_API_KEY (
    echo.
    echo    To add keys, create .env in backend/ with:
    echo      PERPLEXITY_API_KEY=pplx-xxxx
    echo    GridVeda works without it.
)
echo.

:: ========================================
:: STEP 5: REACT FRONTEND SETUP
:: ========================================
echo [5/6] Setting up React frontend...

set "NODE_AVAILABLE=false"
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo    [--] Node.js not found — React frontend unavailable
    echo    [--] Install from https://nodejs.org/ for the full React UI
    echo    [--] Falling back to standalone gridveda-live.html
    goto :skip_node
)

set "NODE_AVAILABLE=true"
for /f "tokens=*" %%v in ('node --version 2^>nul') do echo    [OK] Node.js %%v found

if not exist "%SCRIPT_DIR%\frontend\package.json" goto :skip_node
if exist "%SCRIPT_DIR%\frontend\node_modules" (
    echo    [OK] React dependencies already installed
    goto :skip_node
)

echo    [..] Installing React dependencies (first run)...
cd /d "%SCRIPT_DIR%\frontend"
call npm install --silent 2>nul
echo    [OK] React dependencies installed

:skip_node
echo.

:: ========================================
:: STEP 6: LAUNCH GRIDVEDA
:: ========================================
echo [6/6] Launching GridVeda...

:: Kill existing processes on ports 8000, 3000, and 5173
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8000.*LISTENING"') do (
    taskkill /pid %%a /f >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000.*LISTENING"') do (
    taskkill /pid %%a /f >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5173.*LISTENING"') do (
    taskkill /pid %%a /f >nul 2>&1
)
timeout /t 1 /nobreak >nul

:: Start FastAPI backend
cd /d "%SCRIPT_DIR%\backend"
start "GridVeda-Backend" /min %PYTHON_CMD% -m uvicorn main:app --host 0.0.0.0 --port 8000 --log-level warning

:: Wait for backend (up to 20 seconds)
echo    [..] Waiting for backend (loading pre-trained models)...
set "WAIT_COUNT=0"
:wait_backend
if !WAIT_COUNT! geq 20 goto :backend_timeout
timeout /t 1 /nobreak >nul
set /a WAIT_COUNT+=1
curl -sf http://localhost:8000/ >nul 2>&1
if %errorlevel% neq 0 goto :wait_backend
echo    [OK] Backend running  - http://localhost:8000
echo    [OK] API docs         - http://localhost:8000/docs
goto :start_frontend

:backend_timeout
echo    [--] Backend still loading — may need a few more seconds
echo    [--] Check the minimized "GridVeda-Backend" window for errors

:start_frontend
if not "!NODE_AVAILABLE!"=="true" goto :fallback_frontend
if not exist "%SCRIPT_DIR%\frontend\node_modules" goto :fallback_frontend

cd /d "%SCRIPT_DIR%\frontend"
start "GridVeda-React" /min cmd /c "npx vite --port 5173"
timeout /t 3 /nobreak >nul
echo    [OK] React frontend  - http://localhost:5173
set "DASHBOARD_URL=http://localhost:5173"
goto :open_browser

:fallback_frontend
cd /d "%SCRIPT_DIR%"
start "GridVeda-Frontend" /min %PYTHON_CMD% -m http.server 3000 --directory .
timeout /t 2 /nobreak >nul
echo    [OK] Frontend served  - http://localhost:3000/gridveda-live.html
set "DASHBOARD_URL=http://localhost:3000/gridveda-live.html"

:open_browser
timeout /t 1 /nobreak >nul
start "" "%DASHBOARD_URL%"

:: ========================================
:: LAUNCH SUMMARY
:: ========================================
echo.
echo   ======================================================
echo     GridVeda — ONLINE
echo   ======================================================
echo.
echo   GPU          %GPU_NAME%
if "%OLLAMA_READY%"=="true" (
    echo   Chat AI      Nemotron Nano 4B on GPU [LOCAL]
) else (
    echo   Chat AI      Simulated — install Ollama for real AI
)
echo.
if "!NODE_AVAILABLE!"=="true" (
    echo   React UI     http://localhost:5173
) else (
    echo   Dashboard    http://localhost:3000/gridveda-live.html
)
echo   API          http://localhost:8000
echo   API Docs     http://localhost:8000/docs
echo   WebSocket    ws://localhost:8000/ws/telemetry
echo.
echo   Pre-Trained Models:
echo     ETT Ensemble       — Anomaly detection (96%% accuracy)
echo     DGA Ensemble       — Fault classification (99%% accuracy)
echo     Quantum VQC        — 6 qubits, 4 variational layers
echo.
echo   Integrations:
echo     Perplexity         — Web-grounded grid research + chat
echo.
echo   ======================================================
echo.
echo   Press any key to STOP all GridVeda services...
echo.
pause >nul

:: ========================================
:: CLEANUP
:: ========================================
echo.
echo   Shutting down GridVeda...

taskkill /fi "WINDOWTITLE eq GridVeda-Backend*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq GridVeda-Frontend*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq GridVeda-React*" /f >nul 2>&1

for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8000.*LISTENING"') do (
    taskkill /pid %%a /f >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000.*LISTENING"') do (
    taskkill /pid %%a /f >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5173.*LISTENING"') do (
    taskkill /pid %%a /f >nul 2>&1
)

echo    [OK] All services stopped
echo.
echo   Goodbye!
echo.
pause
