"""
Real-Time Transformer Fault Monitoring System
==============================================
Dual-model architecture for continuous monitoring and fault diagnosis:

Model 1: ETT Anomaly Detector (trained on ETTm1 + ETTm2)
  - Monitors operational patterns 24/7
  - Physics-informed feature engineering
  - Detects abnormal conditions in real-time
  
Model 2: DGA Fault Classifier (trained on DGA chemistry data)
  - Diagnoses specific fault types
  - Activated when DGA tests are performed
  - Uses Rogers ratios + gas chemistry

Workflow:
1. ETT model continuously monitors → flags high-risk conditions
2. User performs DGA test when alerted
3. DGA model classifies fault type and severity
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score, f1_score
import xgboost as xgb
import lightgbm as lgb
from catboost import CatBoostClassifier
from scipy import stats
from scipy.signal import find_peaks
import warnings
warnings.filterwarnings('ignore')

import pandas as pd
import numpy as np
# Add these:
import multiprocessing as mp
from joblib import Parallel, delayed

try:
    from quantum_vqc import QuantumVQC
    QUANTUM_AVAILABLE = True
except ImportError:
    QUANTUM_AVAILABLE = False

# Then modify the create_all_features function:
@staticmethod
def create_all_features(df):
    """Combine all physics-informed features (optimized)"""
    print("🔬 Generating physics-informed features...")
    
    all_features = pd.concat([
        # DON'T include original df here - it causes the issue
        # df,  <-- REMOVE THIS LINE
        PhysicsInformedFeatures.thermal_features(df),
        PhysicsInformedFeatures.electrical_load_features(df),
        PhysicsInformedFeatures.thermodynamic_coupling_features(df),
        PhysicsInformedFeatures.insulation_degradation_indicators(df),
    ], axis=1)
    
    all_features = all_features.iloc[96:]
    
    print(f"  ✓ Generated {len(all_features.columns)} physics-based features")
    return all_features

@staticmethod
def _process_single(df):
    """Process single transformer"""
    return pd.concat([
        df,
        PhysicsInformedFeatures.thermal_features(df),
        PhysicsInformedFeatures.electrical_load_features(df),
        PhysicsInformedFeatures.thermodynamic_coupling_features(df),
        PhysicsInformedFeatures.insulation_degradation_indicators(df),
        PhysicsInformedFeatures.statistical_anomaly_features(df),
        PhysicsInformedFeatures.frequency_domain_features(df)
    ], axis=1).iloc[672:]


# ================================
# PART 1: ETT ANOMALY DETECTOR
# ================================

class PhysicsInformedFeatures:
    """
    Advanced physics-based feature engineering for electrical transformers
    Based on thermodynamic principles, electrical theory, and material science
    """
    
    @staticmethod
    def thermal_features(df):
        """Thermal stress and heat transfer physics"""
        features = pd.DataFrame(index=df.index)
        
        # Oil temperature (OT) analysis
        features['OT_mean'] = df['OT'].rolling(window=96, min_periods=1).mean()  # 24h average
        features['OT_std'] = df['OT'].rolling(window=96, min_periods=1).std()
        features['OT_rate_of_change'] = df['OT'].diff()
        features['OT_acceleration'] = df['OT'].diff().diff()  # Second derivative
        
        # Thermal stress index (deviation from normal operating temp)
        NORMAL_TEMP = 60.0  # Typical transformer oil temp
        features['thermal_stress'] = (df['OT'] - NORMAL_TEMP).abs()
        features['thermal_stress_cumulative'] = features['thermal_stress'].rolling(24).sum()
        
        # Temperature gradient (spatial variation proxy)
        # HUFL, HULL, MUFL, MULL, LUFL, LULL represent different locations
        features['temp_gradient_high'] = df['HUFL'] - df['HULL']
        features['temp_gradient_mid'] = df['MUFL'] - df['MULL']
        features['temp_gradient_low'] = df['LUFL'] - df['LULL']
        features['temp_gradient_vertical'] = (df['HUFL'] + df['HULL']) - (df['LUFL'] + df['LULL'])
        
        # Heat capacity stress (rapid temp changes indicate thermal events)
        features['thermal_inertia'] = df['OT'].rolling(12).std() / (df['OT'].rolling(24).std() + 1e-6)
        
        # Hotspot identification (abnormal local heating)
        features['hotspot_indicator'] = df[['HUFL', 'MUFL', 'LUFL']].max(axis=1) - df[['HULL', 'MULL', 'LULL']].min(axis=1)
        
        return features
    
    @staticmethod
    def electrical_load_features(df):
        """Electrical loading and stress analysis"""
        features = pd.DataFrame(index=df.index)
        
        # Load analysis (HUFL = High Useful Load, etc.)
        features['total_load'] = df['HUFL'] + df['MUFL'] + df['LUFL']
        features['load_imbalance'] = df[['HUFL', 'MUFL', 'LUFL']].std(axis=1)
        features['load_mean_24h'] = features['total_load'].rolling(24).mean()
        features['load_std_24h'] = features['total_load'].rolling(24).std()
        
        # Load factor (capacity utilization)
        features['load_factor'] = features['total_load'] / (features['total_load'].rolling(96).max() + 1e-6)  # vs. weekly max
        
        # Load rate of change (sudden load changes stress insulation)
        features['load_roc'] = features['total_load'].diff()
        features['load_roc_variance'] = features['load_roc'].rolling(24).var()
        
        # Cyclic loading stress (daily/weekly patterns)
        features['load_cyclicity'] = features['total_load'].rolling(24).apply(
            lambda x: np.abs(np.fft.fft(x)[1]) if len(x) == 96 else 0
        )
        
        # Peak load stress
        features['peak_load_ratio'] = features['total_load'] / features['total_load'].rolling(96).mean()
        
        return features
    
    @staticmethod
    def thermodynamic_coupling_features(df):
        """Coupled thermal-electrical phenomena"""
        features = pd.DataFrame(index=df.index)
        
        # Joule heating indicator (I²R losses)
        # Higher load + higher temp = resistive heating
        features['joule_heating_proxy'] = (df['HUFL'] + df['MUFL'] + df['LUFL']) * df['OT']
        
        # Thermal runaway risk (positive feedback: heat → resistance → more heat)
        features['thermal_runaway_risk'] = (
            df['OT'].diff() * (df['HUFL'] + df['MUFL'] + df['LUFL']).diff()
        ).rolling(24).sum()
        
        # Load-temperature correlation (should be positive in healthy transformer)
        features['load_temp_correlation'] = df['OT'].rolling(24).corr(
            (df['HUFL'] + df['MUFL'] + df['LUFL'])
        )
        
        # Thermal time constant violation (temp changes too fast for load change)
        load_change = (df['HUFL'] + df['MUFL'] + df['LUFL']).pct_change()
        temp_change = df['OT'].pct_change()
        features['thermal_response_anomaly'] = (temp_change / (load_change + 1e-6)).abs()
        
        return features
    
    @staticmethod
    def insulation_degradation_indicators(df):
        """Insulation aging and degradation physics"""
        features = pd.DataFrame(index=df.index)
        
        # Arrhenius aging (exponential with temperature)
        # Aging rate doubles every 6°C above 110°C
        REFERENCE_TEMP = 110.0
        features['arrhenius_aging'] = np.exp((df['OT'] - REFERENCE_TEMP) / 6.0)
        features['cumulative_aging'] = features['arrhenius_aging'].rolling(96).sum()  # Weekly
        
        # Moisture ingress indicator (temp cycling causes breathing)
        features['breathing_cycles'] = (df['OT'].diff().abs() > 5).rolling(24).sum()
        
        # Dielectric stress (high voltage + high temp)
        # Proxy: high load at high temp stresses insulation
        features['dielectric_stress'] = df['OT'] * (df['HUFL'] + df['MUFL'] + df['LUFL']) / 100
        
        return features
    
    @staticmethod
    def statistical_anomaly_features(df):
        """Statistical process control features"""
        features = pd.DataFrame(index=df.index)
        
        # Z-scores (how many std deviations from mean)
        for col in ['OT', 'HUFL', 'MUFL', 'LUFL']:
            rolling_mean = df[col].rolling(96).mean()
            rolling_std = df[col].rolling(96).std()
            features[f'{col}_zscore'] = (df[col] - rolling_mean) / (rolling_std + 1e-6)
        
        # Entropy (randomness in sensor readings)
        for col in ['OT', 'HUFL']:
            features[f'{col}_entropy'] = df[col].rolling(24).apply(
                lambda x: stats.entropy(np.histogram(x, bins=10)[0] + 1)
            )
        
        # Hurst exponent (long-term memory indicator)
        def hurst_exponent(ts):
            """Simplified Hurst calculation"""
            if len(ts) < 20:
                return 0.5
            lags = range(2, min(20, len(ts)//2))
            tau = [np.std(np.subtract(ts[lag:], ts[:-lag])) for lag in lags]
            return np.polyfit(np.log(lags), np.log(tau), 1)[0]
        
        features['OT_hurst'] = df['OT'].rolling(24).apply(hurst_exponent)
        
        return features
    
    @staticmethod
    def frequency_domain_features(df):
        """Frequency analysis for cyclic patterns"""
        features = pd.DataFrame(index=df.index)
        
        # Dominant frequency (daily, weekly cycles)
        def dominant_freq(x):
            if len(x) < 96:
                return 0
            fft = np.fft.fft(x)
            power = np.abs(fft[:len(x)//2])
            return np.argmax(power) if len(power) > 0 else 0
        
        features['OT_dominant_freq'] = df['OT'].rolling(24).apply(dominant_freq)
        
        # Spectral entropy (complexity of signal)
        def spectral_entropy(x):
            if len(x) < 96:
                return 0
            power = np.abs(np.fft.fft(x)[:len(x)//2])**2
            power_norm = power / (power.sum() + 1e-10)
            return -np.sum(power_norm * np.log2(power_norm + 1e-10))
        
        features['OT_spectral_entropy'] = df['OT'].rolling(24).apply(spectral_entropy)
        
        return features
    
    @staticmethod
    @staticmethod
    def create_all_features(df):
        """Combine all physics-informed features (optimized)"""
        print("🔬 Generating physics-informed features...")
        
        all_features = pd.concat([
            df,
            PhysicsInformedFeatures.thermal_features(df),
            PhysicsInformedFeatures.electrical_load_features(df),
            PhysicsInformedFeatures.thermodynamic_coupling_features(df),
            PhysicsInformedFeatures.insulation_degradation_indicators(df),
            # Skip these slow ones:
            # PhysicsInformedFeatures.statistical_anomaly_features(df),
            # PhysicsInformedFeatures.frequency_domain_features(df)
        ], axis=1)
        
        all_features = all_features.iloc[96:]  # Only 24h warmup instead of 1 week
        
        print(f"  ✓ Generated {len(all_features.columns) - 8} physics-based features")
        return all_features


class ETTDataLoader:
    """Load and preprocess ETT sensor data"""
    
    @staticmethod
    def load_and_combine(paths):
        """Load multiple ETT files"""
        dfs = []
        for i, path in enumerate(paths, 1):
            df = pd.read_csv(path)
            df.columns = ['date', 'HUFL', 'HULL', 'MUFL', 'MULL', 'LUFL', 'LULL', 'OT']
            df['date'] = pd.to_datetime(df['date'])
            df['transformer_id'] = f'T{i:03d}'
            dfs.append(df)
            print(f"  ✓ Loaded {path}: {len(df):,} samples")
        
        combined = pd.concat(dfs, ignore_index=True)
        combined = combined.sort_values(['transformer_id', 'date'])
        return combined
    
    @staticmethod
    def create_anomaly_labels(df):
        """
        Create synthetic anomaly labels based on extreme conditions
        (In production, use historical fault records)
        """
        anomalies = (
            (df['OT'] > df['OT'].quantile(0.95)) |  # Extreme temperature
            (df['OT'].diff().abs() > df['OT'].diff().abs().quantile(0.98)) |  # Rapid temp change
            ((df['HUFL'] + df['MUFL'] + df['LUFL']) > 
             (df['HUFL'] + df['MUFL'] + df['LUFL']).quantile(0.95))  # Extreme load
        )
        
        # Add some temporal context (anomalies tend to cluster)
        anomaly_clusters = anomalies.rolling(12, center=True).sum() >= 3
        
        return anomaly_clusters.astype(int)


class ETTAnomalyEnsemble:
    """Ensemble model for ETT anomaly detection"""
    
    def __init__(self):
        self.models = {
            'xgboost': xgb.XGBClassifier(
                n_estimators=150,
                enable_categorical=False,  # Add this
                max_depth=6,
                learning_rate=0.05,
                subsample=0.8,
                colsample_bytree=0.8,
                scale_pos_weight=5,  # Handle class imbalance
                random_state=42,
                eval_metric='logloss'
            ),
            'lightgbm': lgb.LGBMClassifier(
                n_estimators=150,
                feature_name='auto',  # Add this
                max_depth=6,
                learning_rate=0.05,
                subsample=0.8,
                colsample_bytree=0.8,
                class_weight='balanced',
                random_state=42,
                verbose=-1
            ),
            'catboost': CatBoostClassifier(
                iterations=150,
                depth=6,
                learning_rate=0.05,
                class_weights=[1, 5],  # Higher weight for anomalies
                random_state=42,
                verbose=False
            ),
            'rf': RandomForestClassifier(
                n_estimators=150,
                max_depth=12,
                min_samples_split=20,
                class_weight='balanced',
                random_state=42
            )
        }
        self.scaler = RobustScaler()  # Robust to outliers
        self.feature_names = None
        self.weights = None
    
    def fit(self, X, y):
        """Train ensemble"""
        self.feature_names = X.columns.tolist()
        
        # FIX: Replace inf and NaN values
        X = X.replace([np.inf, -np.inf], np.nan)
        X = X.fillna(0)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        X_scaled = pd.DataFrame(X_scaled, columns=self.feature_names)
        
        print(f"\n{'='*80}")
        print(f"🤖 TRAINING ETT ANOMALY DETECTOR ENSEMBLE")
        print(f"{'='*80}")
        print(f"Training samples: {len(X):,} | Anomalies: {y.sum():,} ({y.mean()*100:.1f}%)")
        
        scores = {}
        for name, model in self.models.items():
            print(f"\n[{name}] Training...")
            model.fit(X_scaled, y)
            
            # Cross-validation
            cv_scores = cross_val_score(model, X_scaled, y, cv=3, scoring='f1')
            scores[name] = cv_scores.mean()
            print(f"  ✓ CV F1-Score: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")
        
        # Weight by performance
        total = sum(scores.values())
        self.weights = {name: score / total for name, score in scores.items()}
        print(f"\n✓ Model weights: {self.weights}")
    
    def predict_proba(self, X):
        """Weighted ensemble probability"""
        # FIX: Replace inf and NaN values
        X = X.replace([np.inf, -np.inf], np.nan)
        X = X.fillna(0)
        
        X_scaled = self.scaler.transform(X)
        X_scaled = pd.DataFrame(X_scaled, columns=self.feature_names)
        
        proba = np.zeros((len(X), 2))
        for name, model in self.models.items():
            proba += self.weights[name] * model.predict_proba(X_scaled)
        
        return proba
    
    def predict_risk_score(self, X):
        """Return risk score 0-100%"""
        # Replace inf and NaN
        X = X.replace([np.inf, -np.inf], np.nan)
        X = X.fillna(0)

        # Convert to numpy immediately
        if isinstance(X, pd.DataFrame):
            X = X.values
        
        # Scale (works with numpy)
        X_scaled = self.scaler.transform(X)
        
        # Predict (already numpy, no feature name issues)
        proba = np.zeros((len(X_scaled), 2))
        for name, model in self.models.items():
            proba += self.weights[name] * model.predict_proba(X_scaled)
        
        return proba[:, 1] * 100
    
    def get_feature_importance(self):
        """Aggregate feature importance"""
        importance = np.zeros(len(self.feature_names))
        
        for name, model in self.models.items():
            if hasattr(model, 'feature_importances_'):
                importance += self.weights[name] * model.feature_importances_
        
        return pd.DataFrame({
            'feature': self.feature_names,
            'importance': importance
        }).sort_values('importance', ascending=False)


# ================================
# PART 2: DGA FAULT CLASSIFIER
# ================================

class DGAFeatureEngineering:
    """Rogers ratios and chemistry-based features"""
    
    @staticmethod
    def calculate_rogers_ratios(df):
        """IEEE C57.104 Rogers Ratios"""
        epsilon = 1e-6
        
        df['R1'] = df['Methane'] / (df['Hydrogen'] + epsilon)
        df['R2'] = df['Ethylene'] / (df['Ethane'] + epsilon)
        df['R3'] = df['Acethylene'] / (df['Ethylene'] + epsilon)
        df['R4'] = df['Acethylene'] / (df['Methane'] + epsilon)
        df['R5'] = df['CO'] / (df['CO2'] + epsilon)
        
        return df
    
    @staticmethod
    def calculate_duval_features(df):
        """Duval triangle coordinates"""
        total = df['Methane'] + df['Ethylene'] + df['Acethylene'] + 1e-6
        
        df['duval_CH4'] = 100 * df['Methane'] / total
        df['duval_C2H4'] = 100 * df['Ethylene'] / total
        df['duval_C2H2'] = 100 * df['Acethylene'] / total
        
        return df
    
    @staticmethod
    def gas_ratios_and_totals(df):
        """Additional gas-based features"""
        # Total combustible gases
        df['TCG'] = (df['Hydrogen'] + df['Methane'] + df['Ethane'] + 
                     df['Ethylene'] + df['Acethylene'])
        
        # Hydrocarbon ratios
        df['HC_ratio'] = (df['Methane'] + df['Ethane']) / (df['Ethylene'] + df['Acethylene'] + 1e-6)
        
        # Gas proportions
        df['H2_proportion'] = df['Hydrogen'] / (df['TCG'] + 1e-6)
        df['C2H2_proportion'] = df['Acethylene'] / (df['TCG'] + 1e-6)
        
        return df
    
    @staticmethod
    def classify_fault_ieee(row):
        """
        IEEE C57.104 fault classification
        Returns: 0=Normal, 1=Thermal, 2=Discharge, 3=Arcing
        """
        r1, r2, r3 = row['R1'], row['R2'], row['R3']
        
        # Normal operation
        if r1 < 0.1 and r2 < 1.0 and r3 < 0.1:
            return 0
        
        # Thermal faults (T1, T2, T3)
        if r1 > 1.0 and r2 < 1.0:
            return 1
        
        # Arcing (high energy discharge)
        if r2 > 1.0 and r3 > 0.5:
            return 3
        
        # Low energy discharge
        if r1 < 1.0 and r2 > 1.0 and r3 < 0.5:
            return 2
        
        # Partial discharge
        if r1 < 0.1 and r3 < 0.1:
            return 2
        
        return 1  # Default to thermal


class DGAFaultEnsemble:
    """Ensemble for DGA fault classification"""
    
    def __init__(self):
        self.models = {
            'xgboost': xgb.XGBClassifier(
                n_estimators=200,
                max_depth=5,
                learning_rate=0.05,
                random_state=42,
                eval_metric='mlogloss'
            ),
            'lightgbm': lgb.LGBMClassifier(
                n_estimators=200,
                max_depth=5,
                learning_rate=0.05,
                random_state=42,
                verbose=-1
            ),
            'catboost': CatBoostClassifier(
                iterations=200,
                depth=5,
                learning_rate=0.05,
                random_state=42,
                verbose=False
            ),
            'rf': RandomForestClassifier(
                n_estimators=200,
                max_depth=10,
                random_state=42
            )
        }
        self.scaler = StandardScaler()
        self.feature_names = None
        self.weights = None
        self.fault_types = ['Normal', 'Thermal', 'Discharge', 'Arcing']
    
    def fit(self, X, y):
        """Train ensemble"""
        self.feature_names = X.columns.tolist()
        
        X_scaled = self.scaler.fit_transform(X)
        X_scaled = pd.DataFrame(X_scaled, columns=self.feature_names)
        
        print(f"\n{'='*80}")
        print(f"🧪 TRAINING DGA FAULT CLASSIFIER ENSEMBLE")
        print(f"{'='*80}")
        print(f"Training samples: {len(X):,}")
        print(f"Fault distribution: {dict(pd.Series(y).value_counts())}")
        
        scores = {}
        for name, model in self.models.items():
            print(f"\n[{name}] Training...")
            model.fit(X_scaled, y)
            
            cv_scores = cross_val_score(model, X_scaled, y, cv=3, scoring='f1_weighted')
            scores[name] = cv_scores.mean()
            print(f"  ✓ CV F1-Score: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")
        
        total = sum(scores.values())
        self.weights = {name: score / total for name, score in scores.items()}
        print(f"\n✓ Model weights: {self.weights}")
    
    def predict(self, X):
        """Ensemble prediction"""
        X_scaled = self.scaler.transform(X)
        X_scaled = pd.DataFrame(X_scaled, columns=self.feature_names)
        
        # Weighted voting
        predictions = np.zeros((len(X), len(self.fault_types)))
        
        for name, model in self.models.items():
            pred = model.predict(X_scaled)
            for i, p in enumerate(pred):
                predictions[i, p] += self.weights[name]
        
        return np.argmax(predictions, axis=1)
    
    def predict_with_confidence(self, X):
        """Return prediction and confidence"""
        X_scaled = self.scaler.transform(X)
        X_scaled = pd.DataFrame(X_scaled, columns=self.feature_names)
        
        # Get probability from each model
        proba_sum = np.zeros((len(X), len(self.fault_types)))
        
        for name, model in self.models.items():
            if hasattr(model, 'predict_proba'):
                proba_sum += self.weights[name] * model.predict_proba(X_scaled)
        
        predictions = np.argmax(proba_sum, axis=1)
        confidences = np.max(proba_sum, axis=1)
        
        return predictions, confidences


# ================================
# MAIN PIPELINE
# ================================

class RealTimeMonitoringSystem:
    """Complete dual-model monitoring system"""
    
    def __init__(self):
        self.ett_model = None
        self.dga_model = None
        self.quantum_model = QuantumVQC() if QUANTUM_AVAILABLE else None

        # Debug: Check if quantum loaded
        if self.quantum_model:
            print("🔬 Quantum VQC loaded successfully!")
        else:
            print("⚠️ Quantum VQC not available")
    
    def train_ett_model(self, ett_train_paths, ett_test_path=None):
        """Train ETT anomaly detector"""
        print(f"\n{'='*80}")
        print(f"📊 TRAINING ETT ANOMALY DETECTOR")
        print(f"{'='*80}")
        
        # Load data
        print("\n📁 Loading ETT data...")
        ett_df = ETTDataLoader.load_and_combine(ett_train_paths)
        
        # Generate physics-informed features
        ett_features = PhysicsInformedFeatures.create_all_features(ett_df)
        
        # Create labels (in production: use historical fault records)
        print("\n🏷️ Creating anomaly labels...")
        labels = ETTDataLoader.create_anomaly_labels(ett_features)
        
        # Prepare features
        exclude_cols = ['date', 'transformer_id']
        feature_cols = [c for c in ett_features.columns if c not in exclude_cols]
        
        X = ett_features[feature_cols]
        y = labels
        
        # Train/test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        print(f"\n✓ Train: {len(X_train):,} | Test: {len(X_test):,}")
        print(f"✓ Features: {len(feature_cols)}")
        
        # Train ensemble
        self.ett_model = ETTAnomalyEnsemble()
        self.ett_model.fit(X_train, y_train)
        
        # Evaluate
        print(f"\n{'='*80}")
        print(f"📈 ETT MODEL EVALUATION")
        print(f"{'='*80}")
        
        y_pred = (self.ett_model.predict_proba(X_test)[:, 1] > 0.5).astype(int)
        
        print("\nClassification Report:")
        print(classification_report(y_test, y_pred, target_names=['Normal', 'Anomaly']))
        
        print("\nTop 15 Features:")
        importance = self.ett_model.get_feature_importance()
        for idx, row in importance.head(15).iterrows():
            print(f"  {row['feature']:35s} {row['importance']:.4f}")
        
        return self.ett_model
    
    def train_dga_model(self, dga_path):
        """Train DGA fault classifier"""
        print(f"\n{'='*80}")
        print(f"🧪 TRAINING DGA FAULT CLASSIFIER")
        print(f"{'='*80}")
        
        # Load DGA data
        print("\n📁 Loading DGA data...")
        dga_df = pd.read_csv(dga_path)
        print(f"  ✓ Loaded {len(dga_df):,} samples")
        
        # Feature engineering
        print("\n🔬 Engineering DGA features...")
        dga_df = DGAFeatureEngineering.calculate_rogers_ratios(dga_df)
        dga_df = DGAFeatureEngineering.calculate_duval_features(dga_df)
        dga_df = DGAFeatureEngineering.gas_ratios_and_totals(dga_df)
        
        # Create labels
        dga_df['fault_type'] = dga_df.apply(DGAFeatureEngineering.classify_fault_ieee, axis=1)
        
        # Prepare features
        feature_cols = ['Hydrogen', 'Oxigen', 'Nitrogen', 'Methane', 'CO', 'CO2',
                       'Ethylene', 'Ethane', 'Acethylene', 'DBDS', 'Power factor',
                       'Interfacial V', 'Dielectric rigidity', 'Water content',
                       'R1', 'R2', 'R3', 'R4', 'R5',
                       'duval_CH4', 'duval_C2H4', 'duval_C2H2',
                       'TCG', 'HC_ratio', 'H2_proportion', 'C2H2_proportion']
        
        # Remove missing columns
        feature_cols = [c for c in feature_cols if c in dga_df.columns]
        
        X = dga_df[feature_cols]
        y = dga_df['fault_type']
        
        # Train/test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        print(f"\n✓ Train: {len(X_train):,} | Test: {len(X_test):,}")
        print(f"✓ Features: {len(feature_cols)}")
        
        # Train ensemble
        self.dga_model = DGAFaultEnsemble()
        self.dga_model.fit(X_train, y_train)
        
        # Evaluate
        print(f"\n{'='*80}")
        print(f"📈 DGA MODEL EVALUATION")
        print(f"{'='*80}")
        
        y_pred, confidences = self.dga_model.predict_with_confidence(X_test)
        
        print("\nClassification Report:")
        print(classification_report(y_test, y_pred, 
              target_names=self.dga_model.fault_types))
        
        print("\nConfusion Matrix:")
        cm = confusion_matrix(y_test, y_pred)
        print(cm)
        
        return self.dga_model
    
    def save_models(self, filepath):
        """Save trained models"""
        import joblib  # Change from pickle
        import os
        
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        models = {
            'ett_model': self.ett_model,
            'dga_model': self.dga_model,
            'quantum_model': self.quantum_model
        }
        
        joblib.dump(models, filepath)  # Use joblib instead of pickle
        print(f"✓ Models saved to {filepath}")

    def load_models(self, filepath):
        """Load pre-trained models"""
        import joblib  # Change from pickle
        
        models = joblib.load(filepath)  # Use joblib instead of pickle
        
        self.ett_model = models['ett_model']
        self.dga_model = models['dga_model']
        self.quantum_model = models['quantum_model']

        print(f"✓ Models loaded from {filepath}")
    
    def _create_demo_features(self, current_reading):
        """Create features matching training exactly"""
        OT = current_reading.get('OT', 60)
        HUFL = current_reading.get('HUFL', 5.5)
        HULL = current_reading.get('HULL', 2.0)
        MUFL = current_reading.get('MUFL', 4.2)
        MULL = current_reading.get('MULL', 1.5)
        LUFL = current_reading.get('LUFL', 3.8)
        LULL = current_reading.get('LULL', 1.3)
        
        total_load = HUFL + MUFL + LUFL
        
        all_features = {
            # RAW SENSORS FIRST
            'HUFL': HUFL,
            'HULL': HULL,
            'MUFL': MUFL,
            'MULL': MULL,
            'LUFL': LUFL,
            'LULL': LULL,
            'OT': OT,
            
            # THEN physics features
            'OT_mean': OT,
            'OT_std': 2.0,
            'OT_rate_of_change': 0.1,
            'OT_acceleration': 0.01,
            'thermal_stress': abs(OT - 60),
            'thermal_stress_cumulative': abs(OT - 60) * 24,
            'temp_gradient_high': HUFL - HULL,
            'temp_gradient_mid': MUFL - MULL,
            'temp_gradient_low': LUFL - LULL,
            'temp_gradient_vertical': (HUFL + HULL) - (LUFL + LULL),
            'thermal_inertia': 1.0,
            'hotspot_indicator': max([HUFL, MUFL, LUFL]) - min([HULL, MULL, LULL]),
            'total_load': total_load,
            'load_imbalance': np.std([HUFL, MUFL, LUFL]),
            'load_mean_24h': total_load,
            'load_std_24h': 0.5,
            'load_factor': 0.7,
            'load_roc': 0.1,
            'load_roc_variance': 0.01,
            'load_cyclicity': 0.5,
            'peak_load_ratio': 1.1,
            'joule_heating_proxy': total_load * OT,
            'thermal_runaway_risk': 0.1,
            'load_temp_correlation': 0.8,
            'thermal_response_anomaly': 1.0,
            'arrhenius_aging': np.exp((OT - 110) / 6.0),
            'cumulative_aging': np.exp((OT - 110) / 6.0) * 96,
            'breathing_cycles': 0.0,
            'dielectric_stress': OT * total_load / 100,
        }
        
        df = pd.DataFrame([all_features])
        return df[self.ett_model.feature_names]
    

    
    def monitor_ett_realtime(self, current_reading):
        # Create features from raw reading
        features_df = self._create_demo_features(current_reading)
        # DEBUG: Print what model expects vs what we're giving
        print(f"Model expects: {self.ett_model.feature_names[:10]}...")  # First 10
        print(f"We're providing: {list(features_df.columns[:10])}...")
    
        
        # Predict risk
        risk_score = self.ett_model.predict_risk_score(features_df)[0]
        
        if risk_score > 70:
            status = 'HIGH_RISK'
            recommendation = '**Schedule DGA test immediately**'
        elif risk_score > 50:
            status = 'MODERATE_RISK'
            recommendation = '*Monitor closely* — consider DGA test within 48 hours'
        else:
            status = 'NORMAL'
            recommendation = 'Operating normally'
        
        return {
            'risk_score': risk_score,
            'status': status,
            'recommendation': recommendation
        }
    
    def analyze_dga(self, gas_measurements):
        # Prepare input
        dga_input = pd.DataFrame([gas_measurements])
        dga_input = DGAFeatureEngineering.calculate_rogers_ratios(dga_input)
        dga_input = DGAFeatureEngineering.calculate_duval_features(dga_input)
        dga_input = DGAFeatureEngineering.gas_ratios_and_totals(dga_input)
        
        # Classical prediction
        prediction, confidence = self.dga_model.predict_with_confidence(dga_input)
        classical_fault = self.dga_model.fault_types[prediction[0]]

        # If classical confidence is low, defer to Rogers method
        if confidence[0] < 0.6:  # Threshold: 70%
            # Get Rogers classification from quantum analysis
            quantum_features = np.array([...])  # Your existing code
            quantum_result = self.quantum_model.predict(quantum_features)
            
            # Use Rogers result instead
            rogers_fault_map = {
                'Normal': 'Normal',
                'PD': 'Discharge',
                'D1': 'Discharge',
                'D2': 'Arcing',
                'T1': 'Thermal',
                'T2': 'Thermal',
                'T3': 'Thermal',
                'DT': 'Thermal'
            }
            classical_fault = rogers_fault_map.get(quantum_result['rogers_class'], classical_fault)
            print(f"⚠️ Low confidence ({confidence[0]*100:.1f}%) - using Rogers method: {quantum_result['rogers_class']}")
        
        result = {
            'fault_type': classical_fault,
            'confidence': confidence[0],
            'recommendation': self._get_recommendation(classical_fault)
        }
        
        # Add quantum if available
        if self.quantum_model is not None:
            print("\n🔬 Running Quantum Analysis...")  # ADD THIS
            quantum_features = np.array([
                gas_measurements.get('OT', 60) / 100,
                gas_measurements.get('HUFL', 5) / 10,
                gas_measurements.get('Hydrogen', 0) / 1000,
                gas_measurements.get('Methane', 0) / 500,
                gas_measurements.get('Acethylene', 0) / 100,
                gas_measurements.get('Ethylene', 0) / 500,
                gas_measurements.get('Ethane', 0) / 200,
                gas_measurements.get('Water content', 0) / 100,
                0.5
            ])
            
            quantum_result = self.quantum_model.predict(quantum_features)
            
            from collections import Counter
            votes = [classical_fault, classical_fault, quantum_result['fault_type']]
            final_fault = Counter(votes).most_common(1)[0][0]
            
            result['fault_type'] = final_fault
            result['quantum_analysis'] = quantum_result
            print(f"✓ Quantum result: {quantum_result['fault_type']}")  # ADD THIS
        
        return result
    
    def _get_recommendation(self, fault_type):
        """Action recommendations by fault type"""
        recommendations = {
            'Normal': 'Continue regular monitoring',
            'Thermal': '**Thermal fault** detected — Reduce load, inspect cooling system',
            'Discharge': '**Electrical discharge** detected — Inspect insulation, schedule maintenance',
            'Arcing': '**CRITICAL:** Arcing detected — Immediate shutdown recommended'
        }
        return recommendations.get(fault_type, 'Review transformer condition')


# ================================
# EXECUTION
# ================================

if __name__ == "__main__":
    print(f"\n{'='*80}")
    print(f"🚀 REAL-TIME TRANSFORMER MONITORING SYSTEM")
    print(f"{'='*80}")
    
    # Initialize system
    system = RealTimeMonitoringSystem()
    
    # Train ETT model (ETTm1 + ETTm2 for training, ETTh1 for testing)
    import os

    # At the top of the file, add:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(BASE_DIR, 'models', 'transformer_monitoring.pkl') 
 
    # Check if models exist
    if os.path.exists(model_path):
        system.load_models(model_path)
    else:
        
        system.train_ett_model(
            ett_train_paths=[
                os.path.join(BASE_DIR, 'ETTm1.csv'),
                os.path.join(BASE_DIR, 'ETTm2.csv')
            ]
        )

        system.train_dga_model(os.path.join(BASE_DIR, 'transformer_dga_data.csv'))
        system.save_models(model_path)  # ADD THIS LINE
    
    print(f"\n{'='*80}")
    print(f"✅ SYSTEM READY FOR DEPLOYMENT")
    print(f"{'='*80}")
    print("\nDual-model monitoring system trained successfully!")
    print("Ready for real-time monitoring and fault diagnosis.")
    
    # Demo: Real-time monitoring
    print(f"\n{'='*80}")
    print(f"🎯 DEMO: REAL-TIME MONITORING")
    print(f"{'='*80}")
    
    # Simulate sensor reading (high risk scenario)
    demo_reading = {
        'HUFL': 8.5, 'HULL': 3.2, 'MUFL': 7.1, 'MULL': 2.8,
        'LUFL': 6.2, 'LULL': 2.1, 'OT': 85.0  # High temperature
    }
    
    print("\n📡 Current ETT Sensor Reading:")
    for k, v in demo_reading.items():
        print(f"  {k}: {v}")
    
    # Monitor
    result = system.monitor_ett_realtime(demo_reading)
    print(f"\n🎯 Risk Assessment:")
    print(f"  Risk Score: {result['risk_score']:.1f}%")
    print(f"  Status: {result['status']}")
    print(f"  {result['recommendation']}")
    
    # Demo: DGA analysis
    print(f"\n{'='*80}")
    print(f"🧪 DEMO: DGA ANALYSIS")
    print(f"{'='*80}")
    
    demo_dga = {
        'Hydrogen': 2845, 'Oxigen': 5860, 'Nitrogen': 27842,
        'Methane': 7406, 'CO': 32, 'CO2': 1344,
        'Ethylene': 16684, 'Ethane': 5467, 'Acethylene': 7,
        'DBDS': 19, 'Power factor': 1, 'Interfacial V': 45,
        'Dielectric rigidity': 55, 'Water content': 0
    }
    
    print("\n🧪 DGA Test Results:")
    print(f"  H₂: {demo_dga['Hydrogen']} ppm")
    print(f"  CH₄: {demo_dga['Methane']} ppm")
    print(f"  C₂H₄: {demo_dga['Ethylene']} ppm")
    
    #Analyze
    dga_result = system.analyze_dga(demo_dga)
    print(f"\n🎯 Fault Diagnosis:")
    print(f"  Fault Type: {dga_result['fault_type']}")
    print(f"  Confidence: {dga_result['confidence']*100:.1f}%")

    # Show quantum details if available
    if 'quantum_analysis' in dga_result:
        qa = dga_result['quantum_analysis']
        print(f"\n  🔬 Quantum Circuit Analysis:")
        
        # Map quantum codes to full names
        fault_names = {
            'Normal': 'Normal Operation',
            'PD': 'Partial Discharge',
            'D1': 'Low-Energy Discharge (Arcing)',
            'D2': 'High-Energy Discharge',
            'T1': 'Thermal Fault (<300°C)',
            'T2': 'Thermal Fault (300-700°C)',
            'T3': 'Thermal Fault (>700°C)',
            'DT': 'Discharge + Thermal (Combined)'
        }
        
        print(f"     Quantum Circuit: {qa['quantum_class']} - {fault_names.get(qa['quantum_class'], qa['quantum_class'])}")
        print(f"     Rogers Method: {qa['rogers_class']} - {fault_names.get(qa['rogers_class'], qa['rogers_class'])}")
        print(f"     Duval Triangle: {qa['duval_class']} - {fault_names.get(qa['duval_class'], qa['duval_class'])}")
        print(f"     Quantum Risk Score: {qa['risk_score']*100:.1f}%")

    print(f"\n  {dga_result['recommendation']}")
