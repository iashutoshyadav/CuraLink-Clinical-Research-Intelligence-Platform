import { useEffect, useCallback } from 'react';
import { getSession } from '../api/session.js';
import useChatStore from '../store/useChatStore.js';

export function useSession(sessionId) {
  const { setSessionId, addMessage, setPatientContext } = useChatStore();

  const loadSession = useCallback(async (id) => {
    if (!id) return;
    try {
      const { session } = await getSession(id);
      if (session) {
        setSessionId(session.sessionId);
        setPatientContext({
          patientName: session.patientName,
          disease: session.disease,
          location: session.location,
        });
        session.messages?.forEach((msg) => {
          addMessage({
            role: msg.role,
            content: msg.content,
            result: msg.role === 'assistant' ? {
              sources: msg.sources?.publications || [],
              trials: msg.sources?.trials || [],
              confidence_score: msg.confidence_score,
            } : undefined,
          });
        });
      }
    } catch {

    }
  }, []);

  useEffect(() => {
    if (sessionId) loadSession(sessionId);
  }, [sessionId]);

  return { loadSession };
}
