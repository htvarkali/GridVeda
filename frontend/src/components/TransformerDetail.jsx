import React, { useState } from 'react';
import { Thermometer, Zap, Ruler, Cylinder, Droplets, Activity, BarChart3, FlaskConical, Brain, ArrowLeft, Loader2 } from 'lucide-react';
import TempLoadGraph from './TempLoadGraph';
import DGAGraph from './DGAGraph';
import VariablesGrid from './VariablesGrid';
import PerplexityPanel from './PerplexityPanel';

function TransformerDetail({ transformerId, telemetry, history, onBack, apiBase }) {
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const reading = telemetry?.readings?.[transformerId];

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      // Call the new ETT/DGA/Quantum analyze endpoint
      const resp = await fetch(`${apiBase}/api/transformers/${transformerId}/analyze`);
      if (resp.ok) {
        setAnalysis(await resp.json());
      }

    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const getStatusColor = (value, thresholds) => {
    if (value >= thresholds.critical) return 'critical';
    if (value >= thresholds.warning) return 'warning';
    return 'healthy';
  };

  const getRiskColor = (score) => {
    if (score > 70) return 'critical';
    if (score > 50) return 'warning';
    return 'healthy';
  };

  if (!reading) {
    return (
      <div className="detail-panel">
        <button className="back-btn" onClick={onBack}><ArrowLeft size={14} strokeWidth={1.5} style={{ verticalAlign: '-2px', marginRight: '4px' }} />Back to Fleet</button>
        <div className="empty-state">Waiting for telemetry data for {transformerId}...</div>
      </div>
    );
  }

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}><ArrowLeft size={14} strokeWidth={1.5} style={{ verticalAlign: '-2px', marginRight: '4px' }} />Back to Fleet</button>
        <div className="detail-title">
          <h2>{transformerId}</h2>
          <span className="detail-timestamp">
            Last update: {new Date(reading.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <button
          className={`analyze-btn ${analyzing ? 'loading' : ''}`}
          onClick={runAnalysis}
          disabled={analyzing}
        >
          {analyzing ? <><Loader2 size={16} strokeWidth={1.5} className="spin" style={{ verticalAlign: '-2px', marginRight: '4px' }} />Running AI Pipeline...</> : <><Brain size={16} strokeWidth={1.5} style={{ verticalAlign: '-2px', marginRight: '4px' }} />Run Full Analysis</>}
        </button>
      </div>

      {/* Sensor Readings */}
      <div className="sensor-grid">
        <SensorCard
          label="Temperature"
          value={`${reading.temperature_c?.toFixed(1)}°C`}
          status={getStatusColor(reading.temperature_c, { warning: 75, critical: 85 })}
          icon={<Thermometer size={20} strokeWidth={1.5} />}
        />
        <SensorCard
          label="Load"
          value={`${reading.load_percent?.toFixed(1)}%`}
          status={reading.load_percent < 50 ? 'critical' : reading.load_percent < 70 ? 'warning' : 'healthy'}
          icon={<Zap size={20} strokeWidth={1.5} />}
        />
        <SensorCard
          label="Power Factor"
          value={reading.power_factor?.toFixed(4)}
          status={reading.power_factor < 0.92 ? 'warning' : 'healthy'}
          icon={<Ruler size={20} strokeWidth={1.5} />}
        />
        <SensorCard
          label="Oil Level"
          value={`${reading.oil_level_percent?.toFixed(1)}%`}
          status={reading.oil_level_percent < 80 ? 'warning' : 'healthy'}
          icon={<Cylinder size={20} strokeWidth={1.5} />}
        />
        <SensorCard
          label="Moisture"
          value={`${reading.moisture_ppm?.toFixed(1)} ppm`}
          status={getStatusColor(reading.moisture_ppm, { warning: 20, critical: 35 })}
          icon={<Droplets size={20} strokeWidth={1.5} />}
        />
        <SensorCard
          label="Vibration"
          value={`${reading.vibration_mm_s?.toFixed(2)} mm/s`}
          status={getStatusColor(reading.vibration_mm_s, { warning: 5, critical: 8 })}
          icon={<Activity size={20} strokeWidth={1.5} />}
        />
      </div>

      {/* Time-Series Graphs + Variables Grid */}
      {history && history.length > 2 && (
        <div className="panel detail-graphs-panel">
          <div className="panel-header">
            <h3><BarChart3 size={16} strokeWidth={1.5} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />Live Telemetry History</h3>
            <span className="alert-count">{history.length} readings</span>
          </div>
          <div className="detail-graphs-layout">
            <div className="detail-graphs-col">
              <TempLoadGraph history={history} height={180} expanded />
              <DGAGraph history={history} height={180} expanded />
            </div>
            <div className="detail-vars-col">
              <VariablesGrid reading={reading} />
            </div>
          </div>
        </div>
      )}

      {/* DGA Panel */}
      <div className="panel dga-panel">
        <div className="panel-header">
          <h3><FlaskConical size={16} strokeWidth={1.5} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />Dissolved Gas Analysis (DGA)</h3>
        </div>
        <div className="dga-grid">
          {Object.entries(reading.dga || {}).map(([gas, ppm]) => {
            const thresholds = {
              h2: { warning: 100, critical: 200 },
              ch4: { warning: 50, critical: 100 },
              c2h2: { warning: 2, critical: 10 },
              c2h4: { warning: 20, critical: 50 },
              c2h6: { warning: 15, critical: 40 },
            };
            const t = thresholds[gas] || { warning: 50, critical: 100 };
            const status = getStatusColor(ppm, t);
            const gasLabels = { h2: 'H₂', ch4: 'CH₄', c2h2: 'C₂H₂', c2h4: 'C₂H₄', c2h6: 'C₂H₆' };

            return (
              <div key={gas} className={`dga-card ${status}`}>
                <div className="dga-name">{gasLabels[gas] || gas}</div>
                <div className="dga-value">{ppm?.toFixed(1)} ppm</div>
                <div className="dga-bar">
                  <div
                    className={`dga-bar-fill ${status}`}
                    style={{ width: `${Math.min(100, (ppm / t.critical) * 100)}%` }}
                  />
                </div>
                <div className="dga-thresholds">
                  <span>W: {t.warning}</span>
                  <span>C: {t.critical}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="panel analysis-panel">
          <div className="panel-header">
            <h3><Brain size={16} strokeWidth={1.5} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />Analysis Results</h3>
          </div>
          <div className="analysis-grid">
            {/* Physics-Informed ETT Anomaly Detector */}
            {analysis.ett_analysis && (
              <div className="analysis-card">
                <div className="analysis-title">
                  <span><BarChart3 size={16} strokeWidth={1.5} /></span> Physics-Informed ETT Anomaly Detector
                  <span className={`analysis-badge ${getRiskColor(analysis.ett_analysis.risk_score)}`}>
                    {analysis.ett_analysis.status?.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="analysis-fields">
                  <div className="analysis-field">
                    <span className="field-label">Risk Score</span>
                    <span className={`field-value ${getRiskColor(analysis.ett_analysis.risk_score)}`}>
                      {analysis.ett_analysis.risk_score?.toFixed(1)}%
                    </span>
                  </div>
                  <div className="analysis-field">
                    <span className="field-label">Recommendation</span>
                    <span className="field-value">{analysis.ett_analysis.recommendation}</span>
                  </div>
                  {analysis.ett_analysis.engineered_features && (
                    <div className="engineered-features-section">
                      <div className="engineered-features-label">Engineered Features</div>
                      <div className="engineered-features-scroll">
                        <div className="analysis-field"><span className="field-label">Thermal Stress</span><span className="field-value">{analysis.ett_analysis.engineered_features.thermal_stress}</span></div>
                        <div className="analysis-field"><span className="field-label">Total Load</span><span className="field-value">{analysis.ett_analysis.engineered_features.total_load ?? '—'}</span></div>
                        <div className="analysis-field"><span className="field-label">Load Variance</span><span className="field-value">{analysis.ett_analysis.engineered_features.load_variance ?? '—'}</span></div>
                        <div className="analysis-field"><span className="field-label">Load Span</span><span className="field-value">{analysis.ett_analysis.engineered_features.load_span ?? '—'}</span></div>
                        <div className="analysis-field"><span className="field-label">Load Differential</span><span className="field-value">{analysis.ett_analysis.engineered_features.load_differential ?? '—'}</span></div>
                        <div className="analysis-field"><span className="field-label">Thermal x Load</span><span className="field-value">{analysis.ett_analysis.engineered_features.thermal_load_interaction ?? '—'}</span></div>
                        <div className="analysis-field"><span className="field-label">Arrhenius Factor</span><span className="field-value">{analysis.ett_analysis.engineered_features.arrhenius_factor}</span></div>
                        <div className="analysis-field"><span className="field-label">Aging Acceleration</span><span className="field-value">{analysis.ett_analysis.engineered_features.aging_acceleration}h</span></div>
                        <div className="analysis-field"><span className="field-label">Imbalance (High)</span><span className="field-value">{analysis.ett_analysis.engineered_features.imbalance_high ?? '—'}</span></div>
                        <div className="analysis-field"><span className="field-label">Imbalance (Mid)</span><span className="field-value">{analysis.ett_analysis.engineered_features.imbalance_mid ?? '—'}</span></div>
                        <div className="analysis-field"><span className="field-label">Imbalance (Low)</span><span className="field-value">{analysis.ett_analysis.engineered_features.imbalance_low ?? '—'}</span></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quantum Ensemble DGA Fault Classifier */}
            {analysis.dga_analysis && (
              <div className="analysis-card">
                <div className="analysis-title">
                  <span><FlaskConical size={16} strokeWidth={1.5} /></span> Quantum Ensemble DGA Fault Classifier
                  <span className={`analysis-badge ${
                    analysis.dga_analysis.fault_type === 'Arcing' ? 'critical' :
                    analysis.dga_analysis.fault_type === 'Normal' ? 'healthy' : 'warning'
                  }`}>
                    {analysis.dga_analysis.fault_type}
                  </span>
                </div>
                <div className="analysis-fields">
                  <div className="analysis-field">
                    <span className="field-label">Fault Type</span>
                    <span className="field-value">{analysis.dga_analysis.fault_type}</span>
                  </div>
                  <div className="analysis-field">
                    <span className="field-label">Confidence</span>
                    <span className="field-value">{(analysis.dga_analysis.confidence * 100)?.toFixed(1)}%</span>
                  </div>
                  <div className="analysis-field">
                    <span className="field-label">Recommendation</span>
                    <span className="field-value">{analysis.dga_analysis.recommendation}</span>
                  </div>
                  {analysis.dga_analysis.key_ratios && (
                    <>
                      <div className="analysis-field">
                        <span className="field-label">R1 (CH4/H2)</span>
                        <span className="field-value">{analysis.dga_analysis.key_ratios.R1_CH4_H2}</span>
                      </div>
                      <div className="analysis-field">
                        <span className="field-label">R2 (C2H4/C2H6)</span>
                        <span className="field-value">{analysis.dga_analysis.key_ratios.R2_C2H4_C2H6}</span>
                      </div>
                      <div className="analysis-field">
                        <span className="field-label">R3 (C2H2/C2H4)</span>
                        <span className="field-value">{analysis.dga_analysis.key_ratios.R3_C2H2_C2H4}</span>
                      </div>
                    </>
                  )}
                  <div className="diagnostic-methods-section">
                    <div className="diagnostic-methods-label">Diagnostic Methods</div>
                    <div className="diagnostic-methods-scroll">
                      <div className="analysis-field">
                        <span className="field-label">Ensemble</span>
                        <span className="field-value">{analysis.dga_analysis.fault_type}</span>
                      </div>
                      <div className="analysis-field">
                        <span className="field-label">Quantum VQC</span>
                        <span className="field-value">{analysis.dga_analysis.quantum_analysis?.quantum_class ?? '—'}</span>
                      </div>
                      <div className="analysis-field">
                        <span className="field-label">Rogers (IEEE)</span>
                        <span className="field-value">{analysis.dga_analysis.rogers_method ?? '—'}</span>
                      </div>
                      <div className="analysis-field">
                        <span className="field-label">Duval (IEC)</span>
                        <span className="field-value">{analysis.dga_analysis.duval_triangle === 'PD' ? 'Partial Discharge' : analysis.dga_analysis.duval_triangle ?? '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Perplexity Research — shown when DGA analysis is present (risk > 50) */}
      {analysis?.dga_analysis && (
        <PerplexityPanel
          analysis={analysis}
          transformerId={transformerId}
          apiBase={apiBase}
          reading={reading}
        />
      )}
    </div>
  );
}

function SensorCard({ label, value, status, icon }) {
  return (
    <div className={`sensor-card ${status}`}>
      <div className="sensor-icon">{icon}</div>
      <div className="sensor-label">{label}</div>
      <div className="sensor-value">{value}</div>
      <div className={`sensor-badge ${status}`}>{status}</div>
    </div>
  );
}

export default TransformerDetail;
