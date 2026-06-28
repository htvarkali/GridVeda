import React, { useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import TransformerCanvas from './TransformerCanvas';
import ComponentsSidebar from './ComponentsSidebar';
import SpecsPanel from './SpecsPanel';
import ChatOverlay from './ChatOverlay';

function PerplexityPanel({ analysis, transformerId, apiBase, reading }) {
  const [failedComponents, setFailedComponents] = useState(new Set());
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [sceneData, setSceneData] = useState(null);

  const handleSceneReady = useCallback((data) => {
    setSceneData(data);
  }, []);

  const handleSelectComponent = useCallback((key) => {
    setSelectedComponent(key);
  }, []);

  const handleFailureDetected = useCallback((detectedKeys) => {
    setFailedComponents(prev => {
      const next = new Set(prev);
      detectedKeys.forEach(k => next.add(k));
      return next;
    });
  }, []);

  const categories = sceneData?.componentCategories || [];
  const componentCounts = sceneData?.componentCounts || {};
  const totalParts = sceneData?.totalParts || 0;

  return (
    <div className="panel perplexity-panel">
      <div className="panel-header">
        <h3>
          <Search size={16} strokeWidth={1.5} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '6px' }} />
          Transformer Visualization and Research
        </h3>
      </div>

      {/* 3D CAD section — full width */}
      <div className="tv-layout">
        <ComponentsSidebar
          categories={categories}
          componentCounts={componentCounts}
          failedComponents={failedComponents}
          selectedComponent={selectedComponent}
          onSelect={handleSelectComponent}
        />

        <div className="tv-center">
          <TransformerCanvas
            failedComponents={failedComponents}
            selectedComponent={selectedComponent}
            onSceneReady={handleSceneReady}
          />
        </div>

        <SpecsPanel reading={reading} totalParts={totalParts} />
      </div>

      {/* Chat section — stacked below CAD */}
      <ChatOverlay
        analysis={analysis}
        transformerId={transformerId}
        apiBase={apiBase}
        isOpen={true}
        onClose={() => {}}
        onFailureDetected={handleFailureDetected}
      />
    </div>
  );
}

export default PerplexityPanel;
