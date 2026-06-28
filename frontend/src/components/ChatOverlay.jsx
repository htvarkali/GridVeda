import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Search, Zap, Loader2, ArrowUp } from 'lucide-react';
import { analyzeResponseForFailures, getDefaultComponentForFault } from '../utils/componentKeyMap';

function composeAutoQuery(analysis, transformerId) {
  const ett = analysis.ett_analysis;
  const dga = analysis.dga_analysis;
  const quantum = dga?.quantum_analysis;
  // Build a conversational, plain-language description of what's wrong
  let query = `We're investigating a potential failure on transformer ${transformerId}. Here's what our sensors and diagnostics found:\n\n`;

  // ETT — describe in plain language
  const riskScore = ett.risk_score?.toFixed(1);
  query += `The transformer is flagged as "${ett.status}" with a risk score of ${riskScore}%. `;
  if (ett.engineered_features) {
    const ef = ett.engineered_features;
    if (parseFloat(ef.thermal_stress) > 0.5) {
      query += `It's showing high thermal stress (${ef.thermal_stress}). `;
    }
    if (parseFloat(ef.aging_acceleration) > 1) {
      query += `Insulation aging is accelerating at ${ef.aging_acceleration} hours equivalent. `;
    }
  }

  // DGA — this is the most important part, describe the fault type conversationally
  query += `\n\nDissolved gas analysis classified the fault as "${dga.fault_type}" (${(dga.confidence * 100).toFixed(0)}% confidence). `;
  query += `Rogers ratio method says "${dga.rogers_method}" and Duval triangle points to "${dga.duval_triangle}". `;
  if (dga.key_ratios) {
    query += `Key gas ratios: CH4/H2 = ${dga.key_ratios.R1_CH4_H2}, C2H4/C2H6 = ${dga.key_ratios.R2_C2H4_C2H6}, C2H2/C2H4 = ${dga.key_ratios.R3_C2H2_C2H4}. `;
  }

  if (quantum) {
    query += `Quantum analysis classified this as "${quantum.quantum_class}". `;
  }

  // The actual question — focused on REAL past failures
  query += `\n\nFind me real, documented cases of transformer failures that had similar DGA gas patterns and fault type ("${dga.fault_type}"). `;
  query += `I want to know: what utilities experienced this, what physically failed inside the transformer (e.g. winding insulation breakdown, bushing flashover, hot spots in the core), and what maintenance actions they took. `;
  query += `Also tell me what IEEE C57.104 and IEC 60599 recommend for this specific fault pattern.`;

  query += `\n\nBased on the fault type and gas patterns, which specific physical component is most likely failing? `;
  query += `Choose from: HV bushing, primary winding, winding insulation, core lamination, tap changer, `;
  query += `radiator cooling fin, oil pump, cooling fan, conservator tank, Buchholz relay, or main tank body. `;
  query += `State your answer as "Failed Component(s): [component name]".`;

  return query;
}

function ChatOverlay({ analysis, transformerId, apiBase, isOpen, onClose, onFailureDetected }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoQuerySent, setAutoQuerySent] = useState(false);
  const inputRef = useRef(null);
  const hasDetectedRef = useRef(false);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendToPerplexity = async (message) => {
    try {
      const resp = await fetch(`${apiBase}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const responseText = data.response;

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: responseText,
          citations: data.citations || [],
          timestamp: new Date().toISOString(),
        }]);

        // Detect failures in response and notify parent
        const detected = analyzeResponseForFailures(responseText);
        if (detected.length > 0) {
          hasDetectedRef.current = true;
          onFailureDetected?.(detected);
        } else if (!hasDetectedRef.current) {
          // One-time fallback: only if no component has ever been detected
          const dga = analysis?.dga_analysis;
          if (dga?.fault_type) {
            const fallback = getDefaultComponentForFault(dga.fault_type);
            if (fallback) {
              hasDetectedRef.current = true;
              onFailureDetected?.([fallback]);
            }
          }
        }
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Failed to reach Perplexity Sonar. Please try again.',
          timestamp: new Date().toISOString(),
          isError: true,
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Connection error: ${err.message}`,
        timestamp: new Date().toISOString(),
        isError: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-query on mount
  useEffect(() => {
    if (autoQuerySent || !analysis?.dga_analysis) return;
    setAutoQuerySent(true);

    const query = composeAutoQuery(analysis, transformerId);

    setLoading(true);
    sendToPerplexity(query);
  }, [analysis, transformerId, autoQuerySent]);

  const sendFollowUp = async () => {
    if (!input.trim() || loading) return;

    const userMsg = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    await sendToPerplexity(userMsg.content);
    inputRef.current?.focus();
  };

  return (
    <div className="tv-chat-section">
      {/* Header */}
      <div className="tv-chat-header">
        <div>
          <div className="tv-chat-title">AI Failure Analysis</div>
          <div className="tv-chat-subtitle">Powered by Perplexity Sonar</div>
        </div>
      </div>

      {/* Messages */}
      <div className="tv-chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`pp-msg ${msg.role} ${msg.isError ? 'error' : ''}`}>
            <div className="pp-msg-avatar">
              {msg.role === 'user'
                ? <Zap size={12} strokeWidth={1.5} />
                : <Search size={12} strokeWidth={1.5} />}
            </div>
            <div className="pp-msg-body">
              {msg.isAutoQuery ? (
                <div className="pp-auto-query-summary">
                  <span className="pp-auto-label">Auto-generated research query</span>
                  <details>
                    <summary>View full query</summary>
                    <div className="pp-query-detail">{msg.content}</div>
                  </details>
                </div>
              ) : (
                <div className="pp-msg-text cb-markdown">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}
              {msg.citations && msg.citations.length > 0 && (
                <div className="pp-citations">
                  <span className="pp-citations-label">Sources</span>
                  {msg.citations.map((url, ci) => {
                    let hostname = url;
                    try { hostname = new URL(url).hostname; } catch {}
                    return (
                      <a key={ci} href={url} target="_blank" rel="noopener noreferrer"
                         className="pp-citation-link">
                        [{ci + 1}] {hostname}
                      </a>
                    );
                  })}
                </div>
              )}
              <div className="pp-msg-meta">
                <span className="pp-msg-time">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
                {msg.role === 'assistant' && !msg.isError && (
                  <span className="pp-msg-engine">via perplexity-sonar</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="pp-msg assistant">
            <div className="pp-msg-avatar"><Search size={12} strokeWidth={1.5} /></div>
            <div className="pp-msg-body">
              <div className="cb-typing">
                <span /><span /><span />
              </div>
              <div className="pp-searching-label">Searching the web...</div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="pp-input-area">
        <input
          ref={inputRef}
          type="text"
          className="pp-input"
          placeholder="Ask a follow-up question..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendFollowUp()}
          disabled={loading}
        />
        <button
          className="pp-send"
          onClick={sendFollowUp}
          disabled={!input.trim() || loading}
        >
          {loading
            ? <Loader2 size={14} strokeWidth={1.5} className="spin" />
            : <ArrowUp size={14} strokeWidth={1.5} />}
        </button>
      </div>
    </div>
  );
}

export default ChatOverlay;
