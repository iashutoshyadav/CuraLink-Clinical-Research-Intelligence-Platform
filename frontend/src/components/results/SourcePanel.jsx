import React, { useState } from 'react';
import { ChevronDown, ExternalLink, BookOpen, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Badge from '../ui/Badge.jsx';

export default function SourcePanel({ sources }) {
  const [isOpen, setIsOpen] = useState(false);
  if (!sources || sources.length === 0) return null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
      {}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors"
        style={{ background: isOpen ? '#fafafa' : '#ffffff', borderBottom: isOpen ? '1px solid #e5e7eb' : 'none' }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#fafafa'}
        onMouseLeave={(e) => e.currentTarget.style.background = isOpen ? '#fafafa' : '#ffffff'}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
            <BookOpen size={13} style={{ color: '#d97706' }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: '#0d0d0d' }}>Source Citations</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#d97706' }}>
            {sources.length}
          </span>
        </div>
        <ChevronDown size={15} style={{ color: '#9ca3af', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-3 space-y-4" style={{ background: '#ffffff' }}>
              {sources.map((src, i) => (
                <div key={src.id || i} className="flex gap-3 pb-4"
                  style={{ borderBottom: i < sources.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <span className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold mt-0.5"
                    style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#d97706' }}>
                    {src.displayId || src.id || i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap mb-1">
                      <p className="text-xs font-semibold leading-snug" style={{ color: '#0d0d0d' }}>{src.title}</p>
                      {src.platform && <Badge source={src.platform} size="xs" />}
                    </div>
                    <p className="text-xs mb-1.5" style={{ color: '#9ca3af' }}>
                      {[src.authors, src.year].filter(Boolean).join(' · ')}
                    </p>
                    {src.snippet && (
                      <div className="flex gap-2 mb-2">
                        <Quote size={10} style={{ color: '#d1d5db', flexShrink: 0, marginTop: '2px' }} />
                        <p className="text-xs italic leading-relaxed" style={{ color: '#6b7280' }}>"{src.snippet}..."</p>
                      </div>
                    )}
                    {src.url && (
                      <a href={src.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs transition-colors"
                        style={{ color: '#d97706' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#92400e'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#d97706'}
                      >
                        {src.url.slice(0, 55)}…<ExternalLink size={9} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
