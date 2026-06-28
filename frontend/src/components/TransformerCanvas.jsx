import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  createIndustrialTransformer,
  componentCategories,
  highlightComponent,
  resetAllHighlights,
  setupControls,
  resetCamera as resetCameraFn,
} from '../utils/transformerModel';
import { Box, Eye, RotateCcw, Grid3x3 } from 'lucide-react';

function TransformerCanvas({ failedComponents, selectedComponent, onSceneReady }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const [viewMode, setViewMode] = useState('solid');
  const [xrayMode, setXrayMode] = useState(false);

  // Initialize Three.js scene on mount
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 25, 60);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(10, 8, 10);
    camera.lookAt(0, 1.5, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(15, 20, 15);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.left = -15;
    mainLight.shadow.camera.right = 15;
    mainLight.shadow.camera.top = 15;
    mainLight.shadow.camera.bottom = -15;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    fillLight.position.set(-12, 12, -12);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x88ccff, 0.4);
    rimLight.position.set(0, 8, -18);
    scene.add(rimLight);

    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9, metalness: 0.1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -3.0;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(30, 60, 0x222222, 0x111111);
    gridHelper.position.y = -3.0;
    scene.add(gridHelper);

    // Build transformer
    const transformerGroup = new THREE.Group();
    const components = {};
    createIndustrialTransformer(transformerGroup, components);
    scene.add(transformerGroup);

    // Build component counts + total parts
    const componentCounts = {};
    let totalParts = 0;
    componentCategories.forEach(cat => {
      let count = 0;
      const group = components[cat.key];
      if (group) {
        group.traverse(child => { if (child.isMesh) count++; });
      }
      componentCounts[cat.key] = count;
      totalParts += count;
    });

    sceneRef.current = { scene, camera, renderer, transformerGroup, components };

    // Notify parent
    onSceneReady?.({ componentCategories, componentCounts, totalParts });

    // Mouse controls
    const cleanupControls = setupControls(canvas, transformerGroup, camera);

    // Animation loop
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      transformerGroup.rotation.y += 0.0012;
      renderer.render(scene, camera);
    };
    animate();

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (!container.clientWidth || !container.clientHeight) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });
    ro.observe(container);

    // Cleanup
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      cleanupControls();
      renderer.dispose();
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
      sceneRef.current = null;
    };
  }, []);

  // React to selectedComponent and failedComponents changes
  useEffect(() => {
    if (!sceneRef.current) return;
    const { components, transformerGroup } = sceneRef.current;
    resetAllHighlights(transformerGroup, components, failedComponents);
    if (selectedComponent && components[selectedComponent]) {
      highlightComponent(components, selectedComponent, failedComponents);
    }
  }, [selectedComponent, failedComponents]);

  // View mode handlers
  const handleViewMode = useCallback((mode) => {
    if (!sceneRef.current) return;
    const { transformerGroup } = sceneRef.current;
    setViewMode(mode);
    const isWire = mode === 'wireframe';
    transformerGroup.traverse(child => {
      if (child.isMesh && child.material) {
        child.material.wireframe = isWire;
      }
    });
  }, []);

  const handleXRay = useCallback(() => {
    if (!sceneRef.current) return;
    const { transformerGroup } = sceneRef.current;
    const newXray = !xrayMode;
    setXrayMode(newXray);
    transformerGroup.traverse(child => {
      if (child.isMesh && child.material) {
        child.material.transparent = newXray;
        child.material.opacity = newXray ? 0.25 : 1.0;
        child.material.side = newXray ? THREE.DoubleSide : THREE.FrontSide;
      }
    });
  }, [xrayMode]);

  const handleReset = useCallback(() => {
    if (!sceneRef.current) return;
    const { camera, transformerGroup } = sceneRef.current;
    resetCameraFn(camera, transformerGroup);
  }, []);

  return (
    <div className="tv-canvas-wrapper" ref={containerRef}>
      <canvas ref={canvasRef} />

      {/* Title bar */}
      <div className="tv-title-bar">
        <h4>Industrial Power Transformer</h4>
        <p>Ultra-Detailed 3D CAD Model</p>
      </div>

      {/* View controls */}
      <div className="tv-controls">
        <div className="tv-control-group">
          <button
            className={`tv-control-btn${viewMode === 'solid' ? ' active' : ''}`}
            onClick={() => handleViewMode('solid')}
            title="Solid"
          >
            <Box size={14} strokeWidth={1.5} />
          </button>
          <button
            className={`tv-control-btn${viewMode === 'wireframe' ? ' active' : ''}`}
            onClick={() => handleViewMode('wireframe')}
            title="Wireframe"
          >
            <Grid3x3 size={14} strokeWidth={1.5} />
          </button>
        </div>
        <div className="tv-control-group">
          <button
            className={`tv-control-btn${xrayMode ? ' active' : ''}`}
            onClick={handleXRay}
            title="X-Ray"
          >
            <Eye size={14} strokeWidth={1.5} />
          </button>
          <button
            className="tv-control-btn"
            onClick={handleReset}
            title="Reset Camera"
          >
            <RotateCcw size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default TransformerCanvas;
