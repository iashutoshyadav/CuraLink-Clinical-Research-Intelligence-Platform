import React from 'react';
import { motion } from 'framer-motion';
import { User, AlertTriangle, CheckCircle, Gauge, Dna, Copy, Check, Printer, Share2 } from 'lucide-react';
import ResultsTabs from '../results/ResultsTabs.jsx';
import ResultsSkeleton from '../results/ResultsSkeleton.jsx';
import StreamingText from '../ui/StreamingText.jsx';
import { formatConfidence, getConfidenceLevel, formatMetrics } from '../../utils/formatResponse.js';

export default function MessageBubble({ message }) {
  const { role, content, isStreaming, isError, result } = message;
  const isUser = role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full py-6"
      style={{ borderBottom: '1px solid #f0f0f0', background: '#ffffff' }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {isUser ? (

          <div className="flex justify-end">
            <div className="flex items-end gap-2.5 max-w-[80%]">
              <div className="px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed"
                style={{
                  background: '#f4f4f4',
                  border: '1px solid rgba(0,0,0,0.08)',
                  color: '#0d0d0d',
                  whiteSpace: 'pre-wrap',
                }}>
                {content}
              </div>
              <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mb-0.5"
                style={{ background: '#e5e7eb', border: '1px solid #d1d5db' }}>
                <User size={13} style={{ color: '#6b7280' }} />
              </div>
            </div>
          </div>
        ) : (

          <div className="flex items-start gap-4">
            {}
            <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5"
              style={{ background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', boxShadow: '0 2px 8px rgba(59,130,246,0.2)' }}>
              <Dna size={15} className="text-white" />
            </div>

            {}
            <div className="flex-1 min-w-0 space-y-3">
              {isError ? (
                <div className="flex items-center gap-2.5 rounded-xl px-4 py-3"
                  style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                  <AlertTriangle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
                  <p className="text-sm" style={{ color: '#dc2626' }}>{content}</p>
                </div>
              ) : (
                <>
                  {isStreaming && !content && !result && <ResultsSkeleton />}
                  {(isStreaming || (!result && content)) && content && (
                    <p className="text-sm leading-7" style={{ color: '#1a1a1a' }}>
                      <StreamingText text={content} isStreaming={isStreaming} />
                    </p>
                  )}
                  {result && <MetadataBar result={result} content={content} />}
                  {result && <ResultsTabs result={result} />}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MetadataBar({ result, content }) {
  const [copied, setCopied]   = React.useState(false);
  const [shared, setShared]   = React.useState(false);
  const confidence = result?.confidence_score;
  const level      = getConfidenceLevel(confidence);
  const metrics    = formatMetrics(result?.metrics);
  const validation = result?.validation;

  const confidenceColor =
    level?.label === 'High'   ? '#059669' :
    level?.label === 'Medium' ? '#d97706' : '#dc2626';

  const handleCopy = () => {
    navigator.clipboard.writeText(content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => window.print();

  const handleShare = () => {
    const params = new URLSearchParams();
    if (result?.disease) params.set('disease', result.disease);
    if (result?.query)   params.set('query', result.query);
    const url = `${window.location.origin}/chat?${params.toString()}`;
    navigator.clipboard.writeText(url);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  const actionStyle = { color: '#9ca3af' };
  const actionHoverIn  = (e) => (e.currentTarget.style.color = '#374151');
  const actionHoverOut = (e) => (e.currentTarget.style.color = '#9ca3af');

  return (
    <div className="flex items-center gap-4 flex-wrap py-0.5">
      {confidence !== null && confidence !== undefined && (
        <div className="flex items-center gap-1.5">
          <Gauge size={11} style={{ color: '#9ca3af' }} />
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: confidenceColor + '18',
              color: confidenceColor,
              border: `1px solid ${confidenceColor}40`,
            }}>
            {level?.label} · {formatConfidence(confidence)}
          </span>
        </div>
      )}

      {validation?.passed && (
        <div className="flex items-center gap-1 text-[11px]" style={{ color: '#059669' }}>
          <CheckCircle size={10} />
          Validated
        </div>
      )}

      {validation?.hasIssues && result?.validationNotice && (
        <div className="flex items-center gap-1 text-[11px]" style={{ color: '#d97706' }}>
          <AlertTriangle size={10} />
          {result.validationNotice}
        </div>
      )}

      {metrics && (
        <span className="text-[11px]" style={{ color: '#d1d5db' }}>{metrics.papers} · {metrics.total}</span>
      )}

      {}
      <div className="ml-auto flex items-center gap-3">
        <button onClick={handleCopy} className="flex items-center gap-1 text-[11px] transition-colors" style={actionStyle} onMouseEnter={actionHoverIn} onMouseLeave={actionHoverOut}>
          {copied ? <Check size={11} style={{ color: '#059669' }} /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button onClick={handleShare} className="flex items-center gap-1 text-[11px] transition-colors" style={actionStyle} onMouseEnter={actionHoverIn} onMouseLeave={actionHoverOut}>
          {shared ? <Check size={11} style={{ color: '#059669' }} /> : <Share2 size={11} />}
          {shared ? 'Copied!' : 'Share'}
        </button>
        <button onClick={handlePrint} className="flex items-center gap-1 text-[11px] transition-colors no-print" style={actionStyle} onMouseEnter={actionHoverIn} onMouseLeave={actionHoverOut}>
          <Printer size={11} />
          Export
        </button>
      </div>
    </div>
  );
}
