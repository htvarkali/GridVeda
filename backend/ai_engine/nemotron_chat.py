"""
Nemotron Nano 4B Chat Interface via Ollama
Replaces Perplexity Sonar with 100% local NVIDIA model.

Features:
  - Grid-aware system prompt with transformer domain knowledge
  - DGA analysis interpretation
  - Real-time fleet context injection
  - Runs 100% offline via Ollama on RTX/Jetson hardware

Model: nvidia/nemotron-nano-4b-instruct (Ollama)
Fallback: llama3.2:3b if Nemotron unavailable
"""

import json
import asyncio
from typing import Dict, Any, Optional

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False


GRID_SYSTEM_PROMPT = """You are GridVeda AI, an expert power grid monitoring assistant powered by NVIDIA Nemotron Nano 4B running locally via Ollama.

Your expertise includes:
- Transformer health monitoring and predictive maintenance
- Dissolved Gas Analysis (DGA) interpretation using Duval Triangle and Rogers Ratio
- Real-time sensor data analysis (temperature, load, vibration, moisture)
- SCADA systems and industrial protocols (Modbus, DNP3, IEC 61850, OPC-UA)
- Power grid operations, demand response, and renewable integration
- NERC CIP compliance and regulatory requirements

When analyzing grid data:
1. Always reference specific sensor values and thresholds
2. Use IEEE C57.104 standards for DGA interpretation
3. Provide actionable recommendations with urgency levels
4. Consider cascading failure risks across interconnected assets
5. Reference the AI engine results (Quantum VQC, ETT/DGA ensembles) when available

Keep responses concise, technical, and actionable. Use bullet points for recommendations.
Format critical warnings prominently."""


class NemotronChat:
    """
    Chat interface to Nemotron Nano 4B via Ollama API.
    Falls back to simulated responses if Ollama is unavailable.
    """

    OLLAMA_BASE_URL = "http://localhost:11434"
    PRIMARY_MODEL = "nemotron-mini:4b"
    FALLBACK_MODEL = "nemotron-nano-4b-instruct"  # legacy name

    def __init__(self):
        self.model = self.PRIMARY_MODEL
        self.conversation_history: list = []
        self.ollama_available = False
        self._check_ollama()

    def _check_ollama(self):
        """Check if Ollama is running and model is available."""
        if not HAS_HTTPX:
            self.ollama_available = False
            return

        try:
            import httpx
            resp = httpx.get(f"{self.OLLAMA_BASE_URL}/api/tags", timeout=3)
            if resp.status_code == 200:
                models = [m["name"] for m in resp.json().get("models", [])]
                if any(self.PRIMARY_MODEL in m for m in models):
                    self.model = self.PRIMARY_MODEL
                    self.ollama_available = True
                elif any(self.FALLBACK_MODEL in m for m in models):
                    self.model = self.FALLBACK_MODEL
                    self.ollama_available = True
                else:
                    self.ollama_available = False
            else:
                self.ollama_available = False
        except Exception:
            self.ollama_available = False

    async def ask(self, message: str, grid_context: Optional[str] = None) -> str:
        """
        Send message to Nemotron via Ollama and return response.

        Args:
            message: User question
            grid_context: Optional JSON string with current fleet data

        Returns:
            Assistant response string
        """
        # Build context-enhanced user message (NOT in system prompt — keeps it concise for 4B model)
        enriched = message
        if grid_context:
            enriched = (
                f"Here is the current live grid telemetry data:\n```json\n{grid_context}\n```\n\n"
                f"Based on this data, answer the following question. "
                f"Do NOT just repeat the raw data. Instead, analyze it, summarize the key findings, "
                f"highlight any concerns, and provide actionable recommendations.\n\n"
                f"Question: {message}"
            )

        if self.ollama_available and HAS_HTTPX:
            return await self._ollama_chat(GRID_SYSTEM_PROMPT, enriched)
        else:
            return self._simulated_response(message, grid_context)

    async def _ollama_chat(self, system: str, message: str) -> str:
        """Call Ollama API for Nemotron response."""
        self.conversation_history.append({"role": "user", "content": message})

        messages = [
            {"role": "system", "content": system},
            *self.conversation_history[-10:],  # Keep last 10 turns
        ]

        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    f"{self.OLLAMA_BASE_URL}/api/chat",
                    json={
                        "model": self.model,
                        "messages": messages,
                        "stream": False,
                        "options": {
                            "temperature": 0.3,
                            "top_p": 0.9,
                            "num_predict": 1024,
                        },
                    },
                )
                if resp.status_code == 200:
                    content = resp.json()["message"]["content"]
                    self.conversation_history.append({"role": "assistant", "content": content})
                    return content
                else:
                    return self._simulated_response(message)
        except Exception as e:
            return self._simulated_response(message)

    def _simulated_response(self, message: str, context: Optional[str] = None) -> str:
        """Generate contextual grid-aware response when Ollama is unavailable."""
        msg = message.lower()

        if any(w in msg for w in ["health", "status", "overview", "fleet"]):
            return (
                "**Fleet Status Summary** (Nemotron Nano 4B — Simulated)\n\n"
                "All 20 transformers are online. Fleet health score is **94.7/100**.\n\n"
                "⚠ **Watch Items:**\n"
                "- **XFMR-007**: Temperature trending upward (78.3°C). Quantum VQC flagged thermal stress.\n"
                "- **XFMR-012**: Elevated ethylene in DGA (c2h4: 45.2 ppm). Liquid LTC predicts degradation in ~18h.\n\n"
                "**Recommendation:** Schedule oil sampling for XFMR-007 and XFMR-012 within 48 hours. "
                "Monitor DGA trends — if c2h2 exceeds 10 ppm, escalate to urgent maintenance."
            )

        elif any(w in msg for w in ["dga", "gas", "dissolved", "duval", "rogers"]):
            return (
                "**DGA Analysis Guide** (Nemotron Nano 4B — Simulated)\n\n"
                "GridVeda uses three ensemble methods for DGA fault classification:\n\n"
                "1. **Quantum VQC** — Variational quantum circuit mapping gas ratios to fault probabilities\n"
                "2. **Rogers Ratio** — Classical CH4/H2, C2H2/C2H4, C2H4/C2H6 ratio analysis\n"
                "3. **Duval Triangle** — Ternary plot of CH4, C2H4, C2H2 percentages\n\n"
                "**Key Thresholds (IEEE C57.104):**\n"
                "- H2 > 100 ppm → Possible partial discharge\n"
                "- C2H2 > 2 ppm → Arcing suspected\n"
                "- C2H4 > 50 ppm → Thermal fault likely\n\n"
                "The ensemble approach reduces false positives by requiring agreement across all three methods."
            )

        elif any(w in msg for w in ["anomaly", "alert", "warning", "alarm"]):
            return (
                "**Current Alerts** (Nemotron Nano 4B — Simulated)\n\n"
                "Active alerts from the AI engine:\n\n"
                "🟡 **XFMR-007** — Thermal stress detected\n"
                "   Source: Quantum VQC | Risk Score: 0.67\n"
                "   Recommendation: Monitor oil temperature, check cooling fans\n\n"
                "🟡 **XFMR-012** — DGA ethylene elevation\n"
                "   Source: DGA Ensemble | Trend: Degrading (est. 18h to threshold)\n"
                "   Recommendation: Priority oil sampling, review load history\n\n"
                "No sequence-level anomalies detected. This suggests the patterns are "
                "gradual rather than sudden — consistent with thermal degradation."
            )

        elif any(w in msg for w in ["predict", "forecast", "future", "trend"]):
            return (
                "**Predictive Analysis** (Nemotron Nano 4B — Simulated)\n\n"
                "Based on the Liquid Time-Constant Network analysis:\n\n"
                "**Short-term (0-6h):** All transformers within safe operating range.\n"
                "**Medium-term (6-24h):** XFMR-012 projected to reach DGA caution level.\n"
                "**Long-term (24-72h):** XFMR-007 thermal trend suggests cooling system attention needed.\n\n"
                "The quantum-classical ensemble provides 87% accuracy on 24h fault prediction "
                "based on validation against historical failure data."
            )

        elif any(w in msg for w in ["nvidia", "hardware", "gpu", "jetson", "dgx"]):
            return (
                "**NVIDIA Stack Configuration** (Nemotron Nano 4B — Simulated)\n\n"
                "GridVeda runs on a 100% NVIDIA open-source stack:\n\n"
                "🟢 **Chat/RAG:** Nemotron Nano 4B via Ollama (runs offline)\n"
                "🟢 **Inference:** TensorRT-LLM + NVIDIA NIM microservices\n"
                "🟢 **Development:** DGX Spark — 128GB unified memory, Grace Blackwell GPU\n"
                "🟢 **Demo:** RTX 5090 laptop — CUDA acceleration\n"
                "🟢 **Edge:** Jetson Orin Nano Super — 67 TOPS @ 25W ($249)\n\n"
                "All models are optimized for the NVIDIA platform from development through edge deployment."
            )

        else:
            return (
                f"**GridVeda AI** (Nemotron Nano 4B — Simulated)\n\n"
                f"I received your question: \"{message}\"\n\n"
                f"I'm the GridVeda grid intelligence assistant powered by NVIDIA Nemotron Nano 4B. "
                f"I can help with:\n"
                f"- Fleet health monitoring and status\n"
                f"- DGA analysis and fault classification\n"
                f"- Alert investigation and recommendations\n"
                f"- Predictive maintenance insights\n"
                f"- NVIDIA hardware stack details\n\n"
                f"To connect me to the live Nemotron model, start Ollama with:\n"
                f"```\nollama pull nemotron-nano-4b-instruct\nollama serve\n```"
            )
