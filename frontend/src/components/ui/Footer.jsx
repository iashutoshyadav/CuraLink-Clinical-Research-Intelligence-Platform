import React from 'react';
import { Dna, ShieldCheck, Zap, Brain } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 py-6">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-6">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-900 shadow-md">
                <Dna size={16} className="text-white" />
              </div>
              <span className="text-lg font-black tracking-tighter text-gray-900">Curalink</span>
            </div>
            <p className="text-sm text-gray-900 max-w-sm leading-relaxed font-bold">
              Advancing medical research through high-fidelity retrieval,
              hybrid AI ranking, and secure, private local intelligence.
            </p>
          </div>

          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-900 mb-2">Pipeline Layers</h4>
            <ul className="space-y-1.5 text-xs font-bold text-gray-900">
              <li><a href="#" className="hover:text-brand-600 transition-colors">Semantic Retrieval</a></li>
              <li><a href="#" className="hover:text-brand-600 transition-colors">Hallucination Shields</a></li>
              <li><a href="#" className="hover:text-brand-600 transition-colors">Source Verification</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-900 mb-2">Research Nodes</h4>
            <ul className="space-y-1.5 text-xs font-bold text-gray-900">
              <li><a href="#" className="hover:text-emerald-600 transition-colors">PubMed Central</a></li>
              <li><a href="#" className="hover:text-brand-600 transition-colors">OpenAlex Data</a></li>
              <li><a href="#" className="hover:text-violet-600 transition-colors">ClinicalTrials.gov</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">
            © 2026 Curalink Intelligence. Research purposes only.
          </p>
          <div className="flex items-center gap-4">
             <ShieldCheck size={14} className="text-gray-300" />
             <Zap size={14} className="text-gray-300" />
             <Brain size={14} className="text-gray-300" />
          </div>
        </div>
      </div>
    </footer>
  );
}
