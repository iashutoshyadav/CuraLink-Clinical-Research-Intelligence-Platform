import { create } from 'zustand';

const STORAGE_KEY = 'curalink_dark';

function loadDark() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

function applyDark(dark) {
  document.documentElement.classList.toggle('dark', dark);
}

const initial = loadDark();
applyDark(initial);

const useDarkMode = create((set) => ({
  dark: initial,
  toggle: () =>
    set((state) => {
      const next = !state.dark;
      localStorage.setItem(STORAGE_KEY, String(next));
      applyDark(next);
      return { dark: next };
    }),
}));

export default useDarkMode;
