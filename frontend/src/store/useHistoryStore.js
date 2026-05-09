import { create } from 'zustand';

const key = (userId) => `curalink_convos_${userId}`;

function load(userId) {
  if (!userId) return [];
  try {
    return JSON.parse(localStorage.getItem(key(userId)) || '[]');
  } catch {
    return [];
  }
}

function save(userId, convos) {
  if (!userId) return;
  try {
    localStorage.setItem(key(userId), JSON.stringify(convos));
  } catch {}
}

const useHistoryStore = create((set, get) => ({
  conversations: [],

  loadHistory: (userId) => {
    set({ conversations: load(userId) });
  },

  upsertConversation: (userId, convo) => {
    if (!userId) return;
    const list = get().conversations;
    const idx = list.findIndex((c) => c.id === convo.id);
    let updated;
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = convo;
    } else {
      updated = [convo, ...list];
    }
    updated = updated.slice(0, 100);
    set({ conversations: updated });
    save(userId, updated);
  },

  deleteConversation: (userId, id) => {
    const updated = get().conversations.filter((c) => c.id !== id);
    set({ conversations: updated });
    save(userId, updated);
  },

  clearAll: (userId) => {
    set({ conversations: [] });
    try { localStorage.removeItem(key(userId)); } catch {}
  },
}));

export default useHistoryStore;
