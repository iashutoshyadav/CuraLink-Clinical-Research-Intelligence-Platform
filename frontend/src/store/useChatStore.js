import { create } from 'zustand';

const useChatStore = create((set, get) => ({

  sessionId: null,
  patientContext: {
    patientName: '',
    disease: '',
    location: '',
  },

  messages: [],

  isLoading: false,
  streamingText: '',
  error: null,
  cacheHit: false,

  pipelineStage: null,

  setSessionId: (sessionId) => set({ sessionId }),

  setPatientContext: (ctx) => set((state) => ({
    patientContext: { ...state.patientContext, ...ctx },
  })),

  addMessage: (message) => set((state) => ({
    messages: [
      ...state.messages,
      { id: `msg_${Date.now()}`, timestamp: new Date().toISOString(), ...message },
    ],
  })),

  updateLastMessage: (updates) => set((state) => {
    const messages = [...state.messages];
    if (messages.length === 0) return {};
    messages[messages.length - 1] = { ...messages[messages.length - 1], ...updates };
    return { messages };
  }),

  setPipelineStage: (pipelineStage) => set({ pipelineStage }),
  setLoading: (isLoading) => set({ isLoading }),
  setStreamingText: (text) => set({ streamingText: text }),
  appendStreamingText: (token) => set((state) => ({ streamingText: state.streamingText + token })),
  clearStreamingText: () => set({ streamingText: '' }),
  setError: (error) => set({ error }),
  setCacheHit: (cacheHit) => set({ cacheHit }),

  clearError: () => set({ error: null }),

  reset: () => set({
    sessionId: null,
    messages: [],
    isLoading: false,
    streamingText: '',
    error: null,
    cacheHit: false,
    pipelineStage: null,
  }),
}));

export default useChatStore;
