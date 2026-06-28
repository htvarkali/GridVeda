import React, { useState, useRef, useEffect } from 'react';
import { Bot, Zap, User, Loader2, ArrowUp } from 'lucide-react';

function ChatPanel({ apiBase, telemetry }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '**GridVeda AI** — Nemotron Nano 4B (Ollama)\n\nI\'m your grid intelligence assistant. Ask me about:\n- Fleet health status and transformer monitoring\n- DGA analysis and fault classification\n- Alerts, predictions, and maintenance recommendations',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const resp = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          context: telemetry ? JSON.stringify(telemetry.fleet_metrics) : null,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          model: data.model,
          engine: data.engine,
          timestamp: new Date().toISOString(),
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Error communicating with GridVeda backend. Ensure the server is running on port 8000.',
          timestamp: new Date().toISOString(),
          isError: true,
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Connection failed: ${err.message}\n\nStart the backend:\n\`\`\`\ncd backend && uvicorn main:app --host 0.0.0.0 --port 8000\n\`\`\``,
        timestamp: new Date().toISOString(),
        isError: true,
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const quickActions = [
    { label: 'Fleet Status', msg: 'What is the current fleet health status?' },
    { label: 'DGA Analysis', msg: 'Explain the current DGA readings and any concerns' },
    { label: 'Active Alerts', msg: 'What are the current active alerts and recommendations?' },
    { label: 'Predictions', msg: 'What are the predictive maintenance forecasts?' },
  ];

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="chat-title">
          <span className="chat-icon"><Bot size={24} strokeWidth={1.5} /></span>
          <div>
            <h3>Ask Grid — Nemotron Nano 4B</h3>
            <span className="chat-subtitle">
              100% Local • Ollama • Grid-Aware RAG
            </span>
          </div>
        </div>
        <div className="model-badge">
          <span className="nvidia-dot" />
          Nemotron Nano 4B
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        {quickActions.map((qa, i) => (
          <button
            key={i}
            className="quick-btn"
            onClick={() => { setInput(qa.msg); }}
            disabled={loading}
          >
            {qa.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.role} ${msg.isError ? 'error' : ''}`}>
            <div className="msg-avatar">
              {msg.role === 'user' ? <User size={16} strokeWidth={1.5} /> : <Zap size={16} strokeWidth={1.5} />}
            </div>
            <div className="msg-content">
              <div className="msg-text">
                {msg.content.split('\n').map((line, j) => (
                  <React.Fragment key={j}>
                    {line.startsWith('```') ? (
                      <code className="code-block">{line.replace(/```\w*/g, '')}</code>
                    ) : (
                      <span dangerouslySetInnerHTML={{
                        __html: line
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/`(.*?)`/g, '<code>$1</code>')
                      }} />
                    )}
                    <br />
                  </React.Fragment>
                ))}
              </div>
              <div className="msg-meta">
                <span className="msg-time">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
                {msg.model && (
                  <span className="msg-model">
                    via {msg.model} ({msg.engine})
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-msg assistant">
            <div className="msg-avatar"><Zap size={16} strokeWidth={1.5} /></div>
            <div className="msg-content">
              <div className="typing-indicator">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          placeholder="Ask about grid health, DGA, alerts, predictions..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          disabled={loading}
        />
        <button
          className="send-btn"
          onClick={sendMessage}
          disabled={!input.trim() || loading}
        >
          {loading ? <Loader2 size={18} strokeWidth={1.5} className="spin" /> : <ArrowUp size={18} strokeWidth={1.5} />}
        </button>
      </div>
    </div>
  );
}

export default ChatPanel;
