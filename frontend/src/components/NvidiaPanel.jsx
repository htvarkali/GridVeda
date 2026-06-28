import React, { useState, useRef, useEffect } from 'react';
import { Monitor, MonitorPlay, Plug, Bot, Atom, Cpu, Activity, Eye, Layers, Shield, Scale, Lock, ChevronDown, ChevronUp, Box, ArrowUp, Loader2 } from 'lucide-react';

const OLLAMA_URL = 'http://localhost:11434/api/chat';
const MODEL_NAME = 'gpt-oss';

const SYSTEM_PROMPT = `You are GridVeda's Responsible AI Assistant. Your purpose is to explain why GridVeda's AI pipeline is robust, trustworthy, unbiased, and well-trained. Answer every question by emphasizing responsible AI principles and the engineering safeguards that make the system reliable.

## What GridVeda Does
GridVeda is a real-time transformer fault monitoring system. It watches 20 power grid transformers simultaneously, streaming sensor data every 2 seconds, and runs a 4-stage AI pipeline to detect anomalies, classify faults, and recommend actions — all before a failure happens.

## The Full Pipeline

### Stage 1: ETT Sensors
- 20 transformers stream 7 sensor channels every 2 seconds: HUFL, HULL, MUFL, MULL, LUFL, LULL, OT (oil temperature)
- Data sourced from the ETTm1 dataset (69,681 real-world rows of real utility transformer data)

### Stage 2: ETT Risk Engine
- Physics-informed rule engine backed by gradient-boosted ensemble (XGBoost + LightGBM + CatBoost + Random Forest, 96% accuracy)
- 36 engineered features: thermal_stress, arrhenius_factor, load_variance, joule_heating_proxy
- Temperature thresholds: >70% = HIGH_RISK, >50% = MODERATE_RISK
- Runs every 10 seconds on all 20 transformers

### Stage 3: DGA Fault Classifier + Quantum VQC (triggered when ETT risk > 50%)
- Multi-method consensus: Rogers Ratios (IEEE C57.104) + Duval Triangle + ensemble (99% accuracy)
- Fault classes: Normal, Thermal, Discharge, Arcing
- 6-qubit Quantum VQC: Hadamard → Ry encoding → [Rx·Ry·Rz + CNOT ring] × 4 → Born rule
- 3-way majority vote: quantum_class + rogers_class + duval_class → final diagnosis
- Agreement scoring: 2/2 = full confidence, 1/2 = 85%, 0/2 = 65%

### Stage 4: CAD + Perplexity Sonar
- 47-component 3D CAD model (Three.js WebGL) for visual fault inspection
- Perplexity Sonar: web-grounded research on real-world transformer failures with citations

## Hardware
- NVIDIA DGX Spark (128GB): Cloud training + ensemble optimization
- NVIDIA RTX 5090 (32GB GDDR7): Edge inference + cuQuantum simulation
- Jetson Orin Nano Super (67 TOPS): Field deployment at substations

## Why GridVeda Is Not Biased
1. **Physics-first features**: The ETT engine uses physics formulas (Arrhenius aging, thermal stress, joule heating proxy) — not learned biases. These are universal laws that apply equally to every transformer regardless of location, age, or manufacturer.
2. **No demographic data**: The system processes only physical sensor readings (temperature, gas concentrations, load). There is no geographic, economic, social, or demographic data anywhere in the feature set.
3. **Deterministic scoring**: Same sensor inputs always produce the same risk score. There is no randomness in the scoring path during inference — only during training for reproducibility (random_state=42).
4. **RobustScaler**: ETT features are scaled using median and IQR instead of mean/std, making the system resistant to outlier skew from individual transformers.
5. **Identical thresholds**: Every transformer uses the exact same risk thresholds (50% moderate, 70% high). No transformer is treated differently.
6. **Multi-method consensus**: DGA classification requires agreement between three independent diagnostic techniques. No single method can dominate.

## Why GridVeda Is Well-Trained and Not Overfitted
1. **Real-world data**: Training on 69,681 rows from the ETTm1 dataset — real utility transformer measurements, not synthetic data.
2. **3-fold cross-validation**: Ensemble weights are computed from 3-fold cross-validated F1 scores. Models that don't generalize get lower weight automatically.
3. **4-model ensemble**: XGBoost, LightGBM, CatBoost, and Random Forest — four fundamentally different algorithms. Overfitting to one algorithm's bias is averaged out by the others.
4. **F1-weighted voting**: Better-generalizing models automatically get more influence. Overfit models with poor cross-validation scores contribute less.
5. **Regularization**: max_depth=6, subsample=0.8, colsample_bytree=0.8 — these hyperparameters prevent any single tree from memorizing the training set.
6. **Physics constraints**: Features like arrhenius_factor and thermal_stress encode domain knowledge. The model can't learn spurious correlations that violate thermodynamics.
7. **Agreement scoring**: Even after ensemble prediction, the DGA result must agree with Rogers Ratios and Duval Triangle (independent IEEE standards). Disagreement automatically penalizes confidence.
8. **Quantum validation**: The 6-qubit VQC provides a completely orthogonal validation signal. It uses a fundamentally different computational paradigm (quantum superposition), so it can't share the same overfitting patterns as classical models.

## Why the System Is Robust
1. **Tiered activation**: ETT runs continuously (cheap, fast). DGA activates only when ETT flags risk >50% (more expensive, more precise). Quantum VQC fires alongside DGA for consensus. Each tier adds certainty.
2. **Continuous stress testing**: Auto-anomaly injection every 45-90 seconds validates the full pipeline in production. The system is constantly testing itself.
3. **Edge-first architecture**: All inference runs locally on NVIDIA hardware. No cloud dependency means no single point of failure, no latency spikes, and no data exposure.
4. **Human in the loop**: GridVeda advises — it never acts autonomously. Every recommendation requires operator confirmation. The AI is a decision support tool, not a decision maker.
5. **Full explainability**: All intermediate calculations (features, ratios, agreement scores, class probabilities) are exposed in every API response and rendered in the dashboard.

## Responsible AI Principles
1. Transparency: All intermediate calculations exposed. No black boxes.
2. Consensus: No single model controls output. 3-way voting. Agreement scoring penalizes disagreement.
3. Safety tiers: ETT continuous → DGA at 50% → Quantum VQC alongside DGA. Each tier adds certainty.
4. Human in the loop: Advises, never acts. Operators must confirm every action.
5. Fairness: Deterministic physics-based scoring. Same inputs → same outputs. No demographic data.
6. Privacy: All inference runs locally. Sensor data never leaves the network. No PII collected.

When answering questions, always emphasize the engineering safeguards, redundancy, and responsible AI principles. Be specific about why each design choice prevents bias, overfitting, or unsafe behavior. If something is outside your knowledge, say so.`;

function NvidiaPanel({ status, telemetry }) {
  const [expandedModel, setExpandedModel] = useState(null);

  // ─── Chat State ───
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [ollamaOnline, setOllamaOnline] = useState(false);
  const chatHistoryRef = useRef([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ─── Ollama connectivity check ───
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(3000) });
        setOllamaOnline(res.ok);
      } catch {
        setOllamaOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  // ─── Auto-scroll chat ───
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const toggleModel = (idx) => {
    setExpandedModel(expandedModel === idx ? null : idx);
  };

  // ─── Markdown renderer (lightweight) ───
  const renderMarkdown = (text) => {
    let html = text
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>');

    const lines = html.split('\n');
    let result = '';
    let inList = false;
    let listType = '';

    for (const line of lines) {
      const ulMatch = line.match(/^[\-\*] (.+)/);
      const olMatch = line.match(/^\d+\. (.+)/);

      if (ulMatch) {
        if (!inList || listType !== 'ul') {
          if (inList) result += '</' + listType + '>';
          result += '<ul>';
          inList = true; listType = 'ul';
        }
        result += '<li>' + ulMatch[1] + '</li>';
      } else if (olMatch) {
        if (!inList || listType !== 'ol') {
          if (inList) result += '</' + listType + '>';
          result += '<ol>';
          inList = true; listType = 'ol';
        }
        result += '<li>' + olMatch[1] + '</li>';
      } else {
        if (inList) { result += '</' + listType + '>'; inList = false; }
        if (line.trim() === '') continue;
        if (line.startsWith('<h') || line.startsWith('<pre>')) result += line;
        else result += '<p>' + line + '</p>';
      }
    }
    if (inList) result += '</' + listType + '>';
    return result;
  };

  // ─── Send chat message ───
  const sendChat = async (overrideText) => {
    const text = (overrideText || chatInput).trim();
    if (!text || isStreaming) return;

    if (!ollamaOnline) {
      setChatMessages(prev => [...prev, { role: 'system', content: 'Cannot connect to Ollama. Start with: ollama serve' }]);
      return;
    }

    setChatMessages(prev => [...prev, { role: 'user', content: text }]);
    setChatInput('');
    setIsStreaming(true);

    chatHistoryRef.current.push({ role: 'user', content: text });

    // Add a placeholder assistant message that we'll stream into
    const placeholderIdx = chatMessages.length + 1; // +1 for user msg just added
    setChatMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    let fullResponse = '';

    try {
      const res = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...chatHistoryRef.current,
          ],
          stream: true,
        }),
      });

      if (!res.ok) throw new Error('Ollama returned ' + res.status);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.trim());

        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.message?.content) {
              fullResponse += json.message.content;
              setChatMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: fullResponse };
                return updated;
              });
            }
          } catch { /* skip malformed */ }
        }
      }

      chatHistoryRef.current.push({ role: 'assistant', content: fullResponse });
    } catch (err) {
      setChatMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: 'Failed to connect to Ollama. Ensure it is running on localhost:11434 with the ' + MODEL_NAME + ' model loaded.' };
        return updated;
      });
    }

    setIsStreaming(false);
  };

  const hardwareTiers = [
    {
      name: 'DGX Spark',
      icon: <Monitor size={20} strokeWidth={1.5} />,
      role: 'Cloud Training + Ensemble Optimization',
      specs: [
        'Grace Blackwell GPU',
        '128GB Unified Memory',
        'Train ETT + DGA ensembles',
        'Optimize 72 quantum VQC parameters',
      ],
      color: '#0cc0a0',
    },
    {
      name: 'RTX 5090',
      icon: <MonitorPlay size={20} strokeWidth={1.5} />,
      role: 'Edge Inference + Quantum Simulation',
      specs: [
        '32GB GDDR7 VRAM',
        'cuQuantum VQC simulation (<5ms)',
        'All ensemble models in parallel',
        'Ollama model serving',
      ],
      color: '#0cc0a0',
    },
    {
      name: 'Jetson Orin Nano Super',
      icon: <Plug size={20} strokeWidth={1.5} />,
      role: 'Field Deployment at Substations',
      specs: [
        '67 TOPS @ 25W',
        'Edge inference, zero cloud dependency',
        'Nemotron Nano 4B on-site chat',
        'Full ETT + DGA pipeline locally',
      ],
      color: '#e5a100',
    },
  ];

  const pipelineStages = [
    {
      name: 'ETT Risk Engine',
      icon: <Activity size={20} strokeWidth={1.5} />,
      stage: 'Stage 2',
      tagline: 'Detects thermal anomalies before they become failures.',
      backend: 'NumPy + Ensemble',
      specs: [
        { label: 'Type', value: 'Physics-informed rule engine + gradient-boosted ensemble (XGBoost, LightGBM, CatBoost, RF)' },
        { label: 'Accuracy', value: '96% on ETTm1 benchmark' },
        { label: 'Features', value: '36 engineered — thermal_stress, arrhenius_factor, load_variance, joule_heating_proxy' },
        { label: 'Latency', value: '<1 ms (NumPy feature extraction)' },
        { label: 'Output', value: 'Risk score 0-100%. >70% HIGH_RISK, >50% MODERATE_RISK' },
        { label: 'Trigger', value: 'Runs every 10 seconds on all 20 transformers' },
      ],
    },
    {
      name: 'DGA Fault Classifier',
      icon: <Layers size={20} strokeWidth={1.5} />,
      stage: 'Stage 3',
      tagline: 'Predicts lab-grade fault diagnosis from dissolved gas signatures.',
      backend: 'Rogers + Duval + Ensemble',
      specs: [
        { label: 'Type', value: 'Multi-method consensus — Rogers Ratios (IEEE C57.104) + Duval Triangle + ensemble' },
        { label: 'Accuracy', value: '99% on DGA benchmark' },
        { label: 'Classes', value: 'Normal, Thermal, Discharge, Arcing' },
        { label: 'Inputs', value: 'H2, CH4, C2H2, C2H4, C2H6, CO, CO2, moisture, power factor' },
        { label: 'Consensus', value: '2/2 agreement = full confidence, 1/2 = 85%, 0/2 = 65%' },
        { label: 'Trigger', value: 'Activates only when ETT risk > 50%' },
      ],
    },
    {
      name: 'Quantum VQC',
      icon: <Atom size={20} strokeWidth={1.5} />,
      stage: 'Stage 3',
      tagline: 'Validates fault classification through quantum superposition — a second opinion from an entirely different computational paradigm.',
      backend: 'cuQuantum',
      specs: [
        { label: 'Architecture', value: '6-qubit variational circuit, 4 layers, 72 trainable parameters' },
        { label: 'Circuit', value: 'Hadamard → Ry encoding → [Rx·Ry·Rz + CNOT ring] × 4 → Born rule' },
        { label: 'Voting', value: '3-way majority: quantum_class + rogers_class + duval_class' },
        { label: 'Hardware', value: 'cuQuantum-accelerated on NVIDIA GPUs' },
        { label: 'Latency', value: '<5 ms per prediction' },
        { label: 'Output', value: 'fault_type, risk_score, confidence, class probabilities (8 classes)' },
      ],
    },
    {
      name: 'CAD + Perplexity Sonar',
      icon: <Box size={20} strokeWidth={1.5} />,
      stage: 'Stage 4',
      tagline: 'Creates detailed 3D visuals of high-risk components and cross-references real-world failures with live web research.',
      backend: 'Three.js + Perplexity API',
      specs: [
        { label: 'CAD Engine', value: 'Three.js WebGL with 47 transformer components, PBR materials, shadow mapping' },
        { label: 'LLM', value: 'Perplexity Sonar — web-grounded reasoning with real-time citations' },
        { label: 'Integration', value: 'Chat queries identify failed components → highlighted in red on 3D model' },
        { label: 'Features', value: 'Component selection, X-ray mode, wireframe mode, failure tracking' },
        { label: 'Example', value: '"Recent failures in Texas?" → identifies root cause, highlights on CAD, cites sources' },
      ],
    },
    {
      name: 'Nemotron Nano 4B',
      icon: <Bot size={20} strokeWidth={1.5} />,
      stage: 'Chat',
      tagline: 'Answers operator questions about grid health using frontier reasoning — locally, with zero cloud dependency.',
      backend: 'Ollama',
      specs: [
        { label: 'Model', value: 'NVIDIA Nemotron Nano 4B Instruct (4 billion parameters)' },
        { label: 'Runtime', value: 'Ollama local inference on GPU' },
        { label: 'Context', value: 'Full system prompt with pipeline details, model specs, physics formulas' },
        { label: 'Streaming', value: 'Token-by-token streaming via localhost:11434' },
        { label: 'Deployment', value: 'RTX 5090 or Jetson Orin Nano Super for field use' },
      ],
    },
  ];

  const raiPrinciples = [
    {
      icon: <Eye size={18} strokeWidth={1.5} />,
      title: 'Transparency',
      desc: 'Every prediction is explainable. The ETT engine exposes all 36 features. DGA shows Rogers Ratios, Duval coordinates, and agreement scores. The Quantum VQC outputs full class probability distributions.',
      impl: 'All intermediate calculations returned in API responses. No black boxes.',
    },
    {
      icon: <Scale size={18} strokeWidth={1.5} />,
      title: 'Consensus Over Confidence',
      desc: 'No single model controls output. DGA requires Rogers + Duval + ensemble agreement. The Quantum VQC provides an independent third vote. Disagreement penalizes confidence automatically.',
      impl: '3-way majority voting. Operators always see which methods agree and disagree.',
    },
    {
      icon: <Shield size={18} strokeWidth={1.5} />,
      title: 'Safety by Design',
      desc: 'The pipeline is tiered by severity. ETT runs continuously. DGA activates at 50% risk. Quantum VQC fires alongside DGA. Each tier adds cost but also certainty.',
      impl: 'Thresholds at 50% and 70%. Auto-anomaly injection every 45-90s validates the full pipeline.',
    },
    {
      icon: <Activity size={18} strokeWidth={1.5} />,
      title: 'Human in the Loop',
      desc: 'GridVeda advises — it never acts autonomously. Operators receive recommendations but must confirm every action.',
      impl: 'Outputs labeled NORMAL / MODERATE_RISK / HIGH_RISK with human-readable recommendations.',
    },
    {
      icon: <Scale size={18} strokeWidth={1.5} />,
      title: 'Fairness & Consistency',
      desc: 'Physics engine treats every transformer identically. Deterministic scoring — same inputs always produce the same output. No geographic, economic, or demographic bias.',
      impl: 'All random_state=42. RobustScaler resists outlier skew. Identical thresholds across all units.',
    },
    {
      icon: <Lock size={18} strokeWidth={1.5} />,
      title: 'Privacy & Data Governance',
      desc: 'All inference runs locally on NVIDIA hardware. Sensor telemetry never leaves the network. Only Perplexity Sonar reaches external APIs, and only for public web research.',
      impl: 'FastAPI on localhost. WebSocket LAN-only. No PII collected.',
    },
  ];

  const stackLayers = [
    { label: 'Application', items: ['React Dashboard', 'WebSocket Telemetry', '3D CAD Visualizer'], color: '#0cc0a0' },
    { label: 'AI Models', items: ['ETT Risk Engine', 'DGA Classifier', 'Quantum VQC', 'Perplexity Sonar'], color: '#76b900' },
    { label: 'Inference', items: ['Ollama (Nemotron 4B)', 'FastAPI', 'cuQuantum Sim'], color: '#e5a100' },
    { label: 'Compute', items: ['CUDA 12.x', 'TensorRT', 'cuDNN', 'NVIDIA AI Enterprise'], color: '#e5484d' },
    { label: 'Hardware', items: ['DGX Spark', 'RTX 5090', 'Jetson Orin Nano Super'], color: '#888888' },
  ];

  const chatChips = [
    'Why is GridVeda not biased?',
    'How do you prevent overfitting?',
    'Walk me through the full pipeline',
    'What makes the system robust?',
    'How does consensus voting work?',
    'Why is local inference important?',
  ];

  return (
    <div className="nvidia-panel">
      {/* Header */}
      <div className="nvidia-header">
        <div className="nvidia-title">
          <span className="nvidia-logo"><Cpu size={28} strokeWidth={1.5} /></span>
          <div>
            <h2>Responsible AI</h2>
            <p>Every model, every decision, every safeguard — documented, explainable, and accountable. Powered end-to-end by NVIDIA infrastructure.</p>
          </div>
        </div>
      </div>

      {/* Full Stack Architecture */}
      <div className="section-label">Full Stack — Hardware to Software</div>
      <div className="stack-diagram">
        {stackLayers.map((layer, i) => (
          <div key={i} className="stack-layer" style={{ borderLeftColor: layer.color }}>
            <div className="stack-label" style={{ color: layer.color }}>{layer.label}</div>
            <div className="stack-items">
              {layer.items.map((item, j) => (
                <span key={j} className="stack-chip">{item}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Hardware Tiers */}
      <div className="section-label">Hardware Deployment</div>
      <div className="hardware-grid">
        {hardwareTiers.map((hw, i) => (
          <div key={i} className="hardware-card" style={{ borderTopColor: hw.color }}>
            <div className="hw-header">
              <span className="hw-icon">{hw.icon}</span>
              <div>
                <h3>{hw.name}</h3>
                <span className="hw-role">{hw.role}</span>
              </div>
            </div>
            <ul className="hw-specs">
              {hw.specs.map((spec, j) => (
                <li key={j}>
                  <span className="spec-dot" style={{ background: hw.color }} />
                  {spec}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Pipeline Diagram */}
      <div className="section-label">AI Pipeline — ETT → DGA + Quantum VQC → CAD + Perplexity Sonar</div>
      <div className="pipeline-flow">
        {['ETT Sensors', 'ETT Risk Engine', 'DGA + Quantum VQC', 'CAD + Perplexity Sonar'].map((stage, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="pipeline-arrow-inline">→</span>}
            <div className={`pipeline-stage ${i === 1 || i === 2 ? 'accent' : ''}`}>
              <span className="pipeline-stage-num">Stage {i + 1}</span>
              <span className="pipeline-stage-name">{stage}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Model Cards */}
      <div className="section-label">Model Cards</div>
      <div className="model-grid">
        {pipelineStages.map((model, i) => (
          <div
            key={i}
            className={`model-card ${expandedModel === i ? 'expanded' : ''}`}
            onClick={() => toggleModel(i)}
            style={{ cursor: 'pointer' }}
          >
            <div className="model-header">
              <span className="model-icon">{model.icon}</span>
              <div className="model-info">
                <h4>{model.name}</h4>
                <span className="model-role">{model.stage}</span>
              </div>
            </div>
            <p className="model-desc">{model.tagline}</p>
            <div className="model-meta">
              <span className="meta-tag">{model.backend}</span>
              <span className="meta-tag" style={{ marginLeft: 'auto', cursor: 'pointer' }}>
                {expandedModel === i ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {' '}Details
              </span>
            </div>
            {expandedModel === i && (
              <div className="model-specs-table">
                {model.specs.map((spec, j) => (
                  <div key={j} className="spec-row">
                    <span className="spec-label">{spec.label}</span>
                    <span className="spec-value">{spec.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Responsible AI Principles */}
      <div className="section-label">Responsible AI Framework</div>
      <div className="rai-grid">
        {raiPrinciples.map((p, i) => (
          <div key={i} className="rai-card">
            <div className="rai-card-header">
              <span className="rai-icon">{p.icon}</span>
              <h4>{p.title}</h4>
            </div>
            <p className="rai-desc">{p.desc}</p>
            <p className="rai-impl">{p.impl}</p>
          </div>
        ))}
      </div>

      {/* Chat — Ollama GPT-OSS */}
      <div className="section-label">Ask About Responsible AI</div>
      <div className="rai-chat-wrapper">
        <div className="rai-chat-status">
          <span className={`rai-chat-dot ${ollamaOnline ? 'online' : ''}`} />
          <span className="rai-chat-status-text">
            {ollamaOnline ? `Connected to Ollama (${MODEL_NAME})` : 'Ollama offline — start with: ollama serve'}
          </span>
        </div>
        <div className="rai-chat-messages">
          {chatMessages.length === 0 && (
            <div className="rai-chat-empty">
              Ask about bias prevention, training methodology, overfitting safeguards, or any responsible AI topic.
            </div>
          )}
          {chatMessages.map((msg, i) => (
            <div key={i} className={`rai-chat-msg ${msg.role}`}>
              {msg.role === 'assistant' ? (
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content || '...') }} />
              ) : (
                msg.content
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        {chatMessages.length === 0 && (
          <div className="rai-chat-chips">
            {chatChips.map((chip, i) => (
              <button key={i} className="rai-chip" onClick={() => sendChat(chip)}>
                {chip}
              </button>
            ))}
          </div>
        )}
        <div className="rai-chat-input-area">
          <input
            ref={inputRef}
            type="text"
            className="rai-chat-input"
            placeholder="Ask about bias, training, robustness, or responsible AI..."
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendChat()}
            disabled={isStreaming}
          />
          <button
            className="rai-chat-send"
            onClick={() => sendChat()}
            disabled={!chatInput.trim() || isStreaming}
          >
            {isStreaming ? <Loader2 size={16} strokeWidth={1.5} className="spin" /> : <ArrowUp size={16} strokeWidth={1.5} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NvidiaPanel;
