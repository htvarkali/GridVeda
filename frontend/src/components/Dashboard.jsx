import React, { useState, useMemo } from 'react';
import { Factory, Search, Bell } from 'lucide-react';
import TempLoadGraph from './TempLoadGraph';
import DGAGraph from './DGAGraph';

function Dashboard({ telemetry, alerts, telemetryHistory, transformerHistory, onSelectTransformer }) {
  const [sortBy, setSortBy] = useState('temperature');

  const metrics = telemetry?.fleet_metrics || {};
  const readings = telemetry?.readings || {};

  // Sort transformers by selected metric
  const sortedTransformers = useMemo(() => {
    const entries = Object.entries(readings);
    return entries.sort((a, b) => {
      const ra = a[1], rb = b[1];
      switch (sortBy) {
        case 'temperature': return rb.temperature_c - ra.temperature_c;
        case 'load': return rb.load_percent - ra.load_percent;
        case 'oil': return (ra.oil_level_percent || 0) - (rb.oil_level_percent || 0);
        default: return 0;
      }
    });
  }, [readings, sortBy]);

  // Find highest-risk transformer for spotlight graphs
  const spotlightId = useMemo(() => {
    if (sortedTransformers.length === 0) return null;
    // Pick the transformer with the highest H₂ or temperature
    let best = sortedTransformers[0];
    for (const entry of sortedTransformers) {
      const r = entry[1];
      const b = best[1];
      if ((r.dga?.h2 || 0) > (b.dga?.h2 || 0) || r.temperature_c > b.temperature_c) {
        best = entry;
      }
    }
    return best[0];
  }, [sortedTransformers]);

  const getHealthColor = (temp, h2) => {
    if (temp > 85 || h2 > 200) return 'critical';
    if (temp > 75 || h2 > 100) return 'warning';
    return 'healthy';
  };

  return (
    <div className="dashboard">
      {/* Fleet Metrics Row */}
      <div className="metrics-row">
        <MetricCard
          label="Transformers Online"
          value={`${metrics.online || 0}/${metrics.total_transformers || 0}`}
          color="cyan"
          sub="100% Operational"
          subType="positive"
        />
        <MetricCard
          label="Fleet Health Score"
          value={metrics.health_score?.toFixed(1) || '—'}
          color="green"
          sub="AI Composite Score"
          subType="positive"
        />
        <MetricCard
          label="Active Alerts"
          value={alerts.length}
          color={alerts.length > 5 ? 'red' : 'amber'}
          sub={`${alerts.filter(a => a.severity === 'critical').length} critical`}
          subType={alerts.length > 3 ? 'negative' : 'neutral'}
        />
        <MetricCard
          label="Renewable Output"
          value={`${metrics.renewable_output_mw?.toFixed(0) || 0} MW`}
          color="cyan"
          sub="Solar + Wind"
          subType="positive"
        />
        <MetricCard
          label="Avg Temperature"
          value={`${metrics.avg_temperature?.toFixed(1) || 0}°C`}
          color={metrics.avg_temperature > 75 ? 'amber' : 'green'}
          sub={`Max: ${metrics.max_temperature?.toFixed(1) || 0}°C`}
          subType={metrics.max_temperature > 85 ? 'negative' : 'neutral'}
        />
        <MetricCard
          label="Avg Load"
          value={`${metrics.avg_load?.toFixed(1) || 0}%`}
          color={metrics.avg_load > 80 ? 'red' : 'cyan'}
          sub={`Peak: ${metrics.max_load?.toFixed(1) || 0}%`}
          subType="neutral"
        />
      </div>

      <div className="dashboard-grid">
        {/* Left Column — Fleet + Charts */}
        <div className="dashboard-left">
          {/* Transformer Fleet Grid */}
          <div className="panel fleet-panel">
            <div className="panel-header">
              <h3><Factory size={16} strokeWidth={1.5} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />Transformer Fleet</h3>
              <div className="sort-controls">
                <span className="sort-label">Sort:</span>
                {['temperature', 'load', 'oil'].map(s => (
                  <button
                    key={s}
                    className={`sort-btn ${sortBy === s ? 'active' : ''}`}
                    onClick={() => setSortBy(s)}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="transformer-grid">
              {sortedTransformers.map(([id, reading]) => {
                const health = getHealthColor(reading.temperature_c, reading.dga?.h2 || 0);
                return (
                  <div
                    key={id}
                    className={`transformer-card ${health}`}
                    onClick={() => onSelectTransformer(id)}
                  >
                    <div className="xfmr-header">
                      <span className="xfmr-id">{id}</span>
                      <span className={`health-dot ${health}`} />
                    </div>
                    <div className="xfmr-metrics">
                      <div className="xfmr-metric">
                        <span className="xfmr-metric-value">{reading.temperature_c?.toFixed(1)}°</span>
                        <span className="xfmr-metric-label">Temp</span>
                      </div>
                      <div className="xfmr-metric">
                        <span className="xfmr-metric-value">{reading.load_percent?.toFixed(0)}%</span>
                        <span className="xfmr-metric-label">Load</span>
                      </div>
                      <div className="xfmr-metric">
                        <span className="xfmr-metric-value">{reading.dga?.h2?.toFixed(0)}</span>
                        <span className="xfmr-metric-label">H₂</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Spotlight Graphs — highest risk transformer */}
          {spotlightId && transformerHistory?.[spotlightId]?.length > 2 && (
            <div className="panel spotlight-panel">
              <div className="panel-header">
                <h3><Search size={16} strokeWidth={1.5} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />Spotlight — {spotlightId}</h3>
                <button className="sort-btn active" onClick={() => onSelectTransformer(spotlightId)}>
                  View Detail →
                </button>
              </div>
              <div className="spotlight-graphs">
                <TempLoadGraph history={transformerHistory[spotlightId]} height={140} />
                <DGAGraph history={transformerHistory[spotlightId]} height={140} />
              </div>
            </div>
          )}
        </div>

        {/* Right Column — Alerts */}
        <div className="panel alert-panel">
          <div className="panel-header">
            <h3><Bell size={16} strokeWidth={1.5} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />AI Alert Feed</h3>
            <span className="alert-count">{alerts.length} alerts</span>
          </div>
          <div className="alert-list">
            {alerts.length === 0 ? (
              <div className="empty-state">No alerts — all systems nominal</div>
            ) : (
              alerts.slice(0, 15).map((alert, i) => (
                <div key={alert.id || i} className={`alert-item ${alert.severity}`}>
                  <div className="alert-indicator">
                    <span className={`alert-dot ${alert.severity}`} />
                  </div>
                  <div className="alert-body">
                    <div className="alert-meta">
                      <span className="alert-source">{alert.source}</span>
                      <span className="alert-xfmr">{alert.transformer_id}</span>
                    </div>
                    <div className="alert-message">{alert.message}</div>
                    <div className="alert-time">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color, sub, subType }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${color}`}>{value}</div>
      {sub && <div className={`metric-sub ${subType}`}>{sub}</div>}
    </div>
  );
}

export default Dashboard;
