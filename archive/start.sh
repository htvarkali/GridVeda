#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════
# GridVeda — NVIDIA RTX 5090 Alienware Deployment Script
# Target: Alienware Laptop with NVIDIA GeForce RTX 5090
#         24GB GDDR7 | 10,496 CUDA Cores | Blackwell Architecture
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
echo -e "${BOLD}  NVIDIA-First AI Grid Intelligence${NC}"
echo -e "${DIM}  Alienware RTX 5090 Edition${NC}"
echo -e "${CYAN}  ════════════════════════════════════════════════════════${NC}"
echo ""

# ════════════════════════════════════════
# STEP 1: GPU DETECTION & VALIDATION
# ════════════════════════════════════════
echo -e "${YELLOW}[1/7] 🖥️  Detecting NVIDIA GPU...${NC}"

if command -v nvidia-smi &> /dev/null; then
    GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1 | xargs)
    GPU_VRAM=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null | head -1 | xargs)
    GPU_DRIVER=$(nvidia-smi --query-gpu=driver_version --format=csv,noheader 2>/dev/null | head -1 | xargs)
    CUDA_VERSION=$(nvidia-smi 2>/dev/null | grep "CUDA Version" | awk '{print $9}')
    GPU_TEMP=$(nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader 2>/dev/null | head -1 | xargs)
    GPU_POWER=$(nvidia-smi --query-gpu=power.draw --format=csv,noheader 2>/dev/null | head -1 | xargs)
    GPU_UTIL=$(nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader 2>/dev/null | head -1 | xargs)

    echo -e "${GREEN}   ✓ GPU Found: ${BOLD}${GPU_NAME}${NC}"
    echo -e "${GREEN}   ✓ VRAM: ${GPU_VRAM} MB${NC}"
    echo -e "${GREEN}   ✓ Driver: ${GPU_DRIVER} | CUDA: ${CUDA_VERSION}${NC}"
    echo -e "${GREEN}   ✓ Temp: ${GPU_TEMP}°C | Power: ${GPU_POWER} | Util: ${GPU_UTIL}${NC}"

    if echo "$GPU_NAME" | grep -qi "5090"; then
        echo -e "${CYAN}   ⚡ RTX 5090 CONFIRMED — Blackwell Architecture${NC}"
        echo -e "${CYAN}     10,496 CUDA Cores | 24GB GDDR7 | 5th Gen Tensor Cores${NC}"
    elif echo "$GPU_NAME" | grep -qi "5080\|5070\|4090\|4080"; then
        echo -e "${YELLOW}   ⚠ Not RTX 5090, but compatible GPU detected — proceeding${NC}"
    else
        echo -e "${YELLOW}   ⚠ Non-RTX 50 series GPU — GridVeda will still run${NC}"
    fi
else
    echo -e "${RED}   ✗ nvidia-smi not found${NC}"
    echo -e "${YELLOW}   Install NVIDIA drivers: https://www.nvidia.com/drivers${NC}"
    echo -e "${YELLOW}   GridVeda will run in CPU mode (AI models still work)${NC}"
    GPU_NAME="Not detected"
fi

# ════════════════════════════════════════
# STEP 2: GPU OPTIMIZATION FOR LAPTOP
# ════════════════════════════════════════
echo -e "\n${YELLOW}[2/7] ⚙️  Configuring GPU for Alienware laptop...${NC}"

# Force discrete GPU (skip iGPU on Alienware hybrid graphics)
export CUDA_VISIBLE_DEVICES=0
echo -e "${GREEN}   ✓ CUDA_VISIBLE_DEVICES=0 (discrete GPU forced)${NC}"

# Ollama GPU settings — use full RTX 5090 VRAM for Nemotron
export OLLAMA_NUM_GPU=999
echo -e "${GREEN}   ✓ OLLAMA_NUM_GPU=999 (all layers on GPU)${NC}"

# Set Ollama to use port 11434 (default)
export OLLAMA_HOST=127.0.0.1:11434
echo -e "${GREEN}   ✓ OLLAMA_HOST=127.0.0.1:11434${NC}"

# Performance mode — maximize GPU clocks (laptop thermal headroom)
if command -v nvidia-smi &> /dev/null; then
    # Try to set persistence mode (may need sudo)
    nvidia-smi -pm 1 2>/dev/null && \
        echo -e "${GREEN}   ✓ GPU persistence mode enabled${NC}" || \
        echo -e "${DIM}   ○ GPU persistence mode skipped (needs sudo)${NC}"

    # Set compute mode to DEFAULT (allow multiple processes)
    nvidia-smi -c 0 2>/dev/null && \
        echo -e "${GREEN}   ✓ GPU compute mode: DEFAULT (shared)${NC}" || \
        echo -e "${DIM}   ○ Compute mode unchanged${NC}"
fi

# PyTorch / NumPy acceleration hints
export CUDA_LAUNCH_BLOCKING=0
export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True
echo -e "${GREEN}   ✓ CUDA async launch enabled${NC}"

# ════════════════════════════════════════
# STEP 3: PYTHON DEPENDENCIES
# ════════════════════════════════════════
echo -e "\n${YELLOW}[3/7] 📦 Installing Python dependencies...${NC}"
cd "${SCRIPT_DIR}/backend"

if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo -e "${RED}   ✗ Python not found — install Python 3.10+${NC}"
    exit 1
fi

PYTHON_CMD=$(command -v python3 || command -v python)
PYTHON_VER=$($PYTHON_CMD --version 2>&1)
echo -e "${GREEN}   ✓ ${PYTHON_VER}${NC}"

$PYTHON_CMD -m pip install -r requirements.txt --quiet --disable-pip-version-check 2>/dev/null || \
    pip install -r requirements.txt --quiet 2>/dev/null
echo -e "${GREEN}   ✓ Python packages installed${NC}"

# ════════════════════════════════════════
# STEP 4: OLLAMA & NEMOTRON NANO 4B
# ════════════════════════════════════════
echo -e "\n${YELLOW}[4/7] 🤖 Setting up Ollama + Nemotron Nano 4B...${NC}"

OLLAMA_READY=false

if command -v ollama &> /dev/null; then
    OLLAMA_VER=$(ollama --version 2>/dev/null || echo "installed")
    echo -e "${GREEN}   ✓ Ollama found: ${OLLAMA_VER}${NC}"

    # Check if Ollama server is running
    if curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${GREEN}   ✓ Ollama server already running${NC}"
    else
        echo -e "${YELLOW}   Starting Ollama server (GPU-accelerated)...${NC}"
        ollama serve > /tmp/ollama-gridveda.log 2>&1 &
        OLLAMA_PID=$!

        # Wait for Ollama to be ready (up to 15s)
        for i in {1..15}; do
            if curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; then
                echo -e "${GREEN}   ✓ Ollama server started (GPU mode)${NC}"
                break
            fi
            sleep 1
        done

        if ! curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; then
            echo -e "${RED}   ✗ Ollama server failed to start — check /tmp/ollama-gridveda.log${NC}"
        fi
    fi

    # Check for Nemotron model
    if ollama list 2>/dev/null | grep -qi "nemotron"; then
        echo -e "${GREEN}   ✓ Nemotron Nano 4B available (running on RTX 5090)${NC}"
        OLLAMA_READY=true
    else
        echo -e "${YELLOW}   Nemotron not found. Pulling now...${NC}"
        echo -e "${DIM}   (Nemotron Nano 4B is ~2.5GB — should be fast on your connection)${NC}"
        echo ""
        read -p "   Pull nemotron-nano-4b-instruct? (Y/n): " pull_choice
        pull_choice=${pull_choice:-Y}
        if [[ "$pull_choice" =~ ^[Yy]$ ]]; then
            ollama pull nemotron-nano-4b-instruct
            echo -e "${GREEN}   ✓ Nemotron Nano 4B pulled — GPU-accelerated inference ready${NC}"
            OLLAMA_READY=true
        else
            echo -e "${YELLOW}   ⚠ Skipped — chat will use simulated responses${NC}"
        fi
    fi
else
    echo -e "${RED}   ✗ Ollama not installed${NC}"
    echo ""
    echo -e "${BOLD}   Quick install:${NC}"
    echo -e "${CYAN}   curl -fsSL https://ollama.com/install.sh | sh${NC}"
    echo -e "${CYAN}   ollama pull nemotron-nano-4b-instruct${NC}"
    echo ""
    echo -e "${YELLOW}   Continuing without Ollama — chat uses smart fallback responses${NC}"
fi

# ════════════════════════════════════════
# STEP 5: SPONSOR API KEYS (Optional)
# ════════════════════════════════════════
echo -e "\n${YELLOW}[5/7] 🔑 Checking sponsor API keys...${NC}"

CEREBRAS_STATUS="${RED}✗ Not set${NC}"
PERPLEXITY_STATUS="${RED}✗ Not set${NC}"

if [ -n "$CEREBRAS_API_KEY" ]; then
    CEREBRAS_STATUS="${GREEN}✓ Configured (${CEREBRAS_API_KEY:0:8}...)${NC}"
fi

if [ -n "$PERPLEXITY_API_KEY" ]; then
    PERPLEXITY_STATUS="${GREEN}✓ Configured (${PERPLEXITY_API_KEY:0:8}...)${NC}"
fi

echo -e "   Cerebras (Llama 3.3 70B):  ${CEREBRAS_STATUS}"
echo -e "   Perplexity (Sonar Search): ${PERPLEXITY_STATUS}"

if [ -z "$CEREBRAS_API_KEY" ] || [ -z "$PERPLEXITY_API_KEY" ]; then
    echo -e "${DIM}   ○ Missing keys? Set them:${NC}"
    echo -e "${DIM}     export CEREBRAS_API_KEY=csk-xxxx    # Free: cloud.cerebras.ai${NC}"
    echo -e "${DIM}     export PERPLEXITY_API_KEY=pplx-xxxx  # perplexity.ai/settings/api${NC}"
    echo -e "${DIM}   ○ GridVeda works without them (local NumPy/simulated fallbacks)${NC}"
fi

# ════════════════════════════════════════
# STEP 6: REACT FRONTEND SETUP
# ════════════════════════════════════════
echo -e "\n${YELLOW}[6/7] 📦 Setting up React frontend...${NC}"

NODE_AVAILABLE=false
if command -v node &> /dev/null; then
    NODE_VER=$(node --version 2>/dev/null)
    echo -e "${GREEN}   ✓ Node.js ${NODE_VER} found${NC}"
    NODE_AVAILABLE=true
else
    echo -e "${YELLOW}   ⚠ Node.js not found — React frontend unavailable${NC}"
    echo -e "${DIM}   Install from https://nodejs.org/ for the full React UI${NC}"
    echo -e "${YELLOW}   Falling back to standalone gridveda-live.html${NC}"
fi

if [ "$NODE_AVAILABLE" = true ] && [ -f "${SCRIPT_DIR}/frontend/package.json" ]; then
    if [ ! -d "${SCRIPT_DIR}/frontend/node_modules" ]; then
        echo -e "${DIM}   Installing React dependencies (first run)...${NC}"
        cd "${SCRIPT_DIR}/frontend"
        npm install --silent 2>/dev/null
        echo -e "${GREEN}   ✓ React dependencies installed${NC}"
    else
        echo -e "${GREEN}   ✓ React dependencies already installed${NC}"
    fi
fi

# ════════════════════════════════════════
# STEP 7: LAUNCH GRIDVEDA
# ════════════════════════════════════════
echo -e "\n${YELLOW}[7/7] 🚀 Launching GridVeda...${NC}"

# Kill any existing GridVeda processes
pkill -f "uvicorn main:app.*8000" 2>/dev/null || true
pkill -f "python.*http.server.*3000" 2>/dev/null || true
pkill -f "vite.*5173" 2>/dev/null || true
sleep 1

# Start FastAPI backend
cd "${SCRIPT_DIR}/backend"
$PYTHON_CMD -m uvicorn main:app --host 0.0.0.0 --port 8000 --log-level warning &
BACKEND_PID=$!

# Wait for backend
for i in {1..10}; do
    if curl -sf http://localhost:8000/ > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

if kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${GREEN}   ✓ Backend running — http://localhost:8000${NC}"
    echo -e "${GREEN}   ✓ API docs   — http://localhost:8000/docs${NC}"
else
    echo -e "${RED}   ✗ Backend failed to start${NC}"
    echo -e "${RED}   Check: cd backend && $PYTHON_CMD -m uvicorn main:app --port 8000${NC}"
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
    echo -e "${GREEN}   ✓ React frontend — http://localhost:5173${NC}"
    DASHBOARD_URL="http://localhost:5173"
else
    # Fallback: serve standalone HTML
    cd "${SCRIPT_DIR}"
    $PYTHON_CMD -m http.server 3000 --directory . > /dev/null 2>&1 &
    FRONTEND_PID=$!
    sleep 1
    echo -e "${GREEN}   ✓ Frontend served — http://localhost:3000/gridveda-live.html${NC}"
    DASHBOARD_URL="http://localhost:3000/gridveda-live.html"
fi

# Auto-open browser
if command -v xdg-open &> /dev/null; then
    xdg-open "$DASHBOARD_URL" 2>/dev/null &
elif command -v open &> /dev/null; then
    open "$DASHBOARD_URL" 2>/dev/null &
elif command -v wslview &> /dev/null; then
    wslview "$DASHBOARD_URL" 2>/dev/null &
elif command -v cmd.exe &> /dev/null; then
    cmd.exe /c start "$DASHBOARD_URL" 2>/dev/null &
fi

# ════════════════════════════════════════
# LAUNCH SUMMARY
# ════════════════════════════════════════
echo ""
echo -e "${CYAN}${BOLD}  ══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ⚡ GridVeda NVIDIA Stack — ONLINE${NC}"
echo -e "${CYAN}  ══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BOLD}GPU${NC}         ${CYAN}${GPU_NAME}${NC}"
if [ "$OLLAMA_READY" = true ]; then
echo -e "  ${BOLD}Chat AI${NC}     ${GREEN}Nemotron Nano 4B on RTX 5090 (LOCAL)${NC}"
else
echo -e "  ${BOLD}Chat AI${NC}     ${YELLOW}Simulated (install Ollama for real AI)${NC}"
fi
echo -e "  ${BOLD}Pipeline${NC}    ${GREEN}Quantum VQC + Cerebras + LSTM AE${NC}"
echo ""
if [ "$NODE_AVAILABLE" = true ] && [ -n "$REACT_PID" ]; then
echo -e "  ${BOLD}React UI${NC}    ${CYAN}http://localhost:5173${NC}"
else
echo -e "  ${BOLD}Dashboard${NC}   ${CYAN}http://localhost:3000/gridveda-live.html${NC}"
fi
echo -e "  ${BOLD}API${NC}         ${CYAN}http://localhost:8000${NC}"
echo -e "  ${BOLD}Docs${NC}        ${CYAN}http://localhost:8000/docs${NC}"
echo -e "  ${BOLD}WebSocket${NC}   ${CYAN}ws://localhost:8000/ws/telemetry${NC}"
echo ""
echo -e "  ${BOLD}NVIDIA Models${NC}"
echo -e "    🤖 Nemotron Nano 4B  — Chat (Ollama → RTX 5090 GPU)"
echo -e "    🔮 Quantum VQC       — Fault classification (cuQuantum)"
echo -e "    🔍 LSTM Autoencoder  — Anomaly detection (CUDA)"
echo ""
echo -e "  ${BOLD}Sponsor Augmentations${NC}"
echo -e "    🧠 Cerebras          — Llama 3.3 70B trends (~2000 tok/s)"
echo -e "    🌐 Perplexity        — Web-grounded grid research"
echo ""
echo -e "  ${BOLD}Demo Features${NC}"
echo -e "    💉 Anomaly Injector  — Inject faults into any transformer"
echo -e "    🎤 Voice Assistant   — Hands-free grid monitoring"
echo -e "    🌐 Web Toggle       — Switch chat to Perplexity Sonar"
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
    echo -e "${GREEN}  ✓ All services stopped${NC}"
    echo -e "${DIM}  GPU released — RTX 5090 free for other tasks${NC}"
    echo ""
}

trap cleanup EXIT INT TERM

# Keep alive
wait $BACKEND_PID
