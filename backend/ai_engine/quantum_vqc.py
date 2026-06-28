"""
Quantum Variational Quantum Classifier (VQC) for Transformer Fault Classification
Uses parameterized quantum circuits for DGA-based fault detection.
Compatible with NVIDIA cuQuantum for GPU-accelerated simulation.

Fault Types (IEEE C57.104 / Duval Triangle):
  - Normal: No significant fault
  - PD: Partial Discharge
  - D1: Low-energy discharge (arcing)
  - D2: High-energy discharge
  - T1: Thermal fault < 300C
  - T2: Thermal fault 300-700C
  - T3: Thermal fault > 700C
  - DT: Combined discharge + thermal

Training:
  - Nelder-Mead gradient-free optimization (avoids barren plateaus)
  - Cross-entropy loss
  - Mini-batch processing
  - Validation tracking
"""

import numpy as np
from scipy.optimize import minimize
from typing import Dict, Any, List
import pickle
import time


class QuantumVQC:
    """
    Quantum Variational Circuit with training support.

    Architecture:
    - 6 qubits (64-dimensional Hilbert space)
    - 4 variational layers
    - 72 trainable parameters (6 qubits x 3 rotations x 4 layers)
    - Ring CNOT topology for entanglement

    Training:
    - Nelder-Mead gradient-free optimization (avoids barren plateaus)
    - Cross-entropy loss
    - Mini-batch processing
    - Validation tracking
    """

    FAULT_TYPES = ["Normal", "PD", "D1", "D2", "T1", "T2", "T3", "DT"]

    def __init__(self, n_qubits: int = 6, n_layers: int = 4, seed: int = 42):
        """
        Initialize quantum circuit.

        Args:
            n_qubits: Number of qubits (6 for 5 DGA gases + 1 extra)
            n_layers: Variational layers (4 as in paper)
            seed: Random seed
        """
        self.n_qubits = n_qubits
        self.n_layers = n_layers
        self.n_states = 2 ** n_qubits  # 64 states
        self.rng = np.random.RandomState(seed)

        # Trainable parameters
        self.n_params = n_layers * n_qubits * 3  # 72 params
        self.params = None  # Will be initialized in train() or _init_random_params()

        # Training history
        self.train_losses = []
        self.val_losses = []
        self.is_trained = False

        # Initialization complete — n_qubits qubits, n_layers layers, n_params params

    def _init_random_params(self):
        """Initialize with random variational parameters (for inference without training)."""
        self.params = self.rng.uniform(-np.pi, np.pi, size=self.n_params)

    # ===================================================================
    # QUANTUM GATES
    # ===================================================================

    def _rx(self, theta: float) -> np.ndarray:
        """Pauli-X rotation gate."""
        c, s = np.cos(theta / 2), np.sin(theta / 2)
        return np.array([[c, -1j * s], [-1j * s, c]], dtype=complex)

    def _ry(self, theta: float) -> np.ndarray:
        """Pauli-Y rotation gate."""
        c, s = np.cos(theta / 2), np.sin(theta / 2)
        return np.array([[c, -s], [s, c]], dtype=complex)

    def _rz(self, theta: float) -> np.ndarray:
        """Pauli-Z rotation gate."""
        return np.array([
            [np.exp(-1j * theta / 2), 0],
            [0, np.exp(1j * theta / 2)]
        ], dtype=complex)

    def _hadamard(self) -> np.ndarray:
        """Hadamard gate for superposition."""
        return np.array([[1, 1], [1, -1]], dtype=complex) / np.sqrt(2)

    def _apply_single_qubit_gate(self, state: np.ndarray, gate: np.ndarray, qubit: int) -> np.ndarray:
        """Apply gate to specific qubit in state vector."""
        state_tensor = state.reshape([2] * self.n_qubits)
        new_state = np.zeros_like(state_tensor)

        for idx in np.ndindex(state_tensor.shape):
            idx_list = list(idx)
            for new_val in [0, 1]:
                new_idx = idx_list.copy()
                new_idx[qubit] = new_val
                new_state[tuple(new_idx)] += gate[new_val, idx[qubit]] * state_tensor[tuple(idx)]

        return new_state.reshape(-1)

    def _apply_cnot(self, state: np.ndarray, control: int, target: int) -> np.ndarray:
        """Apply CNOT gate between control and target qubits."""
        new_state = state.copy()

        for i in range(self.n_states):
            if (i >> (self.n_qubits - 1 - control)) & 1:
                j = i ^ (1 << (self.n_qubits - 1 - target))
                if j > i:
                    new_state[i], new_state[j] = state[j], state[i]

        return new_state

    # ===================================================================
    # CIRCUIT EXECUTION
    # ===================================================================

    def _encode_features(self, features: np.ndarray) -> np.ndarray:
        """
        Amplitude encoding: Classical data -> Quantum state.

        Steps:
        1. Initialize |000000>
        2. Hadamard layer -> uniform superposition
        3. Ry rotations with angles = feature x pi
        """
        state = np.zeros(self.n_states, dtype=complex)
        state[0] = 1.0

        for q in range(self.n_qubits):
            state = self._apply_single_qubit_gate(state, self._hadamard(), q)

        for q in range(min(self.n_qubits, len(features))):
            angle = features[q] * np.pi
            state = self._apply_single_qubit_gate(state, self._ry(angle), q)

        return state

    def _variational_layer(self, state: np.ndarray, layer_params: np.ndarray) -> np.ndarray:
        """
        Single variational layer.

        Structure:
        1. Rx, Ry, Rz rotations on each qubit (18 params)
        2. CNOT ring: q0->q1, q1->q2, ..., q5->q0
        """
        for q in range(self.n_qubits):
            idx = q * 3
            theta_x = layer_params[idx]
            theta_y = layer_params[idx + 1]
            theta_z = layer_params[idx + 2]

            state = self._apply_single_qubit_gate(state, self._rx(theta_x), q)
            state = self._apply_single_qubit_gate(state, self._ry(theta_y), q)
            state = self._apply_single_qubit_gate(state, self._rz(theta_z), q)

        for q in range(self.n_qubits):
            control = q
            target = (q + 1) % self.n_qubits
            state = self._apply_cnot(state, control, target)

        return state

    def _run_circuit(self, features: np.ndarray, params: np.ndarray = None) -> np.ndarray:
        """
        Execute full quantum circuit.

        Returns:
            Measurement probabilities (64 values for 6 qubits)
        """
        if params is None:
            if self.params is None:
                # Auto-initialize with random params for inference
                self._init_random_params()
            params = self.params

        state = self._encode_features(features)

        params_per_layer = self.n_qubits * 3
        for layer in range(self.n_layers):
            start_idx = layer * params_per_layer
            end_idx = start_idx + params_per_layer
            layer_params = params[start_idx:end_idx]
            state = self._variational_layer(state, layer_params)

        probs = np.abs(state) ** 2
        probs = probs / np.sum(probs)

        return probs

    def _probs_to_classes(self, probs: np.ndarray) -> np.ndarray:
        """
        Map 64 measurement outcomes to 8 fault classes.

        Method: Modular arithmetic — Outcome k -> class (k mod 8)
        """
        n_classes = len(self.FAULT_TYPES)
        class_probs = np.zeros(n_classes)

        for i, p in enumerate(probs):
            class_probs[i % n_classes] += p

        return class_probs / np.sum(class_probs)

    # ===================================================================
    # TRAINING
    # ===================================================================

    def _cross_entropy_loss(self, params: np.ndarray, X: np.ndarray, y: np.ndarray) -> float:
        """
        Cross-entropy loss for classification.

        Loss = -sum( y_true * log(y_pred) )

        With numerical stability improvements.
        """
        total_loss = 0.0
        n_samples = len(X)

        for i in range(n_samples):
            probs = self._run_circuit(X[i], params)
            class_probs = self._probs_to_classes(probs)
            class_probs = np.clip(class_probs, 1e-10, 1.0)
            loss = -np.sum(y[i] * np.log(class_probs))
            total_loss += loss

        return total_loss / n_samples

    def train(self,
              X_train: np.ndarray,
              y_train: np.ndarray,
              X_val: np.ndarray = None,
              y_val: np.ndarray = None,
              max_iter: int = 200,
              batch_size: int = 16,
              verbose: bool = True) -> Dict:
        """
        Train quantum circuit via Nelder-Mead optimization.

        Args:
            X_train: Training features, shape (n_samples, n_features)
                     Values should be normalized to [0, 1]
            y_train: Training labels, integers 0-7 for 8 fault types
            X_val: Validation features (optional)
            y_val: Validation labels (optional)
            max_iter: Maximum optimization iterations
            batch_size: Mini-batch size (smaller = better gradients but slower)
            verbose: Print progress

        Returns:
            Training history dict
        """
        print(f"\n{'='*70}")
        print("TRAINING QUANTUM VQC")
        print(f"{'='*70}")
        print(f"   Training samples: {len(X_train)}")
        print(f"   Parameters: {self.n_params}")
        print(f"   Max iterations: {max_iter}")
        print(f"   Batch size: {batch_size}")

        n_classes = len(self.FAULT_TYPES)
        y_train_onehot = np.eye(n_classes)[y_train]

        if y_val is not None:
            y_val_onehot = np.eye(n_classes)[y_val]
            print(f"   Validation samples: {len(X_val)}")

        # Initialize parameters with smaller range for better convergence
        self.params = self.rng.uniform(-np.pi/2, np.pi/2, size=self.n_params)

        self.train_losses = []
        self.val_losses = []

        iteration = [0]
        def callback(params):
            iteration[0] += 1

            if iteration[0] % 20 == 0 or iteration[0] == 1:
                train_batch_size = min(batch_size, len(X_train))
                train_loss = self._cross_entropy_loss(
                    params,
                    X_train[:train_batch_size],
                    y_train_onehot[:train_batch_size]
                )
                self.train_losses.append(train_loss)

                if X_val is not None:
                    val_loss = self._cross_entropy_loss(params, X_val, y_val_onehot)
                    self.val_losses.append(val_loss)

                    if verbose:
                        print(f"   Iter {iteration[0]:3d} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f}")
                else:
                    if verbose:
                        print(f"   Iter {iteration[0]:3d} | Train Loss: {train_loss:.4f}")

        def objective(params):
            idx = self.rng.choice(len(X_train), size=min(batch_size, len(X_train)), replace=False)
            return self._cross_entropy_loss(params, X_train[idx], y_train_onehot[idx])

        print(f"\nStarting Nelder-Mead optimization...")
        start_time = time.time()

        result = minimize(
            objective,
            self.params,
            method='Nelder-Mead',
            callback=callback,
            options={
                'maxiter': max_iter,
                'xatol': 1e-4,
                'fatol': 1e-4,
                'adaptive': True
            }
        )

        training_time = time.time() - start_time

        self.params = result.x
        self.is_trained = True

        print(f"\nTraining completed!")
        print(f"   Time: {training_time:.1f}s")
        print(f"   Final loss: {result.fun:.4f}")
        print(f"   Total iterations: {result.nit}")
        print(f"   Success: {result.success}")

        if not result.success:
            print(f"   Warning: Optimization may not have fully converged")
            print(f"   Message: {result.message}")

        return {
            'train_losses': self.train_losses,
            'val_losses': self.val_losses,
            'final_loss': float(result.fun),
            'iterations': result.nit,
            'training_time': training_time,
            'success': result.success
        }

    # ===================================================================
    # PREDICTION (Compatible with existing integration)
    # ===================================================================

    def _rogers_ratio(self, dga: Dict[str, float]) -> str:
        """Rogers Ratio method."""
        h2 = dga.get("h2", 0)
        ch4 = dga.get("ch4", 0)
        c2h2 = dga.get("c2h2", 0)
        c2h4 = dga.get("c2h4", 0)
        c2h6 = dga.get("c2h6", 0)

        r1 = ch4 / max(h2, 0.01)
        r2 = c2h2 / max(c2h4, 0.01)
        r5 = c2h4 / max(c2h6, 0.01)

        if r2 < 0.1 and r5 < 1.0:
            return "Normal"
        elif r1 >= 0.1 and r1 < 1.0 and r2 < 0.1 and r5 >= 1.0 and r5 < 3.0:
            return "PD"
        elif r2 >= 1.0:
            return "D1" if r1 < 0.1 else "D2"
        elif r5 >= 3.0:
            return "T2" if r1 < 1.0 else "T3"
        elif r5 >= 1.0 and r5 < 3.0 and r2 >= 0.1:
            return "T1"
        else:
            return "DT"

    def _duval_triangle(self, ch4: float, c2h4: float, c2h2: float) -> str:
        """Duval Triangle method."""
        total = ch4 + c2h4 + c2h2
        if total < 0.01:
            return "Normal"

        pct_ch4 = ch4 / total * 100
        pct_c2h4 = c2h4 / total * 100
        pct_c2h2 = c2h2 / total * 100

        if pct_c2h2 > 29:
            return "D2"
        elif pct_c2h2 > 13:
            return "D1"
        elif pct_c2h4 > 64:
            return "T3"
        elif pct_c2h4 > 40:
            return "T2"
        elif pct_c2h4 > 20:
            return "T1" if pct_c2h2 < 4 else "DT"
        elif pct_ch4 > 98:
            return "PD"
        else:
            return "Normal"

    def predict(self, features: np.ndarray) -> Dict[str, Any]:
        """
        Run quantum + classical ensemble prediction.

        This matches the interface expected by main.py and ensemble.py.

        Args:
            features: Normalized sensor array
                      [temp, load, h2, ch4, c2h2, c2h4, c2h6, moisture, vibration]

        Returns:
            Dict with fault_type, risk_score, confidence, quantum_probs, etc.
        """
        # Quantum circuit measurement
        probs = self._run_circuit(features[:self.n_qubits])
        class_probs = self._probs_to_classes(probs)

        quantum_class_idx = np.argmax(class_probs)
        quantum_class = self.FAULT_TYPES[quantum_class_idx]
        quantum_confidence = float(class_probs[quantum_class_idx])

        # Classical DGA analysis (for ensemble)
        dga_values = {
            "h2": features[2] * 500 if len(features) > 2 else 0,
            "ch4": features[3] * 200 if len(features) > 3 else 0,
            "c2h2": features[4] * 50 if len(features) > 4 else 0,
            "c2h4": features[5] * 200 if len(features) > 5 else 0,
            "c2h6": features[6] * 100 if len(features) > 6 else 0,
        }

        rogers_class = self._rogers_ratio(dga_values)
        duval_class = self._duval_triangle(
            dga_values["ch4"],
            dga_values["c2h4"],
            dga_values["c2h2"]
        )

        # Simple 3-way voting (quantum, rogers, duval)
        from collections import Counter
        votes = [quantum_class, rogers_class, duval_class]
        vote_counts = Counter(votes)
        final_class = vote_counts.most_common(1)[0][0]

        # Risk score
        normal_votes = sum(1 for v in votes if v == "Normal")

        if normal_votes >= 2:
            risk_score = 0.05 + 0.1 * (1.0 - class_probs[0])
        elif normal_votes == 1:
            risk_score = 0.3 + 0.2 * (1.0 - class_probs[0])
        else:
            risk_score = 0.6 + 0.3 * (1.0 - class_probs[0])

        # Severity boost
        if final_class in ["D2", "T3", "DT"]:
            risk_score = min(1.0, risk_score * 1.3)

        risk_score = np.clip(risk_score, 0.0, 1.0)

        return {
            "fault_type": final_class,
            "risk_score": float(risk_score),
            "confidence": float(quantum_confidence),
            "quantum_class": quantum_class,
            "rogers_class": rogers_class,
            "duval_class": duval_class,
            "class_probabilities": {
                self.FAULT_TYPES[i]: float(class_probs[i])
                for i in range(len(self.FAULT_TYPES))
            },
            "model": "QuantumVQC",
            "qubits": self.n_qubits,
            "layers": self.n_layers,
            "accelerator": "NumPy (CPU)",
            "trained": self.is_trained
        }

    # ===================================================================
    # MODEL PERSISTENCE
    # ===================================================================

    def save(self, filepath: str):
        """Save trained model."""
        model_data = {
            'params': self.params,
            'n_qubits': self.n_qubits,
            'n_layers': self.n_layers,
            'train_losses': self.train_losses,
            'val_losses': self.val_losses,
            'is_trained': self.is_trained
        }
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
        print(f"Model saved to {filepath}")

    def load(self, filepath: str):
        """Load trained model."""
        with open(filepath, 'rb') as f:
            model_data = pickle.load(f)

        self.params = model_data['params']
        self.n_qubits = model_data['n_qubits']
        self.n_layers = model_data['n_layers']
        self.train_losses = model_data.get('train_losses', [])
        self.val_losses = model_data.get('val_losses', [])
        self.is_trained = model_data.get('is_trained', True)

        self.n_states = 2 ** self.n_qubits
        self.n_params = self.n_layers * self.n_qubits * 3

        print(f"Model loaded from {filepath}")
