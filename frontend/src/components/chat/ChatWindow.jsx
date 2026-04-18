import React, { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble.jsx';
import LoadingSpinner from '../ui/LoadingSpinner.jsx';
import useChatStore from '../../store/useChatStore.js';
import { motion } from 'framer-motion';
import { Dna, BookOpen, FlaskConical, Sparkles } from 'lucide-react';

export default function ChatWindow() {
  const messages  = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#ffffff' }}>
      {messages.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col pt-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isLoading && messages.every((m) => !m.isStreaming) && (
            <div className="w-full max-w-3xl mx-auto px-4 sm:px-6">
              <LoadingSpinner message="Running research pipeline…" />
            </div>
          )}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-12 text-center px-4"
    >
      {}
      <div className="relative mb-8">
        <div className="absolute -inset-4 bg-brand-500/20 rounded-full blur-2xl animate-pulse" />
        <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center bg-gray-900 shadow-2xl">
          <Dna size={30} className="text-white" />
        </div>
      </div>

      <div className="mb-10">
        <h2 className="text-3xl font-black mb-3 tracking-tight text-gray-900">
           How can I help you <span className="bg-gradient-to-r from-brand-600 to-cyan-500 bg-clip-text text-transparent">today?</span>
        </h2>
        <p className="text-sm max-w-sm mx-auto leading-relaxed font-medium text-gray-900">
          Initiate a high-fidelity research inquiry across global clinical databases
          and peer-reviewed literature.
        </p>
      </div>

      {}
      <div className="flex flex-wrap gap-3 justify-center max-w-md">
        {[
          { icon: Sparkles,     label: 'AI-Generated Summaries',   c: '#3b82f6', bg: '#eff6ff', b: '#bfdbfe' },
          { icon: BookOpen,     label: 'Semantic Publication Mapping', c: '#059669', bg: '#f0fdf4', b: '#bbf7d0' },
          { icon: FlaskConical, label: 'Live Clinical Trial Streams',  c: '#7c3aed', bg: '#faf5ff', b: '#ddd6fe' },
        ].map(({ icon: Icon, label, c, bg, b }) => (
          <div key={label}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-wider shadow-sm transition-transform hover:scale-105"
            style={{ background: bg, border: `1px solid ${b}`, color: c }}>
            <Icon size={12} />
            {label}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
