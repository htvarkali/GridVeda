import React, { useRef, useCallback } from 'react';

function ComponentsSidebar({ categories, componentCounts, failedComponents, selectedComponent, onSelect }) {
  const lastClickRef = useRef({ time: 0, key: null });

  const handleClick = useCallback((key) => {
    const now = Date.now();
    const isDouble = (now - lastClickRef.current.time < 300) && (lastClickRef.current.key === key);
    lastClickRef.current = { time: now, key };

    if (isDouble || selectedComponent === key) {
      onSelect(null);
    } else {
      onSelect(key);
    }
  }, [selectedComponent, onSelect]);

  const handleClear = useCallback(() => {
    onSelect(null);
  }, [onSelect]);

  return (
    <div className="tv-sidebar">
      <div className="tv-sidebar-header">
        <span className="tv-sidebar-title">Components</span>
        <button className="tv-clear-btn" onClick={handleClear}>Clear</button>
      </div>
      <div className="tv-component-list">
        {categories.map((cat) => {
          const count = componentCounts[cat.key] || 0;
          if (count === 0) return null;
          const isFailed = failedComponents.has(cat.key);
          const isActive = selectedComponent === cat.key;

          return (
            <div
              key={cat.key}
              className={`tv-component-item${isActive ? ' active' : ''}${isFailed ? ' failed' : ''}`}
              onClick={() => handleClick(cat.key)}
            >
              <div
                className="tv-component-color"
                style={{ background: cat.color, color: cat.color }}
              />
              <div className="tv-component-info">
                <div className="tv-component-name">{cat.name}</div>
                <div className="tv-component-count">{count} parts</div>
              </div>
              {isFailed && <span className="tv-failure-badge">Failed</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ComponentsSidebar;
