import React, { useMemo } from 'react';

/**
 * Animated bar chart showing live grid load history.
 * Alternating NVIDIA green / cyan bars.
 * Ported from gridveda-live.html renderChart().
 */
function GridLoadChart({ telemetryHistory, maxBars = 24 }) {
  const bars = useMemo(() => {
    if (!telemetryHistory || telemetryHistory.length === 0) {
      return Array(maxBars).fill(50);
    }
    // Use the last N ticks' average load
    return telemetryHistory.slice(-maxBars).map(t => {
      if (t?.fleet_metrics?.avg_load != null) return t.fleet_metrics.avg_load;
      // Fallback: compute from readings
      const readings = Object.values(t?.readings || {});
      if (readings.length === 0) return 50;
      return readings.reduce((sum, r) => sum + (r.load_percent || 0), 0) / readings.length;
    });
  }, [telemetryHistory, maxBars]);

  return (
    <div className="load-chart-box">
      <div className="load-chart-title">Live Grid Load — Last {bars.length} Ticks</div>
      <div className="load-chart-bars">
        {bars.map((val, i) => (
          <div
            key={i}
            className={`load-bar ${i % 2 === 0 ? 'even' : 'odd'}`}
            style={{ height: `${Math.max(5, val)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export default GridLoadChart;
