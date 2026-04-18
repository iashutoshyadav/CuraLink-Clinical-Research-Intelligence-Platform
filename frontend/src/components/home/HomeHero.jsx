import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, MapPin, Stethoscope, Search, ArrowRight, Sparkles, Dna } from 'lucide-react';
import useChatStore from '../../store/useChatStore.js';
import { useChat } from '../../hooks/useChat.js';
import { EXAMPLE_QUERIES } from '../../utils/constants.js';

const PIPELINE_STAGES = [
  { label: 'Query Expansion', color: '#3b82f6', bg: '#eff6ff' },
  { label: 'Tri-Source Fetch', color: '#059669', bg: '#f0fdf4' },
  { label: 'Hybrid Ranking', color: '#7c3aed', bg: '#faf5ff' },
  { label: 'LLM Reasoning', color: '#d97706', bg: '#fffbeb' },
  { label: 'Anti-Hallucination Validation', color: '#dc2626', bg: '#fef2f2' },
];

const SOURCES = [
  { name: 'PubMed', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { name: 'OpenAlex', color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
  { name: 'ClinicalTrials.gov', color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe' },
];

export default function HomeHero() {
  const navigate = useNavigate();
  const { setPatientContext } = useChatStore();
  const { sendMessage } = useChat();
  const isLoading = useChatStore((s) => s.isLoading);

  const [form, setForm] = useState({ patientName: '', disease: '', query: '', location: '' });

  const handleChange = (f) => (e) => setForm((s) => ({ ...s, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.disease || !form.query) return;
    setPatientContext({ patientName: form.patientName, disease: form.disease, location: form.location });
    navigate('/chat');
    setTimeout(async () => {
      await sendMessage({ query: form.query, disease: form.disease, patientName: form.patientName, location: form.location });
    }, 100);
  };

  return (
    <section className="w-full px-5 sm:px-8 pt-4 pb-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-3xl mx-auto"
      >
        { }
        <h1 className="font-black mb-4 leading-[1.08] tracking-[-0.03em]"
          style={{ fontSize: 'clamp(2rem, 4.5vw, 3.4rem)', color: '#0d0d0d' }}>
          Medical Research Intelligence{' '}
          <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            Cites Every Discovery
          </span>
        </h1>

        { }
        <p className="text-base leading-relaxed max-w-xl mx-auto mb-6 font-medium" style={{ color: '#1f2937' }}>
          Retrieves <strong style={{ color: '#1d4ed8' }}>180+ papers</strong> from 3 live databases,
          re-ranks with a <strong style={{ color: '#7c3aed' }}>cross-encoder</strong>, and synthesises a
          <strong style={{ color: '#059669' }}> structured, evidence-graded</strong> answer — in under 15 seconds.
        </p>

        { }
        <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
          {SOURCES.map((s) => (
            <span key={s.name} className="text-[11px] font-semibold px-3 py-1.5 rounded-full"
              style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
              {s.name}
            </span>
          ))}
          <span className="text-[11px] font-semibold px-3 py-1.5 rounded-full"
            style={{ background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb' }}>
            + Llama 3.3 70B
          </span>
        </div>

        { }
        <div className="flex items-center justify-center gap-1 flex-wrap mb-8">
          {PIPELINE_STAGES.map((s, i) => (
            <React.Fragment key={s.label}>
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                style={{ background: s.bg, color: s.color }}>
                {i + 1}. {s.label}
              </span>
              {i < PIPELINE_STAGES.length - 1 && (
                <ArrowRight size={10} style={{ color: '#d1d5db', flexShrink: 0 }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </motion.div>

      { }
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="max-w-2xl mx-auto rounded-3xl p-7 relative"
        style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}
      >
        { }
        <div className="absolute top-6 right-6 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Live</span>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-5" style={{ color: '#4b5563' }}>
          Start Research
        </p>

        { }
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {[
            { icon: User, field: 'patientName', placeholder: 'Patient name (optional)' },
            { icon: MapPin, field: 'location', placeholder: 'Location (optional)' },
          ].map(({ icon: Icon, field, placeholder }) => (
            <div key={field} className="relative">
              <Icon size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: '#4b5563' }} />
              <input
                className="w-full rounded-xl border pl-9 pr-4 py-3 text-sm outline-none transition-all placeholder:text-gray-500 font-medium"
                style={{ border: '1px solid #d1d5db', background: '#ffffff', color: '#000000' }}
                placeholder={placeholder}
                value={form[field]}
                onChange={handleChange(field)}
                onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#fff'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
              />
            </div>
          ))}
        </div>

        { }
        <div className="space-y-3 mb-5">
          {[
            { icon: Stethoscope, field: 'disease', placeholder: 'Disease / Condition *', required: true },
            { icon: Search, field: 'query', placeholder: 'Research question *', required: true },
          ].map(({ icon: Icon, field, placeholder, required }) => (
            <div key={field} className="relative">
              <Icon size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: '#4b5563' }} />
              <input
                className="w-full rounded-xl border pl-9 pr-4 py-3 text-sm outline-none transition-all placeholder:text-gray-500 font-medium"
                style={{ border: '1px solid #d1d5db', background: '#ffffff', color: '#000000' }}
                placeholder={placeholder}
                value={form[field]}
                onChange={handleChange(field)}
                required={required}
                onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.background = '#fff'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
              />
            </div>
          ))}
        </div>

        { }
        <button
          type="submit"
          disabled={isLoading || !form.disease || !form.query}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-[13px] font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)',
            boxShadow: '0 4px 14px rgba(29,78,216,0.3)',
          }}
          onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.boxShadow = '0 6px 20px rgba(29,78,216,0.45)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(29,78,216,0.3)'; }}
        >
          {isLoading
            ? <><Search size={14} className="animate-spin" />Running Pipeline…</>
            : <><Search size={14} />Run Deep Research<ArrowRight size={13} /></>
          }
        </button>

        { }
        <div className="mt-5 pt-5" style={{ borderTop: '1px solid #f0f0f0' }}>
          <div className="flex items-center gap-1.5 mb-3">
            <Sparkles size={11} style={{ color: '#3b82f6' }} />
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#4b5563' }}>
              Try an example
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setPatientContext({ disease: ex.disease, location: '' });
                  navigate('/chat');
                  setTimeout(async () => {
                    await sendMessage({ query: ex.query, disease: ex.disease, patientName: '', location: '' });
                  }, 100);
                }}
                className="text-[11px] px-3 py-1.5 rounded-lg font-bold transition-all"
                style={{ background: '#f4f4f4', color: '#111827', border: '1px solid #e5e7eb' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.color = '#1d4ed8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f4f4f4'; e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#374151'; }}
              >
                {ex.disease} →
              </button>
            ))}
          </div>
        </div>
      </motion.form>
    </section>
  );
}
