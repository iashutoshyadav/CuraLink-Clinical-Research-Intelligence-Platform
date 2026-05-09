import { create } from 'zustand';

const TOKEN_KEY = 'curalink_token';

function savedToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

function savedUser() {
  try {
    const t = savedToken();
    if (!t) return null;
    // Decode payload (no verification – server verifies on each request)
    const payload = JSON.parse(atob(t.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return null; // user object fetched via /api/auth/me on mount
  } catch {
    return null;
  }
}

async function apiFetch(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const useAuthStore = create((set) => ({
  user: null,
  token: savedToken(),

  // Called once on app mount to restore session
  restore: async () => {
    const token = savedToken();
    if (!token) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        localStorage.removeItem(TOKEN_KEY);
        set({ user: null, token: null });
        return;
      }
      const { user } = await res.json();
      set({ user, token });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      set({ user: null, token: null });
    }
  },

  signup: async (name, email, password) => {
    const { token, user } = await apiFetch('/api/auth/register', { name, email, password });
    localStorage.setItem(TOKEN_KEY, token);
    set({ user, token });
  },

  login: async (email, password) => {
    const { token, user } = await apiFetch('/api/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, token);
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null, token: null });
  },
}));

export default useAuthStore;
