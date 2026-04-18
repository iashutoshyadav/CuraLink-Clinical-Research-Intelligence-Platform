import axios from 'axios';
import logger from '../../utils/logger.js';

const SUMMARISE_AFTER = 4;

const MAX_SUMMARY_CHARS = 800;

const OLLAMA_URL            = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const OLLAMA_EXPANSION_MODEL = process.env.OLLAMA_EXPANSION_MODEL ?? 'llama3.1:8b';

export async function summariseHistory(messages, disease) {
  if (!messages || messages.length < SUMMARISE_AFTER) {

    return null;
  }

  const turns = messages
    .slice(-12)
    .map((m) => `${m.role.toUpperCase()}: ${(m.content || '').slice(0, 300)}`)
    .join('\n');

  try {
    const summaryPrompt = `You are a medical conversation summariser. Compress the following conversation into a concise clinical summary (max 5 bullet points). Focus on: clinical questions asked, conditions mentioned, key findings discussed, unresolved questions.

Conversation about ${disease}:
${turns}

Output ONLY the summary as bullet points starting with •. No introduction, no explanation.`;

    const response = await axios.post(
      `${OLLAMA_URL}/api/generate`,
      {
        model: OLLAMA_EXPANSION_MODEL,
        prompt: summaryPrompt,
        stream: false,
        options: { temperature: 0.1, num_predict: 300 },
      },
      { timeout: 8000 },
    );

    const summary = (response.data?.response ?? '').trim().slice(0, MAX_SUMMARY_CHARS);
    if (summary.length > 20) {
      logger.debug(`[Memory] LLM summary generated (${summary.length} chars)`);
      return summary;
    }
  } catch (err) {
    logger.debug(`[Memory] LLM summarisation unavailable: ${err.message} — using extractive fallback`);
  }

  return extractiveSummary(messages, disease);
}

function extractiveSummary(messages, disease) {
  const lines = [`Prior conversation about ${disease}:`];

  messages.forEach((msg) => {
    const content = (msg.content || '').trim();
    if (!content) return;

    const firstSentence = content.split(/[.!?]/)[0]?.trim();
    if (firstSentence && firstSentence.length > 20) {
      lines.push(`• [${msg.role}] ${firstSentence.slice(0, 150)}`);
    }
  });

  return lines.join('\n').slice(0, MAX_SUMMARY_CHARS);
}

export async function getConversationContext(messages, disease) {
  if (!messages || messages.length === 0) return [];

  if (messages.length >= SUMMARISE_AFTER) {
    const summary = await summariseHistory(messages, disease);
    if (summary) return summary;
  }

  return messages.slice(-6);
}
