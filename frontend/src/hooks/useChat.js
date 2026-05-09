import { useCallback } from 'react';
import useChatStore from '../store/useChatStore.js';
import useAuthStore from '../store/useAuthStore.js';
import useHistoryStore from '../store/useHistoryStore.js';

export function useChat() {
  const {
    sessionId,
    patientContext,
    currentConversationId,
    addMessage,
    updateLastMessage,
    setLoading,
    appendStreamingText,
    clearStreamingText,
    setError,
    clearError,
    setSessionId,
    setCacheHit,
    setPipelineStage,
    setCurrentConversationId,
  } = useChatStore();

  const sendMessage = useCallback(async ({ query, disease, patientName, location }) => {
    const effectiveDisease = disease || patientContext.disease;
    const effectivePatient = patientName || patientContext.patientName;
    const effectiveLocation = location || patientContext.location;

    if (!effectiveDisease || !query) return;

    clearError();
    setLoading(true);
    clearStreamingText();
    setPipelineStage('expanding');

    const stageTimers = [
      setTimeout(() => setPipelineStage('fetching'), 1200),
      setTimeout(() => setPipelineStage('ranking'),  6500),
    ];

    addMessage({ role: 'user', content: query });
    addMessage({ role: 'assistant', content: '', isStreaming: true });

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 5 * 60 * 1000);

    try {
      const token = useAuthStore.getState().token;
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          disease: effectiveDisease,
          query,
          patientName: effectivePatient,
          location: effectiveLocation,
          sessionId,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';
      let streamedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr);

              switch (currentEvent) {
                case 'session':
                  setSessionId(data.sessionId);
                  break;

                case 'cache':
                  setCacheHit(data.hit);
                  setPipelineStage(data.hit ? 'ranking' : 'fetching');
                  break;

                case 'token':
                  if (!streamedContent) setPipelineStage('reasoning');
                  streamedContent += data.token || '';
                  appendStreamingText(data.token || '');
                  updateLastMessage({ content: streamedContent, isStreaming: true });
                  break;

                case 'result': {
                  setPipelineStage('done');
                  updateLastMessage({
                    content: data.recommendation || data.conditionOverview || streamedContent,
                    isStreaming: false,
                    result: data,
                  });
                  clearStreamingText();

                  // Save conversation history only for logged-in users
                  const user = useAuthStore.getState().user;
                  if (user) {
                    const store = useChatStore.getState();
                    const convoId = store.currentConversationId || `convo_${Date.now()}`;
                    if (!store.currentConversationId) setCurrentConversationId(convoId);

                    const title = query.length > 50 ? query.slice(0, 50) + '…' : query;
                    const convo = {
                      id: convoId,
                      title,
                      disease: effectiveDisease,
                      patientName: effectivePatient,
                      location: effectiveLocation,
                      messages: useChatStore.getState().messages,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };
                    useHistoryStore.getState().upsertConversation(user.id, convo);
                  }
                  break;
                }

                case 'error':
                  setError(data.message || 'An error occurred');
                  updateLastMessage({ content: data.message || 'Error', isStreaming: false, isError: true });
                  break;

                case 'done':
                  setLoading(false);
                  break;
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      const message = err.name === 'AbortError'
        ? 'Request timed out after 5 minutes. Please try again.'
        : err.message;
      setError(message);
      updateLastMessage({ content: message, isStreaming: false, isError: true });
    } finally {
      clearTimeout(timeoutId);
      stageTimers.forEach(clearTimeout);
      setLoading(false);
      clearStreamingText();
      setPipelineStage(null);
    }
  }, [sessionId, patientContext, currentConversationId]);

  return { sendMessage };
}
