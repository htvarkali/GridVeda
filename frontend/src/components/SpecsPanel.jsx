import React from 'react';

const staticSpecs = [
  { label: 'Rated Power', value: '5 MVA' },
  { label: 'Primary Voltage', value: '11 kV' },
  { label: 'Secondary Voltage', value: '400 V' },
  { label: 'Cooling Type', value: 'ONAN/ONAF' },
  { label: 'Frequency', value: '50 Hz' },
  { label: 'Vector Group', value: 'Dyn11' },
  { label: 'Impedance', value: '6.25%' },
  { label: 'Weight (Total)', value: '12,500 kg' },
  { label: 'Oil Volume', value: '3,200 L' },
];

function SpecsPanel({ reading, totalParts }) {
  const liveSpecs = reading ? [
    { label: 'Temperature', value: `${reading.temperature_c?.toFixed(1)}°C`, live: true },
    { label: 'Load', value: `${reading.load_percent?.toFixed(1)}%`, live: true },
    { label: 'Oil Level', value: `${reading.oil_level_percent?.toFixed(1)}%`, live: true },
  ] : [];

  return (
    <div className="tv-specs">
      <div className="tv-sidebar-header">
        <span className="tv-sidebar-title">Specifications</span>
      </div>
      <div className="tv-spec-grid">
        {totalParts > 0 && (
          <div className="tv-spec-card">
            <div className="tv-spec-label">Total 3D Parts</div>
            <div className="tv-spec-value">{totalParts}</div>
          </div>
        )}
        {liveSpecs.map((spec) => (
          <div key={spec.label} className="tv-spec-card tv-spec-live">
            <div className="tv-spec-label">{spec.label} <span className="tv-live-dot" /></div>
            <div className="tv-spec-value">{spec.value}</div>
          </div>
        ))}
        {staticSpecs.map((spec) => (
          <div key={spec.label} className="tv-spec-card">
            <div className="tv-spec-label">{spec.label}</div>
            <div className="tv-spec-value">{spec.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SpecsPanel;
