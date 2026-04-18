import { API_BASE_URL } from '../utils/constants.js';

export async function getSession(sessionId) {
  const res = await fetch(`${API_BASE_URL}/session/${sessionId}`);
  if (!res.ok) throw new Error('Session not found');
  return res.json();
}
