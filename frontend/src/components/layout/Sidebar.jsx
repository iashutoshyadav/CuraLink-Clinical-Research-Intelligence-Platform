import React, { useState } from 'react';
import {
  Plus, Trash2, MessageSquare, LogOut, User,
  ChevronLeft, ChevronRight, Clock, Sun, Moon, Dna,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../store/useAuthStore.js';
import useHistoryStore from '../../store/useHistoryStore.js';
import useChatStore from '../../store/useChatStore.js';
import useDarkMode from '../../store/useDarkMode.js';
import AuthModal from '../auth/AuthModal.jsx';

function groupByDate(conversations) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today - 86400000);
  const week = new Date(today - 7 * 86400000);
  const groups = { Today: [], Yesterday: [], 'Last 7 days': [], Older: [] };
  for (const c of conversations) {
    const d = new Date(c.updatedAt || c.createdAt);
    if (d >= today) groups['Today'].push(c);
    else if (d >= yesterday) groups['Yesterday'].push(c);
    else if (d >= week) groups['Last 7 days'].push(c);
    else groups['Older'].push(c);
  }
  return groups;
}

export default function Sidebar({ collapsed, onToggle }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { conversations, deleteConversation } = useHistoryStore();
  const currentConvoId = useChatStore((s) => s.currentConversationId);
  const { dark, toggle: toggleDark } = useDarkMode();
  const [showAuth, setShowAuth] = useState(false);

  const handleNewChat = () => useChatStore.getState().reset();

  const handleLoadConvo = (convo) => useChatStore.getState().loadConversation(convo);

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (!user) return;
    deleteConversation(user.id, id);
    if (currentConvoId === id) useChatStore.getState().reset();
  };

  const handleLogout = () => {
    logout();
    useHistoryStore.setState({ conversations: [] });
    useChatStore.getState().reset();
  };

  const groups = groupByDate(conversations);

  const bg       = dark ? '#171717' : '#f9f9f9';
  const border   = dark ? '#2a2a2a' : '#e5e7eb';
  const textMain = dark ? '#e5e7eb' : '#111';
  const textSub  = dark ? '#9ca3af' : '#6b7280';
  const hoverBg  = dark ? '#262626' : '#efefef';
  const activeBg = dark ? '#2d2d2d' : '#e5e7eb';

  return (
    <>
      <motion.aside
        animate={{ width: collapsed ? 56 : 260 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="flex flex-col h-full flex-shrink-0 overflow-hidden"
        style={{ background: bg, borderRight: `1px solid ${border}` }}
      >
        {/* Header */}
        <div className="flex items-center px-3 pt-4 pb-3 gap-2 flex-shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
                <Dna size={14} className="text-white" />
              </div>
              <span className="font-black text-[15px] tracking-tight truncate" style={{ color: textMain }}>Curalink</span>
            </div>
          )}
          <button
            onClick={onToggle}
            className="w-8 h-8 rounded-lg flex items-center justify-center ml-auto transition-opacity hover:opacity-70"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed
              ? <ChevronRight size={15} style={{ color: textSub }} />
              : <ChevronLeft size={15} style={{ color: textSub }} />}
          </button>
        </div>

        {/* New chat */}
        <div className="px-2 pb-2 flex-shrink-0">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors"
            onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            title="New chat"
          >
            <Plus size={16} style={{ color: textSub, flexShrink: 0 }} />
            {!collapsed && <span className="text-[13px] font-semibold truncate" style={{ color: textMain }}>New chat</span>}
          </button>
        </div>

        <div className="w-full h-px mb-2 flex-shrink-0" style={{ background: border }} />

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2">
          {!user ? (
            !collapsed && (
              <div className="flex flex-col items-center gap-2 py-8 px-2 text-center">
                <Clock size={20} style={{ color: dark ? '#4b5563' : '#d1d5db' }} />
                <p className="text-[11px] leading-relaxed" style={{ color: textSub }}>
                  Sign in to save and view your conversation history
                </p>
              </div>
            )
          ) : conversations.length === 0 ? (
            !collapsed && (
              <div className="flex flex-col items-center gap-2 py-8 px-2 text-center">
                <MessageSquare size={20} style={{ color: dark ? '#4b5563' : '#d1d5db' }} />
                <p className="text-[11px]" style={{ color: textSub }}>No conversations yet</p>
              </div>
            )
          ) : (
            Object.entries(groups).map(([label, items]) =>
              items.length === 0 ? null : (
                <div key={label} className="mb-3">
                  {!collapsed && (
                    <p className="text-[10px] font-bold uppercase tracking-wider px-3 mb-1" style={{ color: textSub }}>{label}</p>
                  )}
                  {items.map((c) => (
                    <ConvoItem
                      key={c.id}
                      convo={c}
                      active={c.id === currentConvoId}
                      collapsed={collapsed}
                      onLoad={() => handleLoadConvo(c)}
                      onDelete={(e) => handleDelete(e, c.id)}
                      dark={dark}
                      textMain={textMain}
                      activeBg={activeBg}
                      hoverBg={hoverBg}
                    />
                  ))}
                </div>
              )
            )
          )}
        </div>

        {/* Bottom bar */}
        <div className="flex-shrink-0 px-2 pb-4 pt-2" style={{ borderTop: `1px solid ${border}` }}>
          {/* Dark mode toggle */}
          <button
            onClick={toggleDark}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors mb-1"
            onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            title={dark ? 'Light mode' : 'Dark mode'}
          >
            {dark
              ? <Sun size={14} style={{ color: textSub, flexShrink: 0 }} />
              : <Moon size={14} style={{ color: textSub, flexShrink: 0 }} />}
            {!collapsed && (
              <span className="text-[12px] font-medium" style={{ color: textSub }}>
                {dark ? 'Light mode' : 'Dark mode'}
              </span>
            )}
          </button>

          {/* User / login */}
          {user ? (
            <div
              className="flex items-center gap-2 px-2 py-2 rounded-xl group cursor-default"
              onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-white"
                style={{ background: '#374151' }}>
                {user.name?.[0]?.toUpperCase() || 'U'}
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold truncate" style={{ color: textMain }}>{user.name}</p>
                    <p className="text-[10px] truncate" style={{ color: textSub }}>{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg flex items-center justify-center hover:text-red-400"
                    title="Sign out"
                    style={{ color: textSub }}
                  >
                    <LogOut size={13} />
                  </button>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors"
              onMouseEnter={(e) => (e.currentTarget.style.background = hoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              title="Sign in"
            >
              <User size={15} style={{ color: textSub, flexShrink: 0 }} />
              {!collapsed && <span className="text-[13px] font-semibold" style={{ color: textSub }}>Sign in</span>}
            </button>
          )}
        </div>
      </motion.aside>

      <AnimatePresence>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </AnimatePresence>
    </>
  );
}

function ConvoItem({ convo, active, collapsed, onLoad, onDelete, dark, textMain, activeBg, hoverBg }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onLoad}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors"
      style={{ background: active ? activeBg : hovered ? hoverBg : 'transparent' }}
      title={collapsed ? convo.title : undefined}
    >
      <MessageSquare size={13} style={{ color: dark ? '#6b7280' : '#9ca3af', flexShrink: 0 }} />
      {!collapsed && (
        <>
          <span className="flex-1 text-[13px] font-medium truncate" style={{ color: textMain }}>{convo.title}</span>
          {hovered && (
            <button onClick={onDelete} className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors hover:text-red-400" style={{ color: dark ? '#6b7280' : '#9ca3af' }}>
              <Trash2 size={11} />
            </button>
          )}
        </>
      )}
    </button>
  );
}
