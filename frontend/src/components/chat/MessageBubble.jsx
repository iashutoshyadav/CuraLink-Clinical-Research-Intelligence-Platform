import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, AlertTriangle, CheckCircle, Gauge, Dna, Copy, Check, Printer, Share2 } from 'lucide-react';
import ResultsTabs from '../results/ResultsTabs.jsx';
import ResultsSkeleton from '../results/ResultsSkeleton.jsx';
import StreamingText from '../ui/StreamingText.jsx';
import { formatConfidence, getConfidenceLevel, formatMetrics } from '../../utils/formatResponse.js';

export default function MessageBubble({ message, dark = false }) {
  const { role, content, isStreaming, isError, result } = message;
  const isUser = role === 'user';

  const bg       = dark ? '#0d0d0d' : '#ffffff';
  const divider  = dark ? '#1f1f1f' : '#f0f0f0';
  const userBubbleBg = dark ? '#1e1e1e' : '#f4f4f4';
  const userBubbleBorder = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  const userText = dark ? '#e5e7eb' : '#0d0d0d';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full py-6"
      style={{ borderBottom: `1px solid ${divider}`, background: bg }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {isUser ? (
          <div className="flex justify-end">
            <div className="flex items-end gap-2.5 max-w-[80%]">
              <div className="px-4 py-3 rounded-2xl rounded-br-sm text-sm leading-relaxed"
                style={{ background: userBubbleBg, border: `1px solid ${userBubbleBorder}`, color: userText, whiteSpace: 'pre-wrap' }}>
                {content}
              </div>
              <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mb-0.5"
                style={{ background: dark ? '#374151' : '#e5e7eb', border: `1px solid ${dark ? '#4b5563' : '#d1d5db'}` }}>
                <User size={13} style={{ color: dark ? '#9ca3af' : '#6b7280' }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5"
              style={{ background: '#111111', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
              <Dna size={15} className="text-white" />
            </div>

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
                    <MarkdownContent text={content} isStreaming={isStreaming} dark={dark} />
                  )}
                  {result && <MetadataBar result={result} content={content} dark={dark} />}
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

/* ── Markdown renderer with dark-mode prose styles ─────────────── */
function MarkdownContent({ text, isStreaming, dark }) {
  const proseColor = dark ? '#d1d5db' : '#1a1a1a';
  const codeInlineBg = dark ? '#1e1e1e' : '#f3f4f6';
  const codeInlineColor = dark ? '#93c5fd' : '#1d4ed8';
  const codeBlockBg = dark ? '#111' : '#f9fafb';
  const blockquoteBorder = dark ? '#374151' : '#e5e7eb';
  const hrColor = dark ? '#1f2937' : '#f3f4f6';
  const linkColor = '#3b82f6';
  const strongColor = dark ? '#f9fafb' : '#111';
  const h2Color = dark ? '#f3f4f6' : '#111827';
  const h3Color = dark ? '#e5e7eb' : '#1f2937';

  if (isStreaming) {
    return (
      <p className="text-sm leading-7" style={{ color: proseColor }}>
        <StreamingText text={text} isStreaming={isStreaming} />
      </p>
    );
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="text-sm leading-7 mb-3 last:mb-0" style={{ color: proseColor }}>{children}</p>
        ),
        h1: ({ children }) => (
          <h1 className="text-xl font-black mb-3 mt-4" style={{ color: h2Color }}>{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-bold mb-2 mt-4" style={{ color: h2Color }}>{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-bold mb-1.5 mt-3" style={{ color: h3Color }}>{children}</h3>
        ),
        ul: ({ children }) => (
          <ul className="list-none pl-0 mb-3 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-5 mb-3 space-y-1 text-sm" style={{ color: proseColor }}>{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-sm leading-6 flex gap-2" style={{ color: proseColor }}>
            <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#3b82f6' }} />
            <span>{children}</span>
          </li>
        ),
        code: ({ inline, children }) =>
          inline ? (
            <code className="px-1.5 py-0.5 rounded text-[12px] font-mono"
              style={{ background: codeInlineBg, color: codeInlineColor }}>{children}</code>
          ) : (
            <pre className="rounded-xl p-4 overflow-x-auto mb-3"
              style={{ background: codeBlockBg, border: `1px solid ${dark ? '#1f2937' : '#e5e7eb'}` }}>
              <code className="text-[12px] font-mono" style={{ color: proseColor }}>{children}</code>
            </pre>
          ),
        blockquote: ({ children }) => (
          <blockquote className="pl-4 my-3 text-sm leading-7 italic"
            style={{ borderLeft: `3px solid ${blockquoteBorder}`, color: dark ? '#9ca3af' : '#6b7280' }}>
            {children}
          </blockquote>
        ),
        strong: ({ children }) => <strong style={{ color: strongColor, fontWeight: 700 }}>{children}</strong>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="underline hover:opacity-80" style={{ color: linkColor }}>{children}</a>
        ),
        hr: () => <hr className="my-4" style={{ borderColor: hrColor }} />,
        table: ({ children }) => (
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-[12px] border-collapse">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left font-semibold text-[11px] uppercase tracking-wider"
            style={{ background: dark ? '#1e1e1e' : '#f9fafb', color: dark ? '#9ca3af' : '#6b7280', borderBottom: `1px solid ${dark ? '#333' : '#e5e7eb'}` }}>
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-[12px]"
            style={{ color: proseColor, borderBottom: `1px solid ${dark ? '#1f1f1f' : '#f3f4f6'}` }}>
            {children}
          </td>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

/* ── Metadata bar ───────────────────────────────────────────────── */
function MetadataBar({ result, content, dark }) {
  const [copied, setCopied] = React.useState(false);
  const [shared, setShared] = React.useState(false);
  const confidence = result?.confidence_score;
  const level      = getConfidenceLevel(confidence);
  const metrics    = formatMetrics(result?.metrics);
  const validation = result?.validation;

  const confidenceColor =
    level?.label === 'High'   ? '#059669' :
    level?.label === 'Medium' ? '#d97706' : '#dc2626';

  const mutedColor = dark ? '#4b5563' : '#9ca3af';
  const actionStyle = { color: mutedColor };
  const actionHoverIn  = (e) => (e.currentTarget.style.color = dark ? '#d1d5db' : '#374151');
  const actionHoverOut = (e) => (e.currentTarget.style.color = mutedColor);

  const handleCopy = () => { navigator.clipboard.writeText(content || ''); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handlePrint = () => window.print();
  const handleShare = () => {
    const params = new URLSearchParams();
    if (result?.disease) params.set('disease', result.disease);
    if (result?.query)   params.set('query', result.query);
    navigator.clipboard.writeText(`${window.location.origin}?${params.toString()}`);
    setShared(true); setTimeout(() => setShared(false), 2000);
  };

  return (
    <div className="flex items-center gap-4 flex-wrap py-0.5">
      {confidence !== null && confidence !== undefined && (
        <div className="flex items-center gap-1.5">
          <Gauge size={11} style={{ color: mutedColor }} />
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: confidenceColor + '18', color: confidenceColor, border: `1px solid ${confidenceColor}40` }}>
            {level?.label} · {formatConfidence(confidence)}
          </span>
        </div>
      )}
      {validation?.passed && (
        <div className="flex items-center gap-1 text-[11px]" style={{ color: '#059669' }}>
          <CheckCircle size={10} /> Validated
        </div>
      )}
      {validation?.hasIssues && result?.validationNotice && (
        <div className="flex items-center gap-1 text-[11px]" style={{ color: '#d97706' }}>
          <AlertTriangle size={10} /> {result.validationNotice}
        </div>
      )}
      {metrics && <span className="text-[11px]" style={{ color: mutedColor }}>{metrics.papers} · {metrics.total}</span>}

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
          <Printer size={11} /> Export
        </button>
      </div>
    </div>
  );
}
