import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, ExternalLink, FlaskConical, Hash, CheckCircle, Clock } from 'lucide-react';
import { truncate } from '../../utils/formatResponse.js';

const STATUS_STYLES = {
  RECRUITING:            { bg: '#f0fdf4', border: '#bbf7d0', text: '#059669', dot: '#10b981', label: 'Recruiting' },
  ACTIVE_NOT_RECRUITING: { bg: '#fffbeb', border: '#fde68a', text: '#d97706', dot: '#f59e0b', label: 'Active · Not Recruiting' },
  COMPLETED:             { bg: '#eef2ff', border: '#c7d2fe', text: '#4338ca', dot: '#6366f1', label: 'Completed' },
  TERMINATED:            { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', dot: '#ef4444', label: 'Terminated' },
  UNKNOWN:               { bg: '#f9fafb', border: '#e5e7eb', text: '#6b7280', dot: '#9ca3af', label: 'Unknown' },
};

const PHASE_STYLES = {
  'PHASE1':             { bg: '#fef9c3', color: '#854d0e', label: 'Phase 1' },
  'PHASE2':             { bg: '#dbeafe', color: '#1e40af', label: 'Phase 2' },
  'PHASE3':             { bg: '#ede9fe', color: '#5b21b6', label: 'Phase 3' },
  'PHASE4':             { bg: '#dcfce7', color: '#166534', label: 'Phase 4' },
  'PHASE1, PHASE2':     { bg: '#fef9c3', color: '#854d0e', label: 'Phase 1/2' },
  'PHASE2, PHASE3':     { bg: '#dbeafe', color: '#1e40af', label: 'Phase 2/3' },
  'NA':                 { bg: '#f3f4f6', color: '#6b7280', label: 'N/A' },
};

function getPhaseStyle(phase) {
  if (!phase || phase === 'N/A') return null;
  const key = phase.toUpperCase().replace(/\s/g, '');
  return PHASE_STYLES[key] || PHASE_STYLES[phase.toUpperCase()] || { bg: '#f3f4f6', color: '#6b7280', label: `Phase ${phase}` };
}

function eligibilityMatch(eligibility, disease) {
  if (!eligibility || !disease) return false;
  const terms = disease.toLowerCase().split(/\s+/).filter((t) => t.length >= 4);
  const text   = eligibility.toLowerCase();
  return terms.some((t) => text.includes(t));
}

function isRecentlyOpened(startDate) {
  if (!startDate) return false;
  const start = new Date(startDate);
  if (isNaN(start)) return false;
  const monthsAgo = (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
  return monthsAgo <= 12;
}

export default function TrialCard({ trial, index, disease }) {
  const st           = STATUS_STYLES[trial.status] || STATUS_STYLES.UNKNOWN;
  const phaseStyle   = getPhaseStyle(trial.phase);
  const matched      = eligibilityMatch(trial.eligibility, disease);
  const recentlyOpen = isRecentlyOpened(trial.startDate) && trial.status === 'RECRUITING';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-xl p-4 transition-all duration-200"
      style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ddd6fe'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(124,58,237,0.06)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ background: st.bg, border: `1px solid ${st.border}`, color: st.text }}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: st.dot }} />
          {st.label}
        </div>

        {}
        {phaseStyle && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: phaseStyle.bg, color: phaseStyle.color }}>
            <FlaskConical size={9} />
            {phaseStyle.label}
          </span>
        )}

        {}
        {recentlyOpen && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
            <Clock size={9} />New
          </span>
        )}

        {}
        {matched && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ml-auto"
            style={{ background: '#f0fdf4', color: '#059669', border: '1px solid #bbf7d0' }}>
            <CheckCircle size={9} />Matches condition
          </span>
        )}

        {}
        {trial.nctId && (
          <span className="flex items-center gap-1 text-[10px] font-mono ml-auto" style={{ color: '#9ca3af' }}>
            <Hash size={9} />{trial.nctId}
          </span>
        )}
      </div>

      {}
      <h3 className="text-sm font-semibold leading-snug mb-3" style={{ color: '#0d0d0d' }}>
        {trial.title}
      </h3>

      {}
      {trial.location && trial.location !== 'Not specified' && (
        <div className="flex items-start gap-1.5 text-xs mb-2.5" style={{ color: '#6b7280' }}>
          <MapPin size={10} style={{ color: '#7c3aed', flexShrink: 0, marginTop: '2px' }} />
          {trial.location}
        </div>
      )}

      {}
      {trial.eligibility && trial.eligibility !== 'Not specified' && (
        <div className="mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#9ca3af' }}>
            Eligibility
          </p>
          <p className="text-xs leading-relaxed pl-3" style={{ color: '#6b7280', borderLeft: `2px solid ${matched ? '#bbf7d0' : '#ddd6fe'}` }}>
            {truncate(trial.eligibility, 200)}
          </p>
        </div>
      )}

      {}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {trial.contact && trial.contact !== 'Contact not listed' && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#9ca3af' }}>
            <Phone size={10} />
            <span className="truncate max-w-xs">{trial.contact}</span>
          </div>
        )}
        {trial.url && (
          <a href={trial.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium ml-auto transition-colors"
            style={{ color: '#7c3aed' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#5b21b6'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#7c3aed'}
          >
            View on ClinicalTrials.gov<ExternalLink size={9} />
          </a>
        )}
      </div>
    </motion.div>
  );
}
