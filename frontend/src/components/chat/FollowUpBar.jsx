import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Loader2, Stethoscope, Plus, History, X, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import useChatStore from '../../store/useChatStore.js';
import { useChat } from '../../hooks/useChat.js';

export default function ChatInput() {
  const [query, setQuery]           = useState('');
  const [focused, setFocused]       = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory]       = useState([]);
  const { sendMessage }             = useChat();
  const isLoading                   = useChatStore((s) => s.isLoading);
  const patientContext              = useChatStore((s) => s.patientContext);
  const textareaRef                 = useRef(null);
  const navigate                    = useNavigate();
  const hasContext                  = !!patientContext.disease;

  const loadHistory = () => {
    try {
      setHistory(JSON.parse(localStorage.getItem('curalink_history') || '[]'));
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [query]);

  useEffect(() => {
    if (hasContext) textareaRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!query.trim() || isLoading || !hasContext) return;
    const q = query.trim();
    setQuery('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await sendMessage({ query: q });
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSubmit = !!query.trim() && !isLoading && hasContext;

  return (
    <div className="w-full px-4 pb-5 pt-3"
      style={{ borderTop: '1px solid #f0f0f0', background: '#ffffff' }}>
      <div className="max-w-3xl mx-auto">

        {}
        {hasContext && (
          <div className="relative flex items-center gap-2 mb-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8' }}>
              <Stethoscope size={10} />
              {patientContext.disease}
              {patientContext.patientName && (
                <span style={{ color: '#3b82f6' }}> · {patientContext.patientName}</span>
              )}
            </div>
            <Link to="/"
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] transition-colors"
              style={{ background: '#f4f4f4', border: '1px solid #e5e7eb', color: '#6b7280' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e5e7eb'; e.currentTarget.style.color = '#374151'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f4f4f4'; e.currentTarget.style.color = '#6b7280'; }}
              onClick={() => useChatStore.getState().reset()}
            >
              <Plus size={10} />
              New search
            </Link>
            <button
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] transition-colors"
              style={{ background: '#f4f4f4', border: '1px solid #e5e7eb', color: '#6b7280' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e5e7eb'; e.currentTarget.style.color = '#374151'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f4f4f4'; e.currentTarget.style.color = '#6b7280'; }}
              onClick={() => { loadHistory(); setShowHistory((v) => !v); }}
            >
              <History size={10} />
              History
            </button>

            {}
            {showHistory && (
              <div className="absolute top-8 left-0 z-50 w-80 rounded-2xl shadow-xl overflow-hidden"
                style={{ background: '#ffffff', border: '1px solid #e5e7eb', maxHeight: 340, overflowY: 'auto' }}>
                <div className="flex items-center justify-between px-4 py-2.5"
                  style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <span className="text-[11px] font-semibold" style={{ color: '#374151' }}>Recent searches</span>
                  <button onClick={() => setShowHistory(false)}>
                    <X size={12} style={{ color: '#9ca3af' }} />
                  </button>
                </div>
                {history.length === 0 ? (
                  <p className="text-[11px] px-4 py-4 text-center" style={{ color: '#9ca3af' }}>No searches yet</p>
                ) : (
                  history.map((item) => (
                    <button key={item.id}
                      className="w-full text-left px-4 py-3 transition-colors"
                      style={{ borderBottom: '1px solid #f9fafb' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      onClick={() => {
                        setShowHistory(false);
                        useChatStore.getState().reset();
                        useChatStore.getState().setPatientContext({ disease: item.disease });
                        navigate('/chat');
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <Clock size={10} style={{ color: '#9ca3af', marginTop: 2, flexShrink: 0 }} />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold truncate" style={{ color: '#374151' }}>{item.disease}</p>
                          <p className="text-[10px] truncate" style={{ color: '#6b7280' }}>{item.query}</p>
                          <p className="text-[10px]" style={{ color: '#d1d5db' }}>{new Date(item.timestamp).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {}
        <div className="relative rounded-2xl transition-all duration-150"
          style={{
            background: '#f4f4f4',
            border: `1px solid ${focused ? '#3b82f6' : '#e5e7eb'}`,
            boxShadow: focused ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none',
          }}>
          <textarea
            ref={textareaRef}
            rows={1}
            disabled={!hasContext || isLoading}
            className="w-full bg-transparent px-4 pt-3.5 pb-12 text-sm outline-none resize-none
                       leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder={hasContext ? 'Ask a follow-up question… (Enter to send)' : 'Start a new search above'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{ color: '#0d0d0d', maxHeight: '160px' }}
          />

          {}
          <div className="absolute bottom-3 left-4 right-3 flex items-center justify-between pointer-events-none">
            <span className="text-[11px]" style={{ color: '#9ca3af' }}>
              {isLoading
                ? <span style={{ color: '#3b82f6' }}>Curalink is thinking…</span>
                : 'Shift+Enter for new line'}
            </span>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="pointer-events-auto w-8 h-8 rounded-xl flex items-center justify-center
                         transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
              style={canSubmit ? {
                background: '#0d0d0d',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              } : { background: '#e5e7eb' }}
            >
              {isLoading
                ? <Loader2 size={14} className="animate-spin" style={{ color: '#ffffff' }} />
                : <ArrowUp size={14} style={{ color: canSubmit ? '#ffffff' : '#9ca3af' }} />
              }
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
