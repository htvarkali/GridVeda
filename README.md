# GridVeda — AI-Powered Grid Intelligence

Real-time transformer fault monitoring powered by ensemble ML, quantum variational circuits, and web-grounded research. Built on NVIDIA infrastructure end-to-end.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (React + Vite)                                │
│  ├── WebSocket ← Real-time telemetry every 2s           │
│  ├── REST → /api/chat (Nemotron 4B via Ollama)          │
│  ├── REST → /api/search (Perplexity Sonar)              │
│  ├── REST → /api/predict (Quantum VQC)                  │
│  └── 3D CAD Visualizer (Three.js, 47 components)        │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  FastAPI Backend (main.py :8000)                         │
│  ├── WebSocket /ws/telemetry (2s broadcast loop)         │
│  │                                                       │
│  ├── AI Pipeline                                         │
│  │   ├── ETT Risk Engine (XGBoost/LightGBM/CatBoost/RF) │
│  │   ├── DGA Fault Classifier (Rogers + Duval + VQC)     │
│  │   ├── Quantum VQC (6 qubits, 4 variational layers)   │
│  │   └── NemotronChat → Ollama :11434 (local GPU)        │
│  │                                                       │
│  ├── Integrations                                        │
│  │   └── PerplexityChat → Sonar API (web-grounded)       │
│  │                                                       │
│  └── 20 monitored transformers with full DGA profiles    │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  Ollama (:11434)                                         │
│  └── nemotron-nano-4b-instruct (NVIDIA open model)       │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# 1. Install dependencies and start the backend
cd backend && pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000

# 2. Start the React frontend
cd ../frontend && npm install && npm run dev

# 3. (Optional) Enable local Nemotron chat
ollama pull nemotron-nano-4b-instruct && ollama serve

# 4. (Optional) Enable Perplexity web search
export PERPLEXITY_API_KEY=pplx-xxxx
```

> All core monitoring features work without external API keys.

## AI Pipeline

GridVeda uses a 4-stage pipeline that activates progressively based on risk severity.

| Stage | Component | Role | Accuracy |
|-------|-----------|------|----------|
| 1 | **ETT Sensors** | Stream 7 channels per transformer every 2s | — |
| 2 | **ETT Risk Engine** | Physics-informed ensemble anomaly detection | 96% |
| 3 | **DGA Classifier + Quantum VQC** | Multi-method fault classification with quantum validation | 99% |
| 4 | **CAD + Perplexity Sonar** | 3D visualization and web-grounded failure research | — |

**ETT Risk Engine** — Gradient-boosted ensemble (XGBoost, LightGBM, CatBoost, Random Forest) with 36 engineered features including thermal stress, Arrhenius aging factor, and joule heating proxy. Triggers DGA analysis when risk exceeds 50%.

**DGA Fault Classifier** — Consensus between Rogers Ratios (IEEE C57.104), Duval Triangle, and a trained ensemble. Classifies faults as Normal, Thermal, Discharge, or Arcing.

**Quantum VQC** — 6-qubit variational quantum circuit with 4 layers and 72 trainable parameters. Provides an independent validation signal through a fundamentally different computational paradigm. 3-way majority vote with Rogers and Duval methods.

**Perplexity Sonar** — Web-grounded research that finds real, documented transformer failures matching the detected fault pattern. Identifies the most likely failing physical component and highlights it on the 3D CAD model.

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | Local chat via Nemotron 4B |
| POST | `/api/search` | Web-grounded research via Perplexity Sonar |
| POST | `/api/predict` | Quantum VQC fault prediction |
| GET | `/api/fleet/metrics` | Fleet-wide health metrics |
| GET | `/api/nvidia/status` | Hardware and model status |
| WS | `/ws/telemetry` | Live sensor stream (2s interval) |

Full API documentation available at `http://localhost:8000/docs`.

## Hardware

| Tier | Device | Role |
|------|--------|------|
| Cloud | DGX Spark (128GB) | Training and ensemble optimization |
| Edge | RTX 5090 (32GB GDDR7) | Inference, cuQuantum simulation, Ollama serving |
| Field | Jetson Orin Nano Super (67 TOPS, 25W) | Substation deployment, zero cloud dependency |

## Responsible AI

- **Transparency** — All intermediate calculations (features, ratios, agreement scores, class probabilities) are exposed in every API response
- **Consensus** — No single model controls output; 3-way majority voting with automatic confidence penalties for disagreement
- **Fairness** — Physics-based deterministic scoring with identical thresholds across all transformers; no demographic data
- **Safety** — Tiered activation (ETT continuous, DGA at 50% risk, VQC alongside DGA); human-in-the-loop for all actions
- **Privacy** — All inference runs locally on NVIDIA hardware; sensor data never leaves the network
