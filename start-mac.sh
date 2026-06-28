#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════
# GridVeda — macOS Development Script (Apple Silicon)
# Runs the full stack: FastAPI backend + React frontend
# Pre-trained models load via joblib — optimized for Apple Silicon
# ════════════════════════════════════════════════════════════════
set -e

# ─── Colors ───
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

clear
echo ""
echo -e "${CYAN}${BOLD}"
echo "   ██████╗ ██████╗ ██╗██████╗ ██╗   ██╗███████╗██████╗  █████╗ "
echo "  ██╔════╝ ██╔══██╗██║██╔══██╗██║   ██║██╔════╝██╔══██╗██╔══██╗"
echo "  ██║  ███╗██████╔╝██║██║  ██║██║   ██║█████╗  ██║  ██║███████║"
echo "  ██║   ██║██╔══██╗██║██║  ██║╚██╗ ██╔╝██╔══╝  ██║  ██║██╔══██║"
echo "  ╚██████╔╝██║  ██║██║██████╔╝ ╚████╔╝ ███████╗██████╔╝██║  ██║"
echo "   ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝   ╚═══╝  ╚══════╝╚═════╝ ╚═╝  ╚═╝"
echo -e "${NC}"
echo -e "${BOLD}  AI Grid Intelligence${NC}"
echo -e "${DIM}  Apple Silicon Edition${NC}"
echo -e "${CYAN}  ════════════════════════════════════════════════════════${NC}"
echo ""

# ════════════════════════════════════════
# STEP 1: APPLE SILICON DETECTION + PYTHON
# ════════════════════════════════════════
echo -e "${YELLOW}[1/5] Detecting Apple Silicon + Python...${NC}"
cd "${SCRIPT_DIR}/backend"

# ─── Detect Apple Silicon chip ───
ARCH=$(uname -m)
CHIP_NAME="Unknown"
CHIP_CORES=""
PERF_CORES=""
EFF_CORES=""
GPU_CORES=""
NEURAL_ENGINE=""
RAM_GB=""

if [ "$ARCH" = "arm64" ]; then
    CHIP_NAME=$(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo "Apple Silicon")

    TOTAL_CORES=$(sysctl -n hw.ncpu 2>/dev/null || echo "?")
    PERF_CORES=$(sysctl -n hw.perflevel0.logicalcpu 2>/dev/null || echo "?")
    EFF_CORES=$(sysctl -n hw.perflevel1.logicalcpu 2>/dev/null || echo "?")

    GPU_CORES=$(system_profiler SPDisplaysDataType 2>/dev/null | grep "Total Number of Cores" | awk -F': ' '{print $2}' | head -1)
    [ -z "$GPU_CORES" ] && GPU_CORES="?"

    NEURAL_ENGINE="16-core"

    RAM_BYTES=$(sysctl -n hw.memsize 2>/dev/null || echo "0")
    RAM_GB=$((RAM_BYTES / 1073741824))

    echo -e "${GREEN}   + ${CHIP_NAME}${NC}"
    echo -e "${GREEN}     ${PERF_CORES}P + ${EFF_CORES}E CPU cores / ${GPU_CORES}-core GPU / ${NEURAL_ENGINE} Neural Engine${NC}"
    echo -e "${GREEN}     ${RAM_GB} GB unified memory${NC}"

    # Apple Accelerate Framework optimization
    export VECLIB_MAXIMUM_THREADS="${TOTAL_CORES}"
    export OMP_NUM_THREADS="${PERF_CORES}"
    export OPENBLAS_NUM_THREADS="${PERF_CORES}"
    echo -e "${GREEN}   + Accelerate framework — ${PERF_CORES} performance threads${NC}"
else
    echo -e "${YELLOW}   ! Intel Mac detected (${ARCH}) — no Apple Silicon acceleration${NC}"
fi

# ─── Python ───
# Prefer Anaconda/Miniconda Python (has ML packages pre-installed and writable pip)
# over Homebrew Python 3.14 (externally-managed, blocks pip install)
PYTHON_CMD=""
for candidate in \
    "$HOME/anaconda3/bin/python3" \
    "$HOME/miniconda3/bin/python3" \
    "$HOME/miniforge3/bin/python3" \
    "/opt/anaconda3/bin/python3" \
    "$(command -v python3 2>/dev/null)" \
    "$(command -v python 2>/dev/null)"; do
    if [ -n "$candidate" ] && [ -x "$candidate" ]; then
        if "$candidate" -m pip --version > /dev/null 2>&1; then
            PYTHON_CMD="$candidate"
            break
        fi
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    echo -e "${RED}   x No usable Python found — install Anaconda or Miniconda${NC}"
    echo -e "${RED}     Homebrew Python blocks pip install (PEP 668)${NC}"
    echo -e "${RED}     https://www.anaconda.com/download${NC}"
    exit 1
fi

PYTHON_VER=$($PYTHON_CMD --version 2>&1)
echo -e "${GREEN}   + ${PYTHON_VER} ($(dirname "$PYTHON_CMD"))${NC}"

$PYTHON_CMD -m pip install -r requirements.txt --quiet --disable-pip-version-check 2>/dev/null || {
    echo -e "${YELLOW}   ! pip install failed — trying with --user flag...${NC}"
    $PYTHON_CMD -m pip install -r requirements.txt --quiet --user 2>/dev/null || true
}
echo -e "${GREEN}   + Python packages installed${NC}"
echo -e "${DIM}     (pandas, scikit-learn, xgboost, lightgbm, catboost, fastapi, etc.)${NC}"

# ════════════════════════════════════════
# STEP 2: OLLAMA & NEMOTRON NANO 4B
# ════════════════════════════════════════
echo -e "\n${YELLOW}[2/5] Setting up Ollama + Nemotron Nano 4B (optional)...${NC}"

OLLAMA_READY=false

if command -v ollama &> /dev/null; then
    OLLAMA_VER=$(ollama --version 2>/dev/null || echo "installed")
    echo -e "${GREEN}   + Ollama found: ${OLLAMA_VER}${NC}"

    if curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${GREEN}   + Ollama server already running${NC}"
    else
        echo -e "${YELLOW}   Starting Ollama server...${NC}"
        ollama serve > /tmp/ollama-gridveda.log 2>&1 &
        OLLAMA_PID=$!

        for i in {1..15}; do
            if curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; then
                echo -e "${GREEN}   + Ollama server started${NC}"
                break
            fi
            sleep 1
        done

        if ! curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; then
            echo -e "${RED}   x Ollama server failed to start — check /tmp/ollama-gridveda.log${NC}"
        fi
    fi

    if ollama list 2>/dev/null | grep -qi "nemotron"; then
        echo -e "${GREEN}   + Nemotron Nano 4B available${NC}"
        OLLAMA_READY=true
    else
        echo -e "${YELLOW}   Nemotron not found. Pull it for local AI chat:${NC}"
        echo ""
        read -p "   Pull nemotron-nano-4b-instruct (~2.5GB)? (Y/n): " pull_choice
        pull_choice=${pull_choice:-Y}
        if [[ "$pull_choice" =~ ^[Yy]$ ]]; then
            ollama pull nemotron-nano-4b-instruct
            echo -e "${GREEN}   + Nemotron Nano 4B pulled — local inference ready${NC}"
            OLLAMA_READY=true
        else
            echo -e "${YELLOW}   ! Skipped — chat will use simulated responses${NC}"
        fi
    fi
else
    echo -e "${YELLOW}   - Ollama not installed (optional)${NC}"
    echo -e "${DIM}   Install: brew install ollama${NC}"
    echo -e "${DIM}   Or: https://ollama.com/download/mac${NC}"
    echo -e "${YELLOW}   Continuing without Ollama — chat uses smart fallback responses${NC}"
fi

# ════════════════════════════════════════
# STEP 3: API KEYS (Optional)
# ════════════════════════════════════════
echo -e "\n${YELLOW}[3/5] Checking API keys...${NC}"

if [ -f "${SCRIPT_DIR}/backend/.env" ]; then
    set -a
    source "${SCRIPT_DIR}/backend/.env" 2>/dev/null || true
    set +a
    echo -e "${GREEN}   + Loaded backend/.env${NC}"
fi

PERPLEXITY_STATUS="${RED}x Not set${NC}"

if [ -n "$PERPLEXITY_API_KEY" ]; then
    PERPLEXITY_STATUS="${GREEN}+ Configured (${PERPLEXITY_API_KEY:0:8}...)${NC}"
fi

echo -e "   Perplexity (Sonar Chat):   ${PERPLEXITY_STATUS}"

if [ -z "$PERPLEXITY_API_KEY" ]; then
    echo -e "${DIM}   - Missing key? Add it to backend/.env:${NC}"
    echo -e "${DIM}     PERPLEXITY_API_KEY=pplx-xxxx  # perplexity.ai/settings/api${NC}"
    echo -e "${DIM}   - GridVeda works without it (local NumPy/simulated fallbacks)${NC}"
fi

# ════════════════════════════════════════
# STEP 4: REACT FRONTEND SETUP
# ════════════════════════════════════════
echo -e "\n${YELLOW}[4/5] Setting up React frontend...${NC}"

NODE_AVAILABLE=false
if command -v node &> /dev/null; then
    NODE_VER=$(node --version 2>/dev/null)
    echo -e "${GREEN}   + Node.js ${NODE_VER} found${NC}"
    NODE_AVAILABLE=true
else
    echo -e "${YELLOW}   ! Node.js not found — React frontend unavailable${NC}"
    echo -e "${DIM}   Install: brew install node${NC}"
    echo -e "${DIM}   Or: https://nodejs.org/${NC}"
    echo -e "${YELLOW}   Falling back to standalone gridveda-live.html${NC}"
fi

if [ "$NODE_AVAILABLE" = true ] && [ -f "${SCRIPT_DIR}/frontend/package.json" ]; then
    if [ ! -d "${SCRIPT_DIR}/frontend/node_modules" ]; then
        echo -e "${DIM}   Installing React dependencies (first run)...${NC}"
        cd "${SCRIPT_DIR}/frontend"
        npm install --silent 2>/dev/null
        echo -e "${GREEN}   + React dependencies installed${NC}"
    else
        echo -e "${GREEN}   + React dependencies already installed${NC}"
    fi
fi

# ════════════════════════════════════════
# STEP 5: LAUNCH GRIDVEDA
# ════════════════════════════════════════
echo -e "\n${YELLOW}[5/5] Launching GridVeda...${NC}"

# Kill any existing GridVeda processes
pkill -f "uvicorn main:app.*8000" 2>/dev/null || true
pkill -f "python.*http.server.*3000" 2>/dev/null || true
pkill -f "vite.*5173" 2>/dev/null || true
sleep 1

# Start FastAPI backend
cd "${SCRIPT_DIR}/backend"
$PYTHON_CMD -m uvicorn main:app --host 0.0.0.0 --port 8000 --log-level warning &
BACKEND_PID=$!

echo -e "${DIM}   Waiting for backend (loading pre-trained models)...${NC}"
for i in {1..20}; do
    if curl -sf http://localhost:8000/ > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

if kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${GREEN}   + Backend running — http://localhost:8000${NC}"
    echo -e "${GREEN}   + API docs   — http://localhost:8000/docs${NC}"
else
    echo -e "${RED}   x Backend failed to start${NC}"
    echo -e "${RED}   Debug: cd backend && $PYTHON_CMD -m uvicorn main:app --port 8000${NC}"
    exit 1
fi

# Start frontend - prefer React (Vite) if Node available, else fallback to static HTML
FRONTEND_PID=""
REACT_PID=""

if [ "$NODE_AVAILABLE" = true ] && [ -d "${SCRIPT_DIR}/frontend/node_modules" ]; then
    cd "${SCRIPT_DIR}/frontend"
    npx vite --port 5173 > /dev/null 2>&1 &
    REACT_PID=$!
    sleep 3
    echo -e "${GREEN}   + React frontend — http://localhost:5173${NC}"
    DASHBOARD_URL="http://localhost:5173"
else
    cd "${SCRIPT_DIR}"
    $PYTHON_CMD -m http.server 3000 --directory . > /dev/null 2>&1 &
    FRONTEND_PID=$!
    sleep 1
    echo -e "${GREEN}   + Frontend served — http://localhost:3000/gridveda-live.html${NC}"
    DASHBOARD_URL="http://localhost:3000/gridveda-live.html"
fi

# Auto-open browser
open "$DASHBOARD_URL" 2>/dev/null &

# ════════════════════════════════════════
# LAUNCH SUMMARY
# ════════════════════════════════════════
echo ""
echo -e "${CYAN}${BOLD}  ══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  GridVeda — ONLINE${NC}"
echo -e "${CYAN}  ══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BOLD}Chip${NC}        ${CYAN}${CHIP_NAME}${NC}"
if [ "$ARCH" = "arm64" ]; then
echo -e "  ${BOLD}Cores${NC}       ${CYAN}${PERF_CORES}P + ${EFF_CORES}E CPU / ${GPU_CORES}-core GPU / ${NEURAL_ENGINE} Neural Engine${NC}"
echo -e "  ${BOLD}Memory${NC}      ${CYAN}${RAM_GB} GB unified${NC}"
fi
echo -e "  ${BOLD}Platform${NC}    ${CYAN}macOS $(sw_vers -productVersion 2>/dev/null || echo '') (${ARCH})${NC}"
echo -e "  ${BOLD}Python${NC}      ${CYAN}${PYTHON_VER}${NC}"
echo -e "  ${BOLD}Compute${NC}     ${CYAN}Apple Accelerate (vecLib BLAS/LAPACK)${NC}"
if [ "$OLLAMA_READY" = true ]; then
echo -e "  ${BOLD}Chat AI${NC}     ${GREEN}Nemotron Nano 4B (Ollama, Metal GPU)${NC}"
else
echo -e "  ${BOLD}Chat AI${NC}     ${YELLOW}Simulated (install Ollama for Metal-accelerated AI)${NC}"
fi
echo ""
if [ "$NODE_AVAILABLE" = true ] && [ -n "$REACT_PID" ]; then
echo -e "  ${BOLD}React UI${NC}    ${CYAN}http://localhost:5173${NC}"
else
echo -e "  ${BOLD}Dashboard${NC}   ${CYAN}http://localhost:3000/gridveda-live.html${NC}"
fi
echo -e "  ${BOLD}API${NC}         ${CYAN}http://localhost:8000${NC}"
echo -e "  ${BOLD}API Docs${NC}    ${CYAN}http://localhost:8000/docs${NC}"
echo -e "  ${BOLD}WebSocket${NC}   ${CYAN}ws://localhost:8000/ws/telemetry${NC}"
echo ""
echo -e "  ${BOLD}Pre-Trained Models${NC}"
echo -e "    ETT Ensemble     — Anomaly detection (96% accuracy)"
echo -e "    DGA Ensemble     — Fault classification (99% accuracy)"
echo -e "    Quantum VQC      — 6 qubits, 4 variational layers"
echo ""
echo -e "  ${BOLD}Integrations${NC}"
echo -e "    Perplexity       — Web-grounded grid research + chat"
echo ""
echo -e "  ${YELLOW}Press Ctrl+C to stop all services${NC}"
echo -e "${CYAN}  ══════════════════════════════════════════════════════${NC}"
echo ""

# ─── Cleanup on exit ───
cleanup() {
    echo ""
    echo -e "${YELLOW}  Shutting down GridVeda...${NC}"
    kill $BACKEND_PID 2>/dev/null
    [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null
    [ -n "$REACT_PID" ] && kill $REACT_PID 2>/dev/null
    [ -n "$OLLAMA_PID" ] && kill $OLLAMA_PID 2>/dev/null
    echo -e "${GREEN}  + All services stopped${NC}"
    echo ""
}

trap cleanup EXIT INT TERM

# Keep alive
wait $BACKEND_PID
