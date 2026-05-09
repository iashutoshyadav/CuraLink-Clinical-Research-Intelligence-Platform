import React, { useState } from 'react';
import { X, Dna, Loader2, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../store/useAuthStore.js';
import useHistoryStore from '../../store/useHistoryStore.js';

export default function AuthModal({ onClose }) {
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { login, signup } = useAuthStore();
  const { loadHistory } = useHistoryStore();

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(form.email, form.password);
      } else {
        if (!form.name.trim()) throw new Error('Name is required');
        await signup(form.name.trim(), form.email, form.password);
      }
      const user = useAuthStore.getState().user;
      if (user) loadHistory(user.id);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: '#fff', border: '1px solid #e5e7eb' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center shadow">
                <Dna size={16} className="text-white" />
              </div>
              <span className="font-black text-gray-900 tracking-tight">Curalink</span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100"
            >
              <X size={14} className="text-gray-500" />
            </button>
          </div>

          {/* Tab switcher */}
          <div className="px-6 pb-5">
            <div className="flex rounded-xl p-1 mb-6" style={{ background: '#f4f4f4' }}>
              {['login', 'signup'].map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(''); }}
                  className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all"
                  style={tab === t
                    ? { background: '#fff', color: '#111', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
                    : { color: '#6b7280' }
                  }
                >
                  {t === 'login' ? 'Sign in' : 'Sign up'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {tab === 'signup' && (
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Name</label>
                  <input
                    type="text"
                    required
                    autoFocus={tab === 'signup'}
                    placeholder="Your name"
                    value={form.name}
                    onChange={set('name')}
                    className="w-full px-4 py-2.5 rounded-xl text-[14px] outline-none transition-all"
                    style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#111' }}
                    onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                    onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  required
                  autoFocus={tab === 'login'}
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={set('email')}
                  className="w-full px-4 py-2.5 rounded-xl text-[14px] outline-none transition-all"
                  style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#111' }}
                  onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                  onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={form.password}
                    onChange={set('password')}
                    className="w-full px-4 py-2.5 pr-11 rounded-xl text-[14px] outline-none transition-all"
                    style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#111' }}
                    onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                    onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-[12px] font-medium text-red-500 px-1">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all disabled:opacity-60"
                style={{ background: '#111' }}
              >
                {loading
                  ? <Loader2 size={16} className="animate-spin mx-auto" />
                  : tab === 'login' ? 'Sign in' : 'Create account'
                }
              </button>
            </form>

            <p className="text-center text-[11px] text-gray-400 mt-4">
              {tab === 'login'
                ? <>No account?{' '}<button className="text-gray-600 font-semibold underline" onClick={() => setTab('signup')}>Sign up</button></>
                : <>Already have one?{' '}<button className="text-gray-600 font-semibold underline" onClick={() => setTab('login')}>Sign in</button></>
              }
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
