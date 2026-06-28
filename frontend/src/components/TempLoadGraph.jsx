import React, { useRef, useEffect } from 'react';

/**
 * Canvas-based Temperature & ETT Load time-series graph.
 * Plots Oil Temperature (OT), HUFL, MUFL, LUFL over telemetry history.
 * Ported from gridveda-live.html drawTempGraph / drawTempGraphExpanded.
 */
function TempLoadGraph({ history, height = 160, expanded = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !history || history.length < 2) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const padding = expanded
      ? { left: 50, right: 20, top: 20, bottom: 35 }
      : { left: 45, right: 12, top: 18, bottom: 28 };
    const graphW = w - padding.left - padding.right;
    const graphH = h - padding.top - padding.bottom;

    // Extract values
    const data = history.map((r, i) => ({
      idx: i,
      OT: r.ett_sensors?.OT ?? r.temperature_c ?? 0,
      HUFL: r.ett_sensors?.HUFL ?? 0,
      MUFL: r.ett_sensors?.MUFL ?? 0,
      LUFL: r.ett_sensors?.LUFL ?? 0,
    }));

    // Compute Y range
    const allVals = data.flatMap(d => [d.OT, d.HUFL, d.MUFL, d.LUFL]);
    const minVal = Math.min(...allVals);
    const maxVal = Math.max(...allVals);
    const range = maxVal - minVal || 1;
    const yMin = Math.max(-5, minVal - range * 0.15);
    const yMax = maxVal + range * 0.15;

    const xPos = (i) => padding.left + (i / (data.length - 1)) * graphW;
    const yPos = (v) => padding.top + graphH - ((v - yMin) / (yMax - yMin)) * graphH;

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i / 5) * graphH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
    }

    // Y-axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `${expanded ? 11 : 10}px system-ui, sans-serif`;
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const val = yMin + (i / 5) * (yMax - yMin);
      const y = padding.top + ((5 - i) / 5) * graphH;
      ctx.fillText(`${Math.round(val)}°`, padding.left - 6, y + 4);
    }

    // X-axis labels (time ticks)
    ctx.textAlign = 'center';
    const xSteps = expanded ? 10 : 6;
    for (let i = 0; i <= xSteps; i++) {
      const idx = Math.floor((i / xSteps) * (data.length - 1));
      const x = xPos(idx);
      const label = `${data.length - idx}`;
      ctx.fillText(`-${label}`, x, h - padding.bottom + (expanded ? 20 : 16));
    }

    // Threshold line at 110°C
    if (yMin <= 110 && yMax >= 110) {
      ctx.strokeStyle = 'rgba(229,72,77,0.4)';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos(110));
      ctx.lineTo(w - padding.right, yPos(110));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw line helper
    const drawLine = (key, color, lineWidth) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      data.forEach((d, i) => {
        const x = xPos(i);
        const y = yPos(d[key]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    // Draw lines (back to front)
    drawLine('LUFL', '#ffd93d', expanded ? 2.5 : 2);
    drawLine('MUFL', '#ffaa00', expanded ? 2.5 : 2);
    drawLine('HUFL', '#ff6b6b', expanded ? 2.5 : 2);
    drawLine('OT', '#ff4757', expanded ? 3.5 : 3);

    // Title
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `bold ${expanded ? 12 : 11}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Temperature & ETT Load', w / 2, 14);
  }, [history, expanded]);

  return (
    <div className="graph-canvas-wrapper">
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: `${height}px`, display: 'block' }}
      />
      <div className="graph-legend">
        <span className="legend-item"><span className="legend-line" style={{ background: '#ff4757' }} />OT</span>
        <span className="legend-item"><span className="legend-line" style={{ background: '#ff6b6b' }} />HUFL</span>
        <span className="legend-item"><span className="legend-line" style={{ background: '#ffaa00' }} />MUFL</span>
        <span className="legend-item"><span className="legend-line" style={{ background: '#ffd93d' }} />LUFL</span>
      </div>
    </div>
  );
}

export default TempLoadGraph;
