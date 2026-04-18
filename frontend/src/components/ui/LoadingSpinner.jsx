import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Database, Brain, FlaskConical, Layers } from 'lucide-react';

const STAGES = [
  { icon: Search,        text: 'Expanding query variants…',    color: '#3b82f6' },
  { icon: Database,      text: 'Fetching PubMed publications…', color: '#059669' },
  { icon: Database,      text: 'Fetching OpenAlex works…',      color: '#059669' },
  { icon: FlaskConical,  text: 'Retrieving clinical trials…',   color: '#7c3aed' },
  { icon: Layers,        text: 'Running hybrid ranking…',       color: '#d97706' },
  { icon: Brain,         text: 'Generating AI insights…',       color: '#3b82f6' },
];

export default function LoadingSpinner({ message = 'Running research pipeline…' }) {
  const [stageIdx, setStageIdx] = React.useState(0);

  React.useEffect(() => {
    const iv = setInterval(() => setStageIdx((i) => (i + 1) % STAGES.length), 2500);
    return () => clearInterval(iv);
  }, []);

  const stage    = STAGES[stageIdx];
  const StageIcon = stage.icon;
  const progress = ((stageIdx + 1) / STAGES.length) * 100;

  return (
    <div className="flex items-start gap-4 py-6">
      {}
      <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', boxShadow: '0 2px 8px rgba(59,130,246,0.2)' }}>
        <motion.div
          key={stageIdx}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <StageIcon size={14} className="text-white" />
        </motion.div>
      </div>

      <div className="flex-1 pt-1">
        {}
        <div className="flex items-center gap-1.5 mb-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ background: stage.color }}
              animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
            />
          ))}
        </div>

        {}
        <AnimatePresence mode="wait">
          <motion.p
            key={stageIdx}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="text-xs mb-3"
            style={{ color: stage.color }}
          >
            {stage.text}
          </motion.p>
        </AnimatePresence>

        {}
        <div className="h-0.5 rounded-full w-48" style={{ background: '#e5e7eb' }}>
          <motion.div
            className="h-full rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{ background: stage.color }}
          />
        </div>
      </div>
    </div>
  );
}
