import { useCallback } from 'react';
import useChatStore from '../store/useChatStore.js';

export function useChat() {
  const {
    sessionId,
    patientContext,
    addMessage,
    updateLastMessage,
    setLoading,
    setStreamingText,
    appendStreamingText,
    clearStreamingText,
    setError,
    clearError,
    setSessionId,
    setCacheHit,
    setPipelineStage,
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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disease: effectiveDisease,
          query,
          patientName: effectivePatient,
          location: effectiveLocation,
          sessionId,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

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

                case 'result':
                  setPipelineStage('done');
                  updateLastMessage({
                    content: data.recommendation || data.conditionOverview || streamedContent,
                    isStreaming: false,
                    result: data,
                  });
                  clearStreamingText();
                  try {
                    const prev = JSON.parse(localStorage.getItem('curalink_history') || '[]');
                    prev.unshift({
                      id: Date.now(),
                      disease: effectiveDisease,
                      query,
                      timestamp: new Date().toISOString(),
                      snippet: (data.recommendation || data.conditionOverview || '').slice(0, 120),
                    });
                    localStorage.setItem('curalink_history', JSON.stringify(prev.slice(0, 50)));
                  } catch {}
                  break;

                case 'error':
                  setError(data.message || 'An error occurred');
                  updateLastMessage({ content: data.message || 'Error', isStreaming: false, isError: true });
                  break;

                case 'done':
                  setLoading(false);
                  break;
              }
            } catch {

            }
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
  }, [sessionId, patientContext]);

  return { sendMessage };
}
