import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FlaskConical } from 'lucide-react';
import PipelineDiagram from './pipeline/PipelineDiagram.jsx';

/* ── Inject CSS once at module level (not inside render) ─────────────────── */
const STYLE_ID = 'curalink-pipeline-styles';
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes pmEnter {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0);   }
    }
    .pm-enter {
      opacity: 0;
      animation: pmEnter 0.32s ease forwards;
    }
    .pm-card {
      transition: box-shadow 0.15s ease, transform 0.15s ease;
      transform: translate3d(0, 0, 0);
    }
    .pm-card:hover {
      transform: translate3d(0, -2px, 0);
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08) !important;
    }
  `;
  document.head.appendChild(el);
}

/* ── Modal shell ─────────────────────────────────────────────────────────── */
export default function PipelineModal({ onClose }) {
  /* Close on Escape */
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        key="pm-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
          /* NO backdropFilter — it's extremely GPU-expensive */
          background: 'rgba(15, 23, 42, 0.48)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
      >
        <motion.div
          key="pm-panel"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 640,
            maxHeight: '92vh',
            display: 'flex', flexDirection: 'column',
            borderRadius: 22, overflow: 'hidden',
            background: '#f8fafc',
            boxShadow:
              '0 24px 64px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
          }}
          initial={{ opacity: 0, scale: 0.92, y: 28 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px',
            background: '#fff',
            borderBottom: '1px solid #f1f5f9',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12,
                background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(124,58,237,0.28)',
              }}>
                <FlaskConical size={16} color="white" />
              </div>
              <div>
                <p style={{
                  margin: 0, fontSize: 14, fontWeight: 900,
                  color: '#0f172a', letterSpacing: '-0.01em',
                }}>
                  AI Research Pipeline
                </p>
                <p style={{ margin: 0, fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
                  5 stages · 180+ papers · Llama 3.3 70B · &lt;15 seconds
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                width: 30, height: 30, borderRadius: 10,
                border: 'none', cursor: 'pointer',
                background: '#f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.12s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
              aria-label="Close pipeline modal"
            >
              <X size={14} color="#475569" />
            </button>
          </div>

          {/* ── Scrollable diagram ───────────────────────────────────────── */}
          <div style={{ overflowY: 'auto', flex: 1, padding: 14 }}>
            <PipelineDiagram />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
