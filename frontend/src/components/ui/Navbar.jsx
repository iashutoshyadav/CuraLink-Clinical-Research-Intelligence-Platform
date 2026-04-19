import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dna, ArrowLeft, Activity, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PipelineModal from './PipelineModal.jsx';

export default function Navbar() {
  const location = useLocation();
  const isChat = location.pathname === '/chat';
  const [showPipeline, setShowPipeline] = useState(false);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 px-5 pt-0 pb-4 pointer-events-none"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3 premium-card !rounded-2xl !bg-white/60 shadow-lg border-white/60 backdrop-blur-xl pointer-events-auto">
          { }
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gray-900 shadow-lg shadow-brand-500/20 group-hover:scale-110 transition-transform">
              <Dna size={16} className="text-white" />
            </div>
            <span className="text-lg font-black tracking-tighter text-gray-900">Curalink</span>
          </Link>

          { }
          {!isChat && (
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => setShowPipeline(true)}
                className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-900 hover:text-brand-600 transition-colors"
              >
                Pipeline
              </button>
              {['Clinical Trials', 'Research Sources'].map(item => (
                <a key={item} href="#" className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-900 hover:text-brand-600 transition-colors">
                  {item}
                </a>
              ))}
            </div>
          )}

          { }
          <div className="flex items-center gap-3">
            {isChat ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100/50">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Live Analysis</span>
              </div>
            ) : (
              <Link
                to="/chat"
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-brand-600 transition-all active:scale-95 shadow-md shadow-gray-200"
              >
                <Sparkles size={12} />
                Start Research
              </Link>
            )}

            {isChat && (
              <Link to="/" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-gray-900 hover:bg-gray-50 transition-colors">
                <ArrowLeft size={13} />
                Back
              </Link>
            )}
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {showPipeline && <PipelineModal onClose={() => setShowPipeline(false)} />}
      </AnimatePresence>
    </>
  );
}
