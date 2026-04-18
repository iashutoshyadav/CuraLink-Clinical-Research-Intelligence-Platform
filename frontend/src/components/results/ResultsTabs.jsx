import React, { useState } from 'react';
import { BookOpen, FlaskConical, Brain, Link, Lightbulb, AlertCircle, Users, TrendingUp, Microscope } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PublicationCard from './PublicationCard.jsx';
import TrialCard from './TrialCard.jsx';
import SourcePanel from './SourcePanel.jsx';
import FocusedAnswerCard from './FocusedAnswerCard.jsx';
import { TAB_LABELS } from '../../utils/constants.js';
import useChatStore from '../../store/useChatStore.js';

const TABS = [
  { id: TAB_LABELS.SUMMARY,      label: 'AI Summary',      Icon: Brain,        color: '#3b82f6' },
  { id: TAB_LABELS.PUBLICATIONS, label: 'Publications',    Icon: BookOpen,     color: '#059669' },
  { id: TAB_LABELS.TRIALS,       label: 'Clinical Trials', Icon: FlaskConical, color: '#7c3aed' },
  { id: TAB_LABELS.SOURCES,      label: 'Sources',         Icon: Link,         color: '#d97706' },
];

export default function ResultsTabs({ result }) {
  const [activeTab, setActiveTab] = useState(TAB_LABELS.SUMMARY);
  const { patientContext } = useChatStore();
  if (!result) return null;

  const {
    conditionOverview, keyFindings, treatmentAnalysis, researchInsights,
    outcomesSummary, limitations, clinicalTrialsSummary, clinicalTrialsInsights,
    contradictions, recommendation, confidenceLabel, topResearchers,
    publications, trials, sources, disclaimer, topicShift, validationNotice,
    showOnlyFocused, focused_answer, evidenceGrade,
  } = result;

  if (showOnlyFocused && focused_answer) {
    return <FocusedAnswerCard result={result} />;
  }

  return (
    <div className="mt-3">
      <div className="flex gap-1 p-1 rounded-xl mb-4 overflow-x-auto"
        style={{ background: '#f4f4f4', border: '1px solid #e5e7eb' }}>
        {TABS.map(({ id, label, Icon, color }) => {
          const isActive = activeTab === id;
          const count =
            id === TAB_LABELS.PUBLICATIONS ? publications?.length :
            id === TAB_LABELS.TRIALS       ? trials?.length :
            id === TAB_LABELS.SOURCES      ? sources?.length : null;
          return (
            <button key={id} onClick={() => setActiveTab(id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-1 justify-center"
              style={isActive
                ? { background: '#ffffff', color, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                : { background: 'transparent', color: '#6b7280' }}>
              <Icon size={12} style={isActive ? { color } : { color: '#9ca3af' }} />
              {label}
              {count != null && count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                  style={isActive
                    ? { background: color + '15', color }
                    : { background: '#e5e7eb', color: '#9ca3af' }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab}
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
          {topicShift && (
            <div className="mb-3 rounded-xl px-4 py-3 flex gap-2 items-center"
              style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <span style={{ fontSize: 13 }}>🔄</span>
              <p className="text-xs" style={{ color: '#1d4ed8' }}>
                <strong>New topic detected</strong> — fresh retrieval performed for this follow-up.
              </p>
            </div>
          )}
          {activeTab === TAB_LABELS.SUMMARY && (
            <SummaryPanel {...{
              conditionOverview, keyFindings, treatmentAnalysis, researchInsights,
              outcomesSummary, limitations, contradictions,
              clinicalTrialsSummary: clinicalTrialsSummary || clinicalTrialsInsights,
              recommendation, confidenceLabel, topResearchers, disclaimer,
              validationNotice, trials, evidenceGrade,
            }} />
          )}
          {activeTab === TAB_LABELS.PUBLICATIONS && (
            <div className="space-y-3">
              {publications?.length > 0
                ? publications.map((pub, i) => <PublicationCard key={pub.id || i} pub={pub} index={i} />)
                : <EmptyState message="No publications found for this query." icon={BookOpen} />}
            </div>
          )}
          {activeTab === TAB_LABELS.TRIALS && (
            <div className="space-y-3">
              {trials?.length > 0
                ? trials.map((trial, i) => <TrialCard key={trial.id || i} trial={trial} index={i} disease={patientContext.disease} />)
                : <EmptyState message="No clinical trials found for this condition." icon={FlaskConical} />}
            </div>
          )}
          {activeTab === TAB_LABELS.SOURCES && <SourcePanel sources={sources} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function SectionCard({ title, icon: Icon, iconColor, bg, border, children }) {
  return (
    <div className="rounded-xl p-4" style={{ background: bg || '#fafafa', border: `1px solid ${border || '#e5e7eb'}` }}>
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon size={13} style={{ color: iconColor || '#3b82f6', flexShrink: 0 }} />}
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: iconColor || '#3b82f6' }}>
          {title}
        </p>
      </div>
      {children}
    </div>
  );
}

function BulletList({ items, color }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 items-start">
          <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full" style={{ background: color || '#3b82f6' }} />
          <p className="text-sm leading-relaxed" style={{ color: '#1a1a1a' }}>{item}</p>
        </li>
      ))}
    </ul>
  );
}

function NumberedList({ items }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex gap-3 items-start">
          <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
            style={{ background: 'linear-gradient(135deg,#3b82f6,#06b6d4)' }}>
            {i + 1}
          </span>
          <p className="text-sm leading-relaxed flex-1" style={{ color: '#1a1a1a' }}>{item}</p>
        </div>
      ))}
    </div>
  );
}

function ConfidenceBadge({ label }) {
  if (!label) return null;
  const isHigh = /^high/i.test(label);
  const isLow  = /^low/i.test(label);
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{
        background: isHigh ? '#dcfce7' : isLow ? '#fee2e2' : '#fef9c3',
        color:      isHigh ? '#16a34a' : isLow ? '#dc2626' : '#ca8a04',
      }}>
      Confidence: {label}
    </span>
  );
}

function EvidenceGradeBadge({ grade }) {
  if (!grade?.grade) return null;
  const g = grade.grade.toUpperCase();
  const styles = {
    A: { bg: '#dcfce7', color: '#166534', border: '#bbf7d0', label: 'Grade A — Strong' },
    B: { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe', label: 'Grade B — Moderate' },
    C: { bg: '#fef9c3', color: '#854d0e', border: '#fde68a', label: 'Grade C — Limited' },
    D: { bg: '#fee2e2', color: '#991b1b', border: '#fecaca', label: 'Grade D — Insufficient' },
  };
  const s = styles[g] || styles.C;
  const counts = [
    grade.meta_count  > 0 && `${grade.meta_count} meta-analysis`,
    grade.rct_count   > 0 && `${grade.rct_count} RCT`,
    grade.cohort_count > 0 && `${grade.cohort_count} cohort`,
  ].filter(Boolean).join(' · ');
  return (
    <div className="rounded-xl px-4 py-3" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: s.color, color: '#fff' }}>{g}</span>
        <span className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</span>
        {counts && <span className="text-[11px]" style={{ color: s.color, opacity: 0.75 }}>({counts})</span>}
      </div>
      {grade.rationale && (
        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: s.color, opacity: 0.85 }}>{grade.rationale}</p>
      )}
    </div>
  );
}

function SummaryPanel({
  conditionOverview, keyFindings, treatmentAnalysis, researchInsights,
  outcomesSummary, limitations, contradictions, clinicalTrialsSummary,
  recommendation, confidenceLabel, topResearchers, disclaimer, validationNotice, trials, evidenceGrade,
}) {

  const allInsights = [
    ...(keyFindings?.length > 0 ? keyFindings : []),
    ...(treatmentAnalysis?.length > 0 ? treatmentAnalysis : []),
    ...(outcomesSummary?.length > 0 ? outcomesSummary : []),

    ...(keyFindings?.length === 0 && treatmentAnalysis?.length === 0
      ? (researchInsights || []).map((ins) => ins.insight || ins).filter(Boolean)
      : []),
  ];

  const topTrials = trials?.slice(0, 6) ?? [];

  return (
    <div className="space-y-3">

      {}
      {evidenceGrade && <EvidenceGradeBadge grade={evidenceGrade} />}

      {}
      {conditionOverview && (
        <SectionCard title="Condition Overview" icon={Brain} iconColor="#3b82f6" bg="#fafafa" border="#e5e7eb">
          <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>{conditionOverview}</p>
        </SectionCard>
      )}

      {}
      {topResearchers?.length > 0 && (
        <SectionCard title="Key Researchers" icon={Users} iconColor="#7c3aed" bg="#faf5ff" border="#e9d5ff">
          <div className="space-y-2.5">
            {topResearchers.map((r, i) => (
              <div key={i} className="flex gap-2.5 items-start">
                <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>{r.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                    {r.paperCount} paper{r.paperCount !== 1 ? 's' : ''}
                    {r.totalCitations > 0 && ` · ${r.totalCitations.toLocaleString()} citations`}
                  </p>
                  {r.topPaper && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: '#9ca3af' }} title={r.topPaper}>
                      {r.topPaper}
                    </p>
                  )}
                  {r.note && <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#6b7280' }}>{r.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {}
      {allInsights.length > 0 && (
        <SectionCard title="Research Insights" icon={Microscope} iconColor="#0891b2" bg="#f0f9ff" border="#bae6fd">
          <div className="space-y-3">
            {allInsights.map((item, i) => (
              <div key={i} className="flex gap-2.5 items-start">
                <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
                  style={{ background: 'linear-gradient(135deg,#0891b2,#3b82f6)' }}>
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed flex-1" style={{ color: '#1a1a1a' }}>{item}</p>
              </div>
            ))}
          </div>
          {}
          {((contradictions && contradictions !== 'null' && typeof contradictions === 'string') || limitations?.length > 0) && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid #bae6fd' }}>
              {contradictions && contradictions !== 'null' && typeof contradictions === 'string' && (
                <p className="text-xs leading-relaxed mb-1.5" style={{ color: '#b45309' }}>
                  <strong>Conflict:</strong> {contradictions}
                </p>
              )}
              {limitations?.length > 0 && (
                <p className="text-xs leading-relaxed" style={{ color: '#b45309' }}>
                  <strong>Limitations:</strong> {limitations.join(' · ')}
                </p>
              )}
            </div>
          )}
        </SectionCard>
      )}

      {}
      {topTrials.length > 0 && (
        <SectionCard title="New Drug Trials" icon={FlaskConical} iconColor="#059669" bg="#f0fdf4" border="#bbf7d0">
          <div className="space-y-2">
            {topTrials.map((t, i) => (
              <div key={t.id || i} className="flex gap-2 items-start">
                <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5"
                  style={{ background: '#dcfce7', color: '#15803d', minWidth: '26px', textAlign: 'center' }}>
                  T{i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-snug" style={{ color: '#1a1a1a' }}>{t.title}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#6b7280' }}>
                    {[t.phase, t.status, t.location].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {clinicalTrialsSummary && (
            <p className="text-xs mt-3 pt-3 leading-relaxed" style={{ color: '#374151', borderTop: '1px solid #bbf7d0' }}>
              {clinicalTrialsSummary}
            </p>
          )}
        </SectionCard>
      )}

      {}
      {recommendation && (
        <div className="rounded-xl p-4" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Lightbulb size={13} style={{ color: '#2563eb' }} />
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#2563eb' }}>
                Recommendation
              </p>
            </div>
            <ConfidenceBadge label={confidenceLabel} />
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#1a1a1a' }}>{recommendation}</p>
        </div>
      )}

      {}
      {validationNotice && (
        <div className="rounded-xl px-4 py-3 flex gap-2.5"
          style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
          <AlertCircle size={13} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
          <p className="text-xs leading-relaxed" style={{ color: '#991b1b' }}>{validationNotice}</p>
        </div>
      )}

    </div>
  );
}

function EmptyState({ message, icon: Icon }) {
  return (
    <div className="rounded-xl p-12 text-center" style={{ background: '#fafafa', border: '1px solid #e5e7eb' }}>
      {Icon && <Icon size={22} style={{ color: '#d1d5db', margin: '0 auto 10px' }} />}
      <p className="text-sm" style={{ color: '#9ca3af' }}>{message}</p>
    </div>
  );
}
