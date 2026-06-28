import React, { useRef, useEffect } from 'react';

/**
 * Canvas-based DGA (Dissolved Gas Analysis) time-series graph.
 * Plots H₂, CH₄, C₂H₂, C₂H₄, C₂H₆ over telemetry history.
 * Ported from gridveda-live.html drawGasGraph / drawGasGraphExpanded.
 */
function DGAGraph({ history, height = 160, expanded = false }) {
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
      ? { left: 55, right: 20, top: 20, bottom: 35 }
      : { left: 48, right: 12, top: 18, bottom: 28 };
    const graphW = w - padding.left - padding.right;
    const graphH = h - padding.top - padding.bottom;

    // Extract DGA values
    const data = history.map((r, i) => ({
      idx: i,
      h2: r.dga?.h2 ?? 0,
      ch4: r.dga?.ch4 ?? 0,
      c2h2: r.dga?.c2h2 ?? 0,
      c2h4: r.dga?.c2h4 ?? 0,
      c2h6: r.dga?.c2h6 ?? 0,
    }));

    // Compute Y range
    const allVals = data.flatMap(d => [d.h2, d.ch4, d.c2h2, d.c2h4, d.c2h6]);
    const minVal = Math.min(...allVals);
    const maxVal = Math.max(...allVals);
    const range = maxVal - minVal || 1;
    const yMin = Math.max(0, minVal - range * 0.15);
    const yMax = maxVal + range * 0.2;

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
      ctx.fillText(`${Math.round(val)}`, padding.left - 6, y + 4);
    }

    // X-axis labels
    ctx.textAlign = 'center';
    const xSteps = expanded ? 10 : 6;
    for (let i = 0; i <= xSteps; i++) {
      const idx = Math.floor((i / xSteps) * (data.length - 1));
      const x = xPos(idx);
      ctx.fillText(`-${data.length - idx}`, x, h - padding.bottom + (expanded ? 20 : 16));
    }

    // Warning threshold at 100ppm (H₂)
    if (yMin <= 100 && yMax >= 100) {
      ctx.strokeStyle = 'rgba(229,161,0,0.35)';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos(100));
      ctx.lineTo(w - padding.right, yPos(100));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Critical threshold at 200ppm
    if (yMin <= 200 && yMax >= 200) {
      ctx.strokeStyle = 'rgba(229,72,77,0.35)';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos(200));
      ctx.lineTo(w - padding.right, yPos(200));
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
    drawLine('c2h6', '#5db87a', expanded ? 2.5 : 2);
    drawLine('c2h4', '#3d9963', expanded ? 3 : 2.5);
    drawLine('c2h2', '#7bb8d4', expanded ? 3 : 2.5);
    drawLine('ch4', '#4a9e97', expanded ? 3 : 2.5);
    drawLine('h2', '#5eaec9', expanded ? 3.5 : 3);

    // Title
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `bold ${expanded ? 12 : 11}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Dissolved Gas Analysis (ppm)', w / 2, 14);
  }, [history, expanded]);

  return (
    <div className="graph-canvas-wrapper">
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: `${height}px`, display: 'block' }}
      />
      <div className="graph-legend">
        <span className="legend-item"><span className="legend-line" style={{ background: '#5eaec9' }} />H₂</span>
        <span className="legend-item"><span className="legend-line" style={{ background: '#4a9e97' }} />CH₄</span>
        <span className="legend-item"><span className="legend-line" style={{ background: '#7bb8d4' }} />C₂H₂</span>
        <span className="legend-item"><span className="legend-line" style={{ background: '#3d9963' }} />C₂H₄</span>
        <span className="legend-item"><span className="legend-line" style={{ background: '#5db87a' }} />C₂H₆</span>
      </div>
    </div>
  );
}

export default DGAGraph;
