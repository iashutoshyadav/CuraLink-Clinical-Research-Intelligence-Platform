import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useChatStore from '../../store/useChatStore.js';

const STAGES = [
  {
    id: 'expanding',
    label: 'Expanding query',
    detail: 'Generating 4 semantic search variants with LLM',
    icon: '🔍',
  },
  {
    id: 'fetching',
    label: 'Fetching research',
    detail: 'Pulling from PubMed (200) · OpenAlex (200) · ClinicalTrials (50)',
    icon: '📡',
  },
  {
    id: 'ranking',
    label: 'Ranking & filtering',
    detail: 'BM25 keyword + MiniLM semantic embeddings + RRF fusion',
    icon: '⚡',
  },
  {
    id: 'reasoning',
    label: 'AI reasoning',
    detail: 'Synthesising top-8 papers into structured insights',
    icon: '🧠',
  },
  {
    id: 'done',
    label: 'Complete',
    detail: 'Response ready',
    icon: '✅',
  },
];

function getStageIndex(stage) {
  return STAGES.findIndex((s) => s.id === stage);
}

export default function PipelineProgress() {
  const { pipelineStage, isLoading, cacheHit } = useChatStore();

  if (!isLoading || !pipelineStage || pipelineStage === 'done') return null;

  const currentIdx = getStageIndex(pipelineStage);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="max-w-3xl mx-auto px-4 sm:px-6 py-4"
      >
        <div className="rounded-2xl p-4" style={{ background: '#fafafa', border: '1px solid #e5e7eb' }}>
          {}
          <div className="flex items-center gap-2 mb-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #3b82f6', borderTopColor: 'transparent' }}
            />
            <span className="text-xs font-semibold" style={{ color: '#374151' }}>
              Running AI Research Pipeline
            </span>
            {cacheHit && (
              <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: '#dcfce7', color: '#16a34a' }}>
                Cache hit
              </span>
            )}
          </div>

          {}
          <div className="space-y-2">
            {STAGES.filter((s) => s.id !== 'done').map((stage, idx) => {
              const isDone = idx < currentIdx;
              const isActive = idx === currentIdx;
              const isPending = idx > currentIdx;

              return (
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isPending ? 0.4 : 1 }}
                  className="flex items-start gap-3"
                >
                  {}
                  <div className="flex-shrink-0 mt-0.5" style={{ width: 18, height: 18 }}>
                    {isDone ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-full h-full rounded-full flex items-center justify-center text-[10px]"
                        style={{ background: '#dcfce7', color: '#16a34a' }}
                      >
                        ✓
                      </motion.div>
                    ) : isActive ? (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-full h-full rounded-full"
                        style={{ background: '#3b82f6' }}
                      />
                    ) : (
                      <div className="w-full h-full rounded-full" style={{ background: '#e5e7eb' }} />
                    )}
                  </div>

                  {}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: isActive ? '#1d4ed8' : isDone ? '#374151' : '#9ca3af' }}>
                        {stage.icon} {stage.label}
                      </span>
                    </div>
                    {(isActive || isDone) && (
                      <p className="text-[11px] mt-0.5" style={{ color: '#9ca3af' }}>{stage.detail}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
