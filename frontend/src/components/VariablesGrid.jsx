import React from 'react';

/**
 * Real-time sensor variable cards grid with color-coded status.
 * Shows 14 key variables: OT, HUFL/HULL/MUFL/MULL/LUFL/LULL, H₂, CH₄, C₂H₂, C₂H₄, C₂H₆, Moisture, Vibration.
 * Ported from gridveda-live.html renderVariableCard().
 */

const VARIABLES = [
  { key: 'OT', label: 'OT', unit: '°C', warn: 95, crit: 100, get: r => r?.ett_sensors?.OT ?? r?.temperature_c },
  { key: 'HUFL', label: 'HUFL', unit: '', warn: 6.5, crit: 8, get: r => r?.ett_sensors?.HUFL },
  { key: 'HULL', label: 'HULL', unit: '', warn: 2.8, crit: 3.5, get: r => r?.ett_sensors?.HULL },
  { key: 'MUFL', label: 'MUFL', unit: '', warn: 5.5, crit: 7, get: r => r?.ett_sensors?.MUFL },
  { key: 'MULL', label: 'MULL', unit: '', warn: 2, crit: 2.5, get: r => r?.ett_sensors?.MULL },
  { key: 'LUFL', label: 'LUFL', unit: '', warn: 5, crit: 6.5, get: r => r?.ett_sensors?.LUFL },
  { key: 'LULL', label: 'LULL', unit: '', warn: 1.8, crit: 2.2, get: r => r?.ett_sensors?.LULL },
  { key: 'h2', label: 'H₂', unit: ' ppm', warn: 400, crit: 800, get: r => r?.dga?.h2 },
  { key: 'ch4', label: 'CH₄', unit: ' ppm', warn: 80, crit: 150, get: r => r?.dga?.ch4 },
  { key: 'c2h2', label: 'C₂H₂', unit: ' ppm', warn: 10, crit: 30, get: r => r?.dga?.c2h2 },
  { key: 'c2h4', label: 'C₂H₄', unit: ' ppm', warn: 60, crit: 120, get: r => r?.dga?.c2h4 },
  { key: 'c2h6', label: 'C₂H₆', unit: ' ppm', warn: 40, crit: 80, get: r => r?.dga?.c2h6 },
  { key: 'moisture', label: 'Moisture', unit: ' ppm', warn: 25, crit: 40, get: r => r?.moisture_ppm },
  { key: 'vibration', label: 'Vibration', unit: ' mm/s', warn: 5, crit: 8, get: r => r?.vibration_mm_s },
];

function VariablesGrid({ reading }) {
  if (!reading) return null;

  return (
    <div className="vars-grid">
      {VARIABLES.map(v => {
        const val = v.get(reading);
        if (val == null) return null;
        const status = val >= v.crit ? 'critical' : val >= v.warn ? 'warning' : 'normal';
        return (
          <div key={v.key} className={`var-card ${status}`}>
            <div className="var-label">{v.label}</div>
            <div className={`var-value ${status}`}>
              {typeof val === 'number' ? val.toFixed(2) : val}{v.unit}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default VariablesGrid;
