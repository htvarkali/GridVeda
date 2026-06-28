"""
Liquid Time-Constant (LTC) Network for Grid Time-Series Prediction
Based on Liquid AI's continuous-time neural ODE architecture.
Adapted for real-time transformer health trend forecasting.

Key Properties:
  - Continuous-time dynamics (adaptive time constants)
  - Compact model size (~12K params) suitable for edge deployment
  - Captures long-range temporal dependencies
  - Natural handling of irregular time intervals

Reference: Hasani et al., "Liquid Time-constant Networks" (2021)
"""

import numpy as np
from typing import Dict, Any, Optional


class LiquidTimeConstantNetwork:
    """
    Liquid Time-Constant Network for time-series trend prediction.
    Pure NumPy implementation optimized for Jetson Orin Nano Super deployment.
    """

    def __init__(
        self,
        input_size: int = 9,
        hidden_size: int = 64,
        output_size: int = 3,
        n_ode_steps: int = 6,
        dt: float = 0.1,
        seed: int = 42,
    ):
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.output_size = output_size
        self.n_ode_steps = n_ode_steps
        self.dt = dt
        self.rng = np.random.RandomState(seed)

        # Initialize network parameters
        self._init_params()

        # Trend thresholds
        self.degradation_threshold = 0.65
        self.critical_threshold = 0.85

    def _init_params(self):
        """Initialize LTC network weights with Xavier initialization."""
        def xavier(fan_in, fan_out):
            scale = np.sqrt(2.0 / (fan_in + fan_out))
            return self.rng.randn(fan_in, fan_out) * scale

        # Input projection
        self.W_in = xavier(self.input_size, self.hidden_size)
        self.b_in = np.zeros(self.hidden_size)

        # LTC cell parameters
        # Time constants (learnable, positive via softplus)
        self.tau_raw = self.rng.randn(self.hidden_size) * 0.5 + 1.0

        # Synaptic weights
        self.W_rec = xavier(self.hidden_size, self.hidden_size)
        self.b_rec = np.zeros(self.hidden_size)

        # Input-dependent modulation
        self.W_gate = xavier(self.hidden_size, self.hidden_size)
        self.b_gate = np.zeros(self.hidden_size)

        # Sensitivity kernel
        self.A = xavier(self.hidden_size, self.hidden_size) * 0.1

        # Output projection
        self.W_out = xavier(self.hidden_size, self.output_size)
        self.b_out = np.zeros(self.output_size)

        # Layer norm parameters
        self.ln_gamma = np.ones(self.hidden_size)
        self.ln_beta = np.zeros(self.hidden_size)

    @staticmethod
    def _softplus(x: np.ndarray) -> np.ndarray:
        """Softplus activation: log(1 + exp(x))."""
        return np.where(x > 20, x, np.log1p(np.exp(np.clip(x, -20, 20))))

    @staticmethod
    def _sigmoid(x: np.ndarray) -> np.ndarray:
        """Numerically stable sigmoid."""
        return np.where(
            x >= 0,
            1 / (1 + np.exp(-x)),
            np.exp(x) / (1 + np.exp(x))
        )

    @staticmethod
    def _layer_norm(x: np.ndarray, gamma: np.ndarray, beta: np.ndarray, eps: float = 1e-5) -> np.ndarray:
        """Layer normalization."""
        mean = np.mean(x, axis=-1, keepdims=True)
        var = np.var(x, axis=-1, keepdims=True)
        return gamma * (x - mean) / np.sqrt(var + eps) + beta

    def _ltc_ode_step(self, h: np.ndarray, x_proj: np.ndarray) -> np.ndarray:
        """
        Single LTC ODE integration step:
          dh/dt = (-h + f(h, x)) / τ(x)

        Where:
          f(h, x) = tanh(W_rec @ h + x_proj + b_rec)
          τ(x) = softplus(τ_raw + gate(x))
          gate(x) = sigmoid(W_gate @ x_proj + b_gate)
        """
        # Compute firing rate
        pre_activation = self.W_rec @ h + x_proj + self.b_rec
        f_h = np.tanh(pre_activation)

        # Input-dependent time constant modulation
        gate = self._sigmoid(self.W_gate @ x_proj + self.b_gate)
        tau = self._softplus(self.tau_raw + gate * 2.0)

        # Sensitivity modulation
        sens = np.tanh(self.A @ h) * 0.1

        # ODE: dh/dt = (-h + f(h,x) + sens) / τ
        dh = (-h + f_h + sens) / tau

        # Euler integration
        h_new = h + self.dt * dh
        return h_new

    def _forward_step(self, h: np.ndarray, x: np.ndarray) -> np.ndarray:
        """Process one timestep through LTC cell with sub-stepping."""
        # Project input
        x_proj = x @ self.W_in + self.b_in

        # Sub-step ODE integration for stability
        for _ in range(self.n_ode_steps):
            h = self._ltc_ode_step(h, x_proj)

        # Layer normalization for stability
        h = self._layer_norm(h, self.ln_gamma, self.ln_beta)

        return h

    def _forward_sequence(self, sequence: np.ndarray) -> tuple:
        """
        Process full sequence through LTC network.

        Args:
            sequence: Shape (seq_len, input_size) - normalized sensor readings

        Returns:
            (final_hidden, all_hiddens) - final state and trajectory
        """
        seq_len = sequence.shape[0]
        h = np.zeros(self.hidden_size)
        hiddens = []

        for t in range(seq_len):
            h = self._forward_step(h, sequence[t])
            hiddens.append(h.copy())

        return h, np.array(hiddens)

    def predict(self, sequence: np.ndarray) -> Dict[str, Any]:
        """
        Predict transformer health trend from time-series data.

        Args:
            sequence: Shape (seq_len, 9) normalized sensor data
                      [temp, load, h2, ch4, c2h2, c2h4, c2h6, moisture, vibration]

        Returns:
            Dict with trend, predicted_hours, severity, trajectory
        """
        if sequence.ndim == 1:
            sequence = sequence.reshape(1, -1)

        # Forward pass
        h_final, h_trajectory = self._forward_sequence(sequence)

        # Output projection → [risk, rate_of_change, time_to_threshold]
        output = h_final @ self.W_out + self.b_out
        risk = float(self._sigmoid(np.array([output[0]]))[0])
        rate = float(np.tanh(output[1]))
        time_factor = float(self._softplus(np.array([output[2]]))[0])

        # Compute trend from hidden state trajectory
        if len(h_trajectory) >= 3:
            # L2 norm of hidden states over time
            norms = np.linalg.norm(h_trajectory, axis=1)
            recent = norms[-3:]
            trend_slope = np.polyfit(range(len(recent)), recent, 1)[0]
        else:
            trend_slope = 0.0

        # Determine trend category
        if risk > self.critical_threshold:
            trend = "critical"
            predicted_hours = max(1, int(time_factor * 2))
        elif risk > self.degradation_threshold or (rate > 0.3 and trend_slope > 0):
            trend = "degrading"
            predicted_hours = max(4, int(time_factor * 12))
        elif rate < -0.2:
            trend = "improving"
            predicted_hours = None
        else:
            trend = "stable"
            predicted_hours = None

        # Severity mapping
        severity_map = {"critical": 4, "degrading": 3, "stable": 2, "improving": 1}

        return {
            "trend": trend,
            "risk_score": round(risk, 4),
            "rate_of_change": round(rate, 4),
            "predicted_hours": predicted_hours,
            "severity": severity_map.get(trend, 2),
            "trend_slope": round(float(trend_slope), 6),
            "trajectory_norm": [round(float(n), 4) for n in np.linalg.norm(h_trajectory, axis=1)[-5:]],
            "model": "LiquidTimeConstant",
            "hidden_size": self.hidden_size,
            "ode_steps": self.n_ode_steps,
            "edge_target": "Jetson Orin Nano Super (67 TOPS)",
        }

    def get_model_info(self) -> Dict[str, Any]:
        """Return model architecture info."""
        total_params = (
            self.W_in.size + self.b_in.size +
            self.tau_raw.size +
            self.W_rec.size + self.b_rec.size +
            self.W_gate.size + self.b_gate.size +
            self.A.size +
            self.W_out.size + self.b_out.size +
            self.ln_gamma.size + self.ln_beta.size
        )
        return {
            "name": "Liquid Time-Constant Network",
            "input_size": self.input_size,
            "hidden_size": self.hidden_size,
            "output_size": self.output_size,
            "total_params": total_params,
            "ode_steps": self.n_ode_steps,
            "dt": self.dt,
            "edge_compatible": True,
            "min_memory_mb": round(total_params * 4 / 1024 / 1024, 2),
        }
