import React, { useState, useRef, useEffect } from 'react';
import { User, MapPin, Stethoscope, ArrowUp, Loader2, Search, Sparkles, Brain } from 'lucide-react';
import { motion } from 'framer-motion';
import useChatStore from '../../store/useChatStore.js';
import { useChat } from '../../hooks/useChat.js';
import { EXAMPLE_QUERIES } from '../../utils/constants.js';

export default function InputForm() {
  const { setPatientContext } = useChatStore();
  const { sendMessage } = useChat();
  const isLoading = useChatStore((s) => s.isLoading);
  const textareaRef = useRef(null);

  const [form, setForm] = useState({ patientName: '', disease: '', query: '', location: '' });
  const [focused, setFocused] = useState(false);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [form.query]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.disease || !form.query) return;
    setPatientContext({ patientName: form.patientName, disease: form.disease, location: form.location });
    await sendMessage({ query: form.query, disease: form.disease, patientName: form.patientName, location: form.location });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && form.disease && form.query) handleSubmit();
    }
  };

  const canSubmit = !isLoading && !!form.disease && !!form.query;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="w-full px-4 pb-12 pt-4"
    >
      <div className="max-w-3xl mx-auto premium-card !p-8 !rounded-[2.5rem] border-white/60 relative">

        {}
        <div className="absolute top-8 right-8 flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-100/50">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
          <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">Console Active</span>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-8 text-gray-900">
          Medical Search Console
        </p>

        {}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {[
            { icon: User, field: 'patientName', placeholder: 'Patient name...' },
            { icon: Stethoscope, field: 'disease', placeholder: 'Disease Target*', required: true },
            { icon: MapPin, field: 'location', placeholder: 'Geographic scope...' },
          ].map(({ icon: Icon, field, placeholder, required }) => (
            <div key={field} className="relative group">
              <Icon size={13} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-700 group-focus-within:text-brand-500 transition-colors" />
              <input
                className="atmosphere-input !pl-10 !py-3 !text-[13px] !text-gray-900 placeholder-gray-600"
                placeholder={placeholder}
                value={form[field]}
                onChange={handleChange(field)}
                required={required}
              />
            </div>
          ))}
        </div>

        {}
        <div className="relative rounded-2xl transition-all duration-300 group"
          style={{
            background: focused ? '#ffffff' : 'rgba(249, 250, 251, 0.5)',
            border: `1px solid ${focused ? '#3b82f6' : 'rgba(229, 231, 235, 0.5)'}`,
            boxShadow: focused ? '0 10px 25px -10px rgba(59,130,246,0.15), 0 0 0 4px rgba(59,130,246,0.03)' : 'none',
          }}>
          <textarea
            ref={textareaRef}
            rows={1}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="w-full bg-transparent px-5 pt-5 pb-14 text-[15px] outline-none resize-none leading-relaxed font-medium placeholder:text-gray-600"
            placeholder="Describe your primary research inquiry in detail..."
            value={form.query}
            onChange={handleChange('query')}
            onKeyDown={handleKeyDown}
            style={{ color: '#000000', maxHeight: '180px' }}
          />

          <div className="absolute bottom-4 left-5 right-4 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2">
              <Brain size={14} className={form.disease ? 'text-brand-500' : 'text-gray-700'} />
              <span className="text-[11px] font-bold" style={{ color: form.disease ? '#3b82f6' : '#4b5563' }}>
                {form.disease
                  ? <span>Targeting: {form.disease}</span>
                  : 'Establish disease scope above'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="pointer-events-auto w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                         disabled:opacity-30 disabled:cursor-not-allowed group-hover:scale-105"
              style={canSubmit ? {
                background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              } : { background: '#e5e7eb' }}
            >
              {isLoading
                ? <Loader2 size={16} className="animate-spin text-white" />
                : <ArrowUp size={18} className={canSubmit ? 'text-white' : 'text-gray-400'} />
              }
            </button>
          </div>
        </div>

        {}
        <div className="mt-10 pt-8 border-t border-gray-100/50">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={12} className="text-brand-500" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-900">Research Discovery Patterns</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setForm((f) => ({ ...f, disease: ex.disease, query: ex.query }))}
                className="group flex items-center gap-2 text-[11px] px-4 py-2.5 rounded-xl transition-all duration-300
                           bg-gray-50/50 border border-gray-200/40 hover:border-brand-200 hover:bg-brand-50/50 text-gray-900
                           hover:text-brand-700 font-bold"
              >
                <Search size={10} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                {ex.disease}
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-[10px] font-bold text-gray-800 uppercase tracking-widest mt-8">
          Standard Research Protocol · Curalink Intelligence
        </p>
      </div>
    </motion.div>
  );
}
