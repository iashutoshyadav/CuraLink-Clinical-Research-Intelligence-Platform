import { API_BASE_URL } from '../utils/constants.js';

export async function postChat(payload, callbacks = {}) {
  const { onSession, onToken, onResult, onError, onDone, onCache } = callbacks;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    onError?.(`Network error: ${err.message}`);
    return;
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }));
    onError?.(err.error || 'Chat request failed');
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = '';

  try {
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
              case 'session': onSession?.(data); break;
              case 'cache':   onCache?.(data);   break;
              case 'token':   onToken?.(data.token || ''); break;
              case 'result':  onResult?.(data);  break;
              case 'error':   onError?.(data.message || 'Unknown error'); break;
              case 'done':    onDone?.(data);    break;
            }
          } catch {

          }
        }
      }
    }
  } catch (err) {
    onError?.(`Stream error: ${err.message}`);
  }
}
