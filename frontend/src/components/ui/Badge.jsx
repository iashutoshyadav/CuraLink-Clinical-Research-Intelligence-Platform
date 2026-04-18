import React from 'react';

const SOURCE_STYLES = {
  PubMed: {
    bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe',
  },
  OpenAlex: {
    bg: '#f0fdf4', text: '#059669', border: '#bbf7d0',
  },
  'ClinicalTrials.gov': {
    bg: '#faf5ff', text: '#7c3aed', border: '#ddd6fe',
  },
};

export default function Badge({ source, size = 'sm' }) {
  const s = SOURCE_STYLES[source] || { bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' };
  const sizeClass = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${sizeClass}`}
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      {source}
    </span>
  );
}
