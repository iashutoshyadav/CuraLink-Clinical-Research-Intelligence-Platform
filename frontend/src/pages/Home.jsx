import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUp, Loader2, Stethoscope, User, MapPin, Dna,
  Search, Plus,
} from 'lucide-react';
import Sidebar from '../components/layout/Sidebar.jsx';
import MessageBubble from '../components/chat/MessageBubble.jsx';
import LoadingSpinner from '../components/ui/LoadingSpinner.jsx';
import useChatStore from '../store/useChatStore.js';
import useAuthStore from '../store/useAuthStore.js';
import useHistoryStore from '../store/useHistoryStore.js';
import useDarkMode from '../store/useDarkMode.js';
import { useChat } from '../hooks/useChat.js';
import { EXAMPLE_QUERIES } from '../utils/constants.js';

export default function Home() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const user = useAuthStore((s) => s.user);
  const { loadHistory } = useHistoryStore();
  const messages = useChatStore((s) => s.messages);
  const hasMessages = messages.length > 0;
  const { dark } = useDarkMode();

  useEffect(() => {
    if (user) loadHistory(user.id);
  }, [user?.id]);

  const bg = dark ? '#0d0d0d' : '#ffffff';

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: bg }}>
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
      />

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        <AnimatePresence mode="wait">
          {!hasMessages ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex flex-col flex-1 overflow-hidden">
              <EmptyCenter dark={dark} />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="flex flex-col flex-1 overflow-hidden">
              <ActiveChat dark={dark} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Empty / landing state ────────────────────────────────────── */
function EmptyCenter({ dark }) {
  const { sendMessage } = useChat();
  const isLoading = useChatStore((s) => s.isLoading);
  const { setPatientContext } = useChatStore();

  const [query, setQuery] = useState('');
  const [disease, setDisease] = useState('');
  const [patientName, setPatientName] = useState('');
  const [location, setLocation] = useState('');
  const [focused, setFocused] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const textareaRef = useRef(null);

  const bg        = dark ? '#0d0d0d' : '#ffffff';
  const inputBg   = dark ? '#1a1a1a' : '#f4f4f4';
  const inputBorder = focused ? '#3b82f6' : (dark ? '#333' : '#e5e7eb');
  const textColor = dark ? '#e5e7eb' : '#111';
  const subText   = dark ? '#9ca3af' : '#6b7280';
  const chipBg    = dark ? '#1e1e1e' : '#f4f4f4';
  const chipBorder = dark ? '#333' : '#e5e7eb';
  const chipText  = dark ? '#d1d5db' : '#374151';
  const fieldBg   = dark ? '#111' : '#fff';
  const fieldBorder = dark ? '#333' : '#e5e7eb';

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [query]);

  const canSubmit = !!query.trim() && !!disease.trim() && !isLoading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setPatientContext({ patientName, disease, location });
    await sendMessage({ query: query.trim(), disease, patientName, location });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const applyExample = (ex) => {
    setDisease(ex.disease);
    setQuery(ex.query);
    setShowContext(true);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center overflow-y-auto px-4 pb-8" style={{ background: bg }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col items-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gray-900 flex items-center justify-center shadow-lg mb-5">
          <Dna size={28} className="text-white" />
        </div>
        <h1 className="text-[28px] font-black tracking-tight mb-1" style={{ color: textColor }}>How can I help you today?</h1>
        <p className="text-[13px] font-medium" style={{ color: subText }}>Clinical research intelligence across global databases</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="w-full max-w-2xl">
        <div className="rounded-2xl transition-all duration-200"
          style={{ background: inputBg, border: `1.5px solid ${inputBorder}`, boxShadow: focused ? '0 0 0 3px rgba(59,130,246,0.1)' : '0 1px 4px rgba(0,0,0,0.06)' }}>

          <AnimatePresence>
            {showContext && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <div className="grid grid-cols-3 gap-2 p-3 pb-0">
                  {[
                    { icon: Stethoscope, value: disease, setter: setDisease, placeholder: 'Disease (required)' },
                    { icon: User, value: patientName, setter: setPatientName, placeholder: 'Patient name' },
                    { icon: MapPin, value: location, setter: setLocation, placeholder: 'Location' },
                  ].map(({ icon: Icon, value, setter, placeholder }) => (
                    <div key={placeholder} className="relative">
                      <Icon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: subText }} />
                      <input type="text" value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder}
                        className="w-full pl-8 pr-3 py-2 rounded-xl text-[12px] outline-none"
                        style={{ background: fieldBg, border: `1px solid ${fieldBorder}`, color: textColor }}
                        onFocus={(e) => { setFocused(true); e.target.style.borderColor = '#3b82f6'; }}
                        onBlur={(e) => { e.target.style.borderColor = fieldBorder; }} />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <textarea ref={textareaRef} rows={1} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            placeholder="Ask about clinical trials, research, treatments…"
            className="w-full bg-transparent px-4 pt-4 pb-3 text-[15px] outline-none resize-none leading-relaxed"
            style={{ color: textColor, maxHeight: '160px' }} />

          <div className="flex items-center justify-between px-3 pb-3 gap-2">
            <button type="button" onClick={() => setShowContext((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
              style={{ background: showContext ? '#eff6ff' : 'transparent', color: showContext ? '#3b82f6' : subText, border: showContext ? '1px solid #bfdbfe' : '1px solid transparent' }}>
              <Stethoscope size={11} />
              {disease || 'Add context'}
            </button>
            <button type="button" onClick={handleSubmit} disabled={!canSubmit}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
              style={canSubmit ? { background: '#111', boxShadow: '0 1px 4px rgba(0,0,0,0.18)' } : { background: dark ? '#333' : '#e5e7eb' }}>
              {isLoading
                ? <Loader2 size={15} className="animate-spin text-white" />
                : <ArrowUp size={16} style={{ color: canSubmit ? '#fff' : (dark ? '#555' : '#9ca3af') }} />}
            </button>
          </div>
        </div>

        {!disease && !showContext && (
          <p className="text-center text-[11px] mt-2" style={{ color: dark ? '#6b7280' : '#9ca3af' }}>
            Click <span className="font-semibold" style={{ color: dark ? '#9ca3af' : '#6b7280' }}>Add context</span> to specify disease &amp; patient info
          </p>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.12 }} className="mt-6 flex flex-wrap gap-2 justify-center max-w-2xl">
        {EXAMPLE_QUERIES.map((ex, i) => (
          <button key={i} onClick={() => applyExample(ex)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all"
            style={{ background: chipBg, border: `1px solid ${chipBorder}`, color: chipText }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.color = '#1d4ed8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = chipBg; e.currentTarget.style.borderColor = chipBorder; e.currentTarget.style.color = chipText; }}>
            <Search size={10} />
            {ex.disease}
          </button>
        ))}
      </motion.div>
    </div>
  );
}

/* ── Active chat ──────────────────────────────────────────────── */
function ActiveChat({ dark }) {
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const patientContext = useChatStore((s) => s.patientContext);
  const { sendMessage } = useChat();

  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef(null);
  const bottomRef = useRef(null);

  const bg      = dark ? '#0d0d0d' : '#ffffff';
  const barBg   = dark ? '#111' : '#ffffff';
  const barBorder = dark ? '#222' : '#f0f0f0';
  const inputBg = dark ? '#1a1a1a' : '#f4f4f4';
  const inputBorder = focused ? '#3b82f6' : (dark ? '#333' : '#e5e7eb');
  const textColor = dark ? '#e5e7eb' : '#0d0d0d';
  const subText = dark ? '#6b7280' : '#9ca3af';

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [query]);

  useEffect(() => { if (patientContext.disease) textareaRef.current?.focus(); }, []);

  const canSubmit = !!query.trim() && !isLoading && !!patientContext.disease;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const q = query.trim();
    setQuery('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await sendMessage({ query: q });
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto" style={{ background: bg }}>
        <div className="flex flex-col pt-6">
          {messages.map((msg) => <MessageBubble key={msg.id} message={msg} dark={dark} />)}
          {isLoading && messages.every((m) => !m.isStreaming) && (
            <div className="w-full max-w-3xl mx-auto px-4 sm:px-6">
              <LoadingSpinner dark={dark} />
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 px-4 pb-5 pt-3" style={{ borderTop: `1px solid ${barBorder}`, background: barBg }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {patientContext.disease && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8' }}>
                <Stethoscope size={10} />
                {patientContext.disease}
                {patientContext.patientName && <span style={{ color: '#3b82f6' }}> · {patientContext.patientName}</span>}
              </span>
            )}
            <button onClick={() => useChatStore.getState().reset()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors"
              style={{ background: dark ? '#1e1e1e' : '#f4f4f4', border: `1px solid ${dark ? '#333' : '#e5e7eb'}`, color: subText }}
              onMouseEnter={(e) => { e.currentTarget.style.background = dark ? '#2a2a2a' : '#e5e7eb'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = dark ? '#1e1e1e' : '#f4f4f4'; }}>
              <Plus size={10} /> New chat
            </button>
          </div>

          <div className="relative rounded-2xl transition-all duration-150"
            style={{ background: inputBg, border: `1.5px solid ${inputBorder}`, boxShadow: focused ? '0 0 0 3px rgba(59,130,246,0.1)' : 'none' }}>
            <textarea ref={textareaRef} rows={1} disabled={!patientContext.disease || isLoading}
              value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              placeholder="Ask a follow-up question… (Enter to send)"
              className="w-full bg-transparent px-4 pt-3.5 pb-12 text-sm outline-none resize-none leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: textColor, maxHeight: '160px' }} />
            <div className="absolute bottom-3 left-4 right-3 flex items-center justify-between pointer-events-none">
              <span className="text-[11px]" style={{ color: subText }}>
                {isLoading ? <span style={{ color: '#3b82f6' }}>Curalink is thinking…</span> : 'Shift+Enter for new line'}
              </span>
              <button type="button" onClick={handleSubmit} disabled={!canSubmit}
                className="pointer-events-auto w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                style={canSubmit ? { background: '#111', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' } : { background: dark ? '#333' : '#e5e7eb' }}>
                {isLoading
                  ? <Loader2 size={14} className="animate-spin text-white" />
                  : <ArrowUp size={14} style={{ color: canSubmit ? '#fff' : (dark ? '#555' : '#9ca3af') }} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
