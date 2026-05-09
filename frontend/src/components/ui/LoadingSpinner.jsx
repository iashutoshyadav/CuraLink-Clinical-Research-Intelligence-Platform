import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Database, Layers, Brain, Zap } from 'lucide-react';
import useChatStore from '../../store/useChatStore.js';

const STAGE_MAP = {
  expanding: { icon: Search,    label: 'Expanding query variants…',    color: '#3b82f6' },
  fetching:  { icon: Database,  label: 'Fetching publications & trials…', color: '#059669' },
  ranking:   { icon: Layers,    label: 'Running hybrid ranking…',       color: '#d97706' },
  reasoning: { icon: Brain,     label: 'Generating AI insights…',       color: '#7c3aed' },
  done:      { icon: Zap,       label: 'Finishing up…',                 color: '#3b82f6' },
};

const FALLBACK = { icon: Brain, label: 'Running research pipeline…', color: '#3b82f6' };

export default function LoadingSpinner({ dark = false }) {
  const pipelineStage = useChatStore((s) => s.pipelineStage);
  const stage = STAGE_MAP[pipelineStage] || FALLBACK;
  const StageIcon = stage.icon;

  const stageKeys = Object.keys(STAGE_MAP);
  const stageIdx = stageKeys.indexOf(pipelineStage);
  const progress = stageIdx >= 0 ? ((stageIdx + 1) / stageKeys.length) * 100 : 20;

  const trackColor = dark ? '#1f1f1f' : '#e5e7eb';

  return (
    <div className="flex items-start gap-4 py-6">
      <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', boxShadow: '0 2px 8px rgba(59,130,246,0.2)' }}>
        <motion.div key={pipelineStage} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.2 }}>
          <StageIcon size={14} className="text-white" />
        </motion.div>
      </div>

      <div className="flex-1 pt-1">
        {/* Animated dots */}
        <div className="flex items-center gap-1.5 mb-2">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} className="w-2 h-2 rounded-full" style={{ background: stage.color }}
              animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }} />
          ))}
        </div>

        {/* Stage label */}
        <AnimatePresence mode="wait">
          <motion.p key={pipelineStage} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            className="text-xs mb-3 font-medium" style={{ color: stage.color }}>
            {stage.label}
          </motion.p>
        </AnimatePresence>

        {/* Progress bar */}
        <div className="h-0.5 rounded-full w-48" style={{ background: trackColor }}>
          <motion.div className="h-full rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.5, ease: 'easeOut' }} style={{ background: stage.color }} />
        </div>
      </div>
    </div>
  );
}
