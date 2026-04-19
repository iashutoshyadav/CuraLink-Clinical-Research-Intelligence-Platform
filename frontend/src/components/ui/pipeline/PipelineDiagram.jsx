import React from 'react';
import {
  Sparkles, Database, Brain, CheckCircle2, Search,
  Layers, GitMerge, SlidersHorizontal, BookOpen, Activity,
  User, Zap, ArrowDown,
} from 'lucide-react';
import { STAGES, SOURCES, RANKERS } from './pipelineData.js';

/* ── Icon map ────────────────────────────────────────────────────────────── */
const ICON = {
  sparkles: Sparkles, db: Database, brain: Brain, check: CheckCircle2,
  search: Search, layers: Layers, merge: GitMerge, sliders: SlidersHorizontal,
  book: BookOpen, activity: Activity,
};

/* ── Static arrow connector (zero animation) ─────────────────────────────── */
function Arrow({ color = '#cbd5e1' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: 26 }}>
      <div style={{ width: 2, flex: 1, background: `linear-gradient(to bottom, ${color}, ${color}90)` }} />
      <ArrowDown size={12} style={{ color, marginTop: -2, flexShrink: 0 }} />
    </div>
  );
}

/* ── Parallel group container ────────────────────────────────────────────── */
function ParallelBox({ label, color, children }) {
  return (
    <div style={{
      border: `1.5px dashed ${color}40`,
      borderRadius: 14,
      padding: '14px 10px 10px',
      background: `${color}05`,
      position: 'relative',
    }}>
      <span style={{
        position: 'absolute', top: -9, left: 14,
        background: '#f8fafc', padding: '0 8px',
        fontSize: 9, fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b',
      }}>
        {label}
      </span>
      {children}
    </div>
  );
}

/* ── Stage card ──────────────────────────────────────────────────────────── */
function StageCard({ data, delay = '0s', flex }) {
  const { badge, title, sub, color, gradient, points, iconKey } = data;
  const Icon = ICON[iconKey] || Sparkles;
  return (
    <div
      className="pm-enter pm-card"
      style={{
        flex: flex || undefined,
        animationDelay: delay,
        background: '#fff',
        border: `1px solid ${color}18`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 14,
        boxShadow: `0 1px 6px rgba(0,0,0,0.04), 0 0 0 0 ${color}00`,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '12px 14px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: gradient, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 2px 8px ${color}28`,
          }}>
            <Icon size={15} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 9, fontWeight: 900, textTransform: 'uppercase',
                letterSpacing: '0.1em', padding: '2px 7px', borderRadius: 20,
                background: `${color}12`, color,
              }}>{badge}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{title}</span>
            </div>
            {sub && (
              <p style={{ margin: '2px 0 0', fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{sub}</p>
            )}
          </div>
        </div>
        {/* Points */}
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {points.map((pt, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 11.5, color: '#475569' }}>
              <span style={{
                display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
                background: color, marginTop: 5, flexShrink: 0,
              }} />
              {pt}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ── Source card ─────────────────────────────────────────────────────────── */
function SourceCard({ data }) {
  const { name, detail, color, gradient, iconKey } = data;
  const Icon = ICON[iconKey] || Database;
  return (
    <div className="pm-card" style={{
      flex: 1, background: '#fff',
      border: `1px solid ${color}18`, borderTop: `2.5px solid ${color}`,
      borderRadius: 12, padding: '10px 8px', textAlign: 'center',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, background: gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 6px',
      }}>
        <Icon size={12} color="#fff" />
      </div>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#0f172a' }}>{name}</p>
      <p style={{ margin: '2px 0 0', fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>{detail}</p>
    </div>
  );
}

/* ── Pill badge ──────────────────────────────────────────────────────────── */
function PillBadge({ children, color, bg, delay }) {
  return (
    <div className="pm-enter" style={{ animationDelay: delay, display: 'flex', justifyContent: 'center' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 14px', borderRadius: 100,
        background: bg, border: `1px solid ${color}30`,
        fontSize: 11, fontWeight: 700, color,
      }}>
        {children}
      </div>
    </div>
  );
}

/* ── Main diagram export ─────────────────────────────────────────────────── */
export default function PipelineDiagram() {
  return (
    <div>
      {/* Input node */}
      <div className="pm-enter" style={{ animationDelay: '0s', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 18px', borderRadius: 100,
          background: '#f1f5f9', border: '1.5px solid #e2e8f0',
          fontSize: 12, fontWeight: 700, color: '#334155',
        }}>
          <User size={13} color="#64748b" />
          User Query
          <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>
            disease · question · context
          </span>
        </div>
      </div>

      <Arrow color="#7c3aed90" />

      {/* Stage 1 — Query Expansion */}
      <StageCard data={STAGES[0]} delay="0.07s" />

      <Arrow color="#2563eb70" />

      {/* Parallel retrieval */}
      <div className="pm-enter" style={{ animationDelay: '0.14s' }}>
        <ParallelBox label="Parallel Retrieval" color="#2563eb">
          <div style={{ display: 'flex', gap: 8 }}>
            {SOURCES.map((src) => <SourceCard key={src.name} data={src} />)}
          </div>
        </ParallelBox>
      </div>

      <Arrow color="#2563eb70" />

      {/* Dedup badge */}
      <PillBadge color="#1d4ed8" bg="#eff6ff" delay="0.26s">
        <span style={{ fontWeight: 900, fontSize: 13, color: '#1d4ed8' }}>180</span>
        unique papers after deduplication
      </PillBadge>

      <Arrow color="#b4530990" />

      {/* Parallel scoring */}
      <div className="pm-enter" style={{ animationDelay: '0.33s' }}>
        <ParallelBox label="Parallel Scoring" color="#b45309">
          <div style={{ display: 'flex', gap: 8 }}>
            {RANKERS.map((r) => (
              <StageCard key={r.badge} data={r} flex="1" />
            ))}
          </div>
        </ParallelBox>
      </div>

      <Arrow color="#db277790" />

      {/* RRF */}
      <StageCard data={STAGES[1]} delay="0.44s" />

      <Arrow color="#4f46e590" />

      {/* Cross-encoder */}
      <StageCard data={STAGES[2]} delay="0.50s" />

      <Arrow color="#9333ea90" />

      {/* LLM */}
      <StageCard data={STAGES[3]} delay="0.56s" />

      <Arrow color="#16a34a90" />

      {/* Output */}
      <StageCard data={STAGES[4]} delay="0.62s" />

      {/* Footer strip */}
      <div className="pm-enter" style={{
        animationDelay: '0.68s',
        marginTop: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '9px 16px', borderRadius: 12,
        background: 'linear-gradient(135deg,#f5f3ff,#eff6ff)',
        border: '1px solid #ddd6fe',
      }}>
        <Zap size={11} color="#7c3aed" />
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#6d28d9',
          textTransform: 'uppercase', letterSpacing: '0.07em',
        }}>
          5-Stage Hybrid Pipeline · 180+ Papers · Llama 3.3 70B · ONNX · &lt;15 s
        </span>
      </div>
    </div>
  );
}
