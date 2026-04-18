import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, BookOpen, Users, Calendar, ChevronDown } from 'lucide-react';
import Badge from '../ui/Badge.jsx';
import { truncate } from '../../utils/formatResponse.js';

function bm25Label(score) {
  if (score == null) return null;
  if (score >= 0.6) return { label: 'High',   bg: '#f0fdf4', color: '#059669' };
  if (score >= 0.25) return { label: 'Medium', bg: '#fffbeb', color: '#d97706' };
  return               { label: 'Low',    bg: '#f9fafb', color: '#9ca3af' };
}

function cePercent(logit) {
  if (logit == null) return null;
  return Math.round(100 / (1 + Math.exp(-logit * 0.4)));
}

export default function PublicationCard({ pub, index }) {
  const [showSignals, setShowSignals] = useState(false);

  const authors = Array.isArray(pub.authors)
    ? pub.authors.slice(0, 3).join(', ') + (pub.authors.length > 3 ? ' et al.' : '')
    : pub.authors || 'Unknown authors';

  const matchPct  = pub.finalScore != null ? Math.min(Math.round(pub.finalScore * 100), 100) : null;
  const bm25      = bm25Label(pub.keywordScore);
  const semanticPct = pub.embeddingScore != null ? Math.round(pub.embeddingScore * 100) : null;
  const cePct     = cePercent(pub.crossEncoderScore);
  const hasSignals = bm25 || semanticPct != null || cePct != null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-xl p-4 transition-all duration-200"
      style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(59,130,246,0.08)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge source={pub.source} />
          {pub.year && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: '#9ca3af' }}>
              <Calendar size={10} />{pub.year}
            </span>
          )}
          {pub.studyType && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe' }}>
              {pub.studyType}
            </span>
          )}
        </div>
        {matchPct != null && (
          <span className="text-[11px] font-semibold flex-shrink-0 px-2 py-0.5 rounded-full"
            style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#059669' }}>
            {matchPct}% match
          </span>
        )}
      </div>

      {}
      <h3 className="text-sm font-semibold leading-snug mb-2" style={{ color: '#0d0d0d' }}>
        {pub.title}
      </h3>

      {}
      <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: '#9ca3af' }}>
        <Users size={10} />
        <span className="truncate">{authors}</span>
        {pub.journal && <span style={{ color: '#6b7280' }}>· {pub.journal}</span>}
      </div>

      {}
      {pub.abstract && (
        <p className="text-xs leading-relaxed mb-3 pl-3"
          style={{ color: '#6b7280', borderLeft: '2px solid #bfdbfe' }}>
          {truncate(pub.abstract, 250)}
        </p>
      )}

      {}
      {hasSignals && (
        <div className="mb-3">
          <button
            onClick={() => setShowSignals((v) => !v)}
            className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider transition-colors"
            style={{ color: showSignals ? '#3b82f6' : '#9ca3af' }}
          >
            Ranking signals
            <ChevronDown size={10} style={{ transform: showSignals ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>

          {showSignals && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="mt-2 flex flex-wrap gap-2"
            >
              {}
              {bm25 && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium"
                  style={{ background: bm25.bg, color: bm25.color, border: `1px solid ${bm25.color}22` }}>
                  <span style={{ fontWeight: 700 }}>BM25</span>
                  <span>{bm25.label}</span>
                  <span style={{ opacity: 0.6 }}>({(pub.keywordScore * 100).toFixed(0)}%)</span>
                </div>
              )}

              {}
              {semanticPct != null && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium"
                  style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ede9fe' }}>
                  <span style={{ fontWeight: 700 }}>Semantic</span>
                  <span>{semanticPct}%</span>
                </div>
              )}

              {}
              {cePct != null && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium"
                  style={{ background: '#fff7ed', color: '#d97706', border: '1px solid #fed7aa' }}>
                  <span style={{ fontWeight: 700 }}>Cross-encoder</span>
                  <span>{cePct}%</span>
                </div>
              )}

              {}
              {pub.citationCount > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium"
                  style={{ background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                  <span style={{ fontWeight: 700 }}>Cited</span>
                  <span>{pub.citationCount.toLocaleString()}×</span>
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}

      {}
      <div className="flex items-center justify-between">
        {pub.citationCount > 0 && !showSignals && (
          <span className="text-xs" style={{ color: '#9ca3af' }}>
            {pub.citationCount.toLocaleString()} citations
          </span>
        )}
        {pub.url && (
          <a href={pub.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium ml-auto transition-colors"
            style={{ color: '#3b82f6' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#1d4ed8'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#3b82f6'}
          >
            <BookOpen size={11} />View Article<ExternalLink size={9} />
          </a>
        )}
      </div>
    </motion.div>
  );
}
