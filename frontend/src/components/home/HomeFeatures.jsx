import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Brain, FlaskConical, ShieldCheck, Gauge, Zap,
  ArrowRight, BookOpen, X, CheckCircle2, Cpu, GitMerge,
  FileText, Users, TrendingUp, Award,
} from 'lucide-react';

const PIPELINE = [
  {
    stage: '01',
    title: 'Query Expansion',
    detail: 'Llama 3.2 (3B) rewrites your query into 2 semantic variants — catching synonym gaps PubMed misses.',
    color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe',
  },
  {
    stage: '02',
    title: 'Tri-Source Retrieval',
    detail: '4 parallel API calls fetch up to 600 raw results. Deduplication by DOI collapses them to 180 unique papers.',
    color: '#059669', bg: '#f0fdf4', border: '#bbf7d0',
  },
  {
    stage: '03',
    title: 'Hybrid Re-Ranking',
    detail: 'BM25 (worker thread) → MiniLM embeddings → RRF fusion → ms-marco cross-encoder. Only top 8 survive.',
    color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe',
  },
  {
    stage: '04',
    title: 'LLM Synthesis',
    detail: 'Llama 3.3 70B reasons over the top 8 papers with strict no-hallucination rules and inline [P1][P2] citations.',
    color: '#d97706', bg: '#fffbeb', border: '#fde68a',
  },
  {
    stage: '05',
    title: 'Validation + Grading',
    detail: 'Citation density checked, numeric facts verified, and an evidence grade (A/B/C/D) assigned before display.',
    color: '#dc2626', bg: '#fef2f2', border: '#fecaca',
  },
];

const FEATURES = [
  {
    icon: Search,
    title: 'Deep Retrieval',
    desc: '180 unique papers from 600+ raw results — PubMed, OpenAlex, and ClinicalTrials in parallel.',
    iconBg: '#eff6ff', iconBorder: '#bfdbfe', iconColor: '#3b82f6', topBar: '#3b82f6',
    longDesc: 'Four concurrent API calls fetch up to 150 results per source per query variant. PubMed uses esearch+efetch with API key (10 req/s), OpenAlex uses multi-page pagination, and ClinicalTrials fetches 2 pages across 3 status filters. A DOI/title deduplication layer collapses the pool to 180 unique papers before ranking. A sparse-result fallback retries with a disease-only query if fewer than 10 results are found.',
    highlights: ['150 results/source/variant', 'DOI deduplication', 'Date intent parsing ("last 3 years")', 'Sparse-result fallback'],
  },
  {
    icon: GitMerge,
    title: '5-Stage Ranking',
    desc: 'BM25 keyword → MiniLM embeddings → RRF fusion → ms-marco cross-encoder → MMR diversity.',
    iconBg: '#faf5ff', iconBorder: '#ddd6fe', iconColor: '#7c3aed', topBar: '#7c3aed',
    longDesc: 'BM25 runs in a Node.js worker thread (non-blocking). MiniLM-L6-v2 ONNX embeddings score the top 150 candidates without any external API. Reciprocal Rank Fusion (RRF, K=60) merges the two ranked lists. ms-marco-MiniLM cross-encoder re-ranks the top 15 — this is the same model used in production IR systems. MMR diversity ensures the final 12 papers cover different aspects of the query.',
    highlights: ['BM25 in worker thread', 'ONNX MiniLM (no API)', 'ms-marco cross-encoder', 'RRF fusion (K=60)'],
  },
  {
    icon: FlaskConical,
    title: 'Clinical Trials',
    detail: 'Live ClinicalTrials.gov data with phase badges, recruiting status, eligibility match, and contact info.',
    desc: 'Phase-tagged, location-filtered trials with eligibility matching and contact extraction.',
    iconBg: '#f0fdf4', iconBorder: '#bbf7d0', iconColor: '#059669', topBar: '#059669',
    longDesc: 'Fetches up to 150 trials across RECRUITING, ACTIVE_NOT_RECRUITING, and COMPLETED statuses using ClinicalTrials.gov v2 API with page-2 pagination. Filters to interventional trials only. Disease relevance scoring ensures off-topic trials are excluded. Location-aware sorting brings nearby trials first. Each card shows phase (Phase 1/2/3/4), status color badge, eligibility criteria, contact details with phone and email, and a direct ClinicalTrials.gov link.',
    highlights: ['Paginated fetches (2 pages)', 'Interventional filter', 'Phase + status badges', 'Location-aware sorting'],
  },
  {
    icon: ShieldCheck,
    title: 'Anti-Hallucination',
    desc: 'Contradiction detection, no-placeholder rules, numeric fact grounding, and deterministic trial summaries.',
    iconBg: '#fffbeb', iconBorder: '#fde68a', iconColor: '#d97706', topBar: '#d97706',
    longDesc: 'Before the LLM receives data, a contradiction detection pre-pass flags papers with conflicting signals (positive vs. negative outcomes) and injects an explicit instruction to address the conflict. The prompt bans placeholder text ("X%", "Y months"). Numeric facts must appear verbatim in source papers (±5%). Clinical trial summaries are computed deterministically from actual trial data — the LLM never generates them. A post-generation validator checks citation density and strips any remaining placeholder leaks.',
    highlights: ['Contradiction pre-pass', 'No-placeholder enforcement', '±5% numeric tolerance', 'Deterministic trial summary'],
  },
  {
    icon: Award,
    title: 'Evidence Grading',
    desc: 'Every response gets a Grade A/B/C/D based on RCT count, meta-analyses, and cohort studies found.',
    iconBg: '#ecfeff', iconBorder: '#a5f3fc', iconColor: '#0891b2', topBar: '#0891b2',
    longDesc: 'Study type tagging classifies each paper as RCT, systematic review/meta-analysis, cohort study, or peer-reviewed article — inferred from MeSH tags, OpenAlex type field, and keyword matching in titles/abstracts. The LLM then counts RCTs, meta-analyses, and cohort studies in its evidence base and assigns a grade: A (RCTs/meta dominant), B (cohort/observational), C (case reports/expert opinion), D (no direct evidence). This grade appears as a colored badge in the Summary tab.',
    highlights: ['RCT / meta / cohort tagging', 'Evidence hierarchy (A→D)', 'Per-response grade badge', 'Rationale sentence'],
  },
  {
    icon: Brain,
    title: 'Context & Memory',
    desc: 'Multi-turn sessions with follow-up classification, conversation memory, and full personalization.',
    iconBg: '#fff1f2', iconBorder: '#fecdd3', iconColor: '#e11d48', topBar: '#e11d48',
    longDesc: 'Follow-up queries are classified into 5 types: contextual, drill_down, comparison, refinement, new_topic. Contextual questions ("Can I take Vitamin D?") route to a focused prompt instead of full synthesis. UserProfile stores patient name, conditions, and query history — all injected into the LLM prompt to personalize recommendations. The conversation summary is pre-computed after each response (not at request time) so context is available instantly. Cache bypass on focused queries ensures fresh retrieval for personalized follow-ups.',
    highlights: ['5-type follow-up classifier', 'UserProfile personalization', 'Async summary compression', 'Cache-bypass on focus mode'],
  },
];

const STATS = [
  { value: '180',  label: 'Unique papers ranked', color: '#2563eb', icon: BookOpen },
  { value: '5',    label: 'Ranking stages',        color: '#7c3aed', icon: GitMerge },
  { value: '3',    label: 'Live data sources',     color: '#059669', icon: Search },
  { value: 'A–D',  label: 'Evidence grading',      color: '#0891b2', icon: Award },
];

export default function HomeFeatures() {
  const [selected, setSelected] = useState(null);

  return (
    <section className="w-full px-5 sm:px-8 pb-10 max-w-6xl mx-auto">

      {}
      <div className="py-10">
        <div className="text-center mb-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: '#3b82f6' }}>
            How It Works
          </p>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            5-Stage Research Pipeline
          </h2>
          <p className="text-sm mt-2 font-medium" style={{ color: '#6b7280' }}>
            Every query runs the full pipeline — no shortcuts.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-0 overflow-hidden rounded-2xl"
          style={{ border: '1px solid #e5e7eb' }}>
          {PIPELINE.map((s, i) => (
            <div key={s.stage} className="flex-1 relative p-5"
              style={{
                background: s.bg,
                borderRight: i < PIPELINE.length - 1 ? `1px solid ${s.border}` : 'none',
              }}>
              <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: s.color }}>
                Stage {s.stage}
              </div>
              <div className="text-sm font-bold mb-2" style={{ color: '#0d0d0d' }}>{s.title}</div>
              <p className="text-[11px] leading-relaxed" style={{ color: '#6b7280' }}>{s.detail}</p>
              {i < PIPELINE.length - 1 && (
                <div className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-5 h-5 rounded-full items-center justify-center"
                  style={{ background: '#ffffff', border: `1px solid ${s.border}` }}>
                  <ArrowRight size={10} style={{ color: s.color }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10"
      >
        {STATS.map((stat) => (
          <div key={stat.label}
            className="rounded-2xl p-5 text-center"
            style={{ background: '#fafafa', border: '1px solid #f0f0f0' }}>
            <stat.icon size={16} style={{ color: stat.color, margin: '0 auto 8px' }} />
            <p className="text-2xl font-black mb-1 tracking-tight" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#9ca3af' }}>{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {}
      <div className="text-center mb-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: '#3b82f6' }}>
          System Capabilities
        </p>
        <h2 className="text-2xl md:text-3xl font-black text-gray-950 tracking-tight">
          What Makes Curalink Different
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07, duration: 0.35 }}
            className="rounded-2xl p-6 cursor-pointer group relative overflow-hidden transition-all duration-300"
            style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
            onClick={() => setSelected(f)}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = f.iconColor;
                e.currentTarget.style.boxShadow = `0 10px 30px -10px ${f.iconColor}20`;
                e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: f.topBar }} />

            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
              style={{ background: f.iconBg, border: `1px solid ${f.iconBorder}` }}>
              <f.icon size={18} style={{ color: f.iconColor }} />
            </div>

            <h3 className="text-base font-black mb-2" style={{ color: '#000000' }}>{f.title}</h3>
            <p className="text-xs leading-relaxed font-medium" style={{ color: '#374151' }}>{f.desc}</p>

            <div className="mt-5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-all"
              style={{ color: '#9ca3af' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = f.iconColor; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; }}>
              Explore Details
              <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
            </div>
          </motion.div>
        ))}
      </div>

      {}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="absolute inset-0 backdrop-blur-sm"
              style={{ background: 'rgba(0,0,0,0.3)' }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
              style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
            >
              <div className="h-1.5 w-full" style={{ background: selected.topBar }} />
              <div className="p-7">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: selected.iconBg, border: `1px solid ${selected.iconBorder}` }}>
                      <selected.icon size={22} style={{ color: selected.iconColor }} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-gray-900">{selected.title}</h2>
                      <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: selected.iconColor }}>
                        Pipeline Component
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)}
                    className="p-2 rounded-xl transition-colors"
                    style={{ color: '#9ca3af' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f4f4f4'; e.currentTarget.style.color = '#0d0d0d'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}>
                    <X size={18} />
                  </button>
                </div>

                <p className="text-sm leading-relaxed mb-6" style={{ color: '#374151' }}>{selected.longDesc}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
                  {selected.highlights.map((h) => (
                    <div key={h} className="flex items-center gap-2 p-3 rounded-xl"
                      style={{ background: selected.iconBg, border: `1px solid ${selected.iconBorder}` }}>
                      <CheckCircle2 size={13} style={{ color: selected.iconColor, flexShrink: 0 }} />
                      <span className="text-[11px] font-semibold" style={{ color: selected.iconColor }}>{h}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setSelected(null)}
                  className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-white transition-colors"
                  style={{ background: '#0d0d0d' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#374151'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#0d0d0d'; }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
