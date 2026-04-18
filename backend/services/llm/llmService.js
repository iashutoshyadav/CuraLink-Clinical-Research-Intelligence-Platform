import axios from 'axios';
import logger from '../../utils/logger.js';
import { LLM_TIMEOUT_MS } from '../../config/constants.js';

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? '';
const GROQ_MODEL   = process.env.GROQ_MODEL   ?? 'llama-3.1-8b-instant';
const GROQ_TIMEOUT = 25_000;

const OLLAMA_URL            = process.env.OLLAMA_URL            ?? 'http://localhost:11434';
const OLLAMA_REASONING_MODEL = process.env.OLLAMA_REASONING_MODEL ?? 'mistral:7b';
const OLLAMA_FALLBACK_MODELS = (process.env.OLLAMA_FALLBACK_MODELS ?? 'llama3.2:3b,llama3.1:8b')
  .split(',').map((m) => m.trim()).filter(Boolean);

const HF_ENDPOINT_URL   = process.env.HF_ENDPOINT_URL   ?? '';
const HF_FALLBACK_MODEL = process.env.HF_FALLBACK_MODEL ?? 'mistralai/Mistral-7B-Instruct-v0.2';
const HF_TOKEN          = process.env.HF_TOKEN          ?? '';

if (GROQ_API_KEY) {
  logger.info(`[LLM] Primary: Groq (${GROQ_MODEL}) → Backup: Ollama (${OLLAMA_REASONING_MODEL}) → Template`);
} else {
  logger.warn('[LLM] GROQ_API_KEY not set — falling back to Ollama only. ' +
    'Get a free key at console.groq.com for real LLM synthesis.');
  logger.info(`[LLM] Cascade: ${OLLAMA_REASONING_MODEL} → ${OLLAMA_FALLBACK_MODELS.join(' → ')} → Template`);
}

export async function generateResponseStream(prompt, onToken) {

  if (GROQ_API_KEY) {
    try {
      logger.info(`[LLM] Stage 4 — Groq (${GROQ_MODEL}) | prompt length: ${prompt.length} chars (~${Math.ceil(prompt.length/4)} tokens)`);
      return await groqStream(prompt, onToken);
    } catch (err) {
      const status  = err.response?.status ?? 'no-response';
      const detail  = err.response?.data   ?? err.message;
      logger.error(`[LLM] Groq FAILED [HTTP ${status}]: ${JSON.stringify(detail).slice(0, 300)}`);
      logger.warn('[LLM] Falling back to Ollama');
    }
  }

  try {
    logger.info(`[LLM] Stage 4 — Ollama backup (${OLLAMA_REASONING_MODEL})`);
    return await ollamaReasoningStream(prompt, onToken, OLLAMA_REASONING_MODEL);
  } catch (err) {
    logger.warn(`[LLM] Ollama primary (${OLLAMA_REASONING_MODEL}) failed: ${err.message}`);
  }

  for (const model of OLLAMA_FALLBACK_MODELS) {
    try {
      logger.info(`[LLM] Trying Ollama fallback: ${model}`);
      return await ollamaReasoningStream(prompt, onToken, model);
    } catch (err) {
      logger.warn(`[LLM] Ollama fallback (${model}) failed: ${err.message}`);
    }
  }

  if (HF_ENDPOINT_URL && HF_TOKEN) {
    try {
      logger.info(`[LLM] Stage 4 — HF Dedicated Endpoint (${HF_FALLBACK_MODEL})`);
      return await hfDedicatedEndpointStream(prompt, onToken);
    } catch (err) {
      logger.warn(`[LLM] HF endpoint failed: ${err.message}`);
    }
  }

  throw new Error(
    '[LLM] All providers failed.\n' +
    '  → Add GROQ_API_KEY to backend/.env (free at console.groq.com)\n' +
    `  → Or ensure Ollama is running: ollama serve && ollama pull ${OLLAMA_REASONING_MODEL}`
  );
}

async function groqStream(prompt, onToken) {
  const estimatedTokens = Math.ceil(prompt.length / 4);
  logger.info(`[Groq] Sending request — ~${estimatedTokens} input tokens, max_tokens=2048`);

  const doRequest = () => axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model:           GROQ_MODEL,
      messages:        [{ role: 'user', content: prompt }],
      stream:          false,
      temperature:     0.2,
      max_tokens:      1500,
      top_p:           0.9,
      response_format: { type: 'json_object' },
    },
    {
      headers: {
        Authorization:  `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: GROQ_TIMEOUT,
    },
  );

  let response;
  try {
    response = await doRequest();
  } catch (err) {

    if (err.response?.status === 429) {
      const retryAfter = parseInt(err.response.headers?.['retry-after'] ?? '10', 10);
      const waitMs = Math.min(retryAfter * 1000, 20_000);
      logger.warn(`[Groq] 429 rate limit — retrying after ${waitMs}ms`);
      await new Promise((r) => setTimeout(r, waitMs));
      response = await doRequest();
    } else {
      throw err;
    }
  }

  const content = response.data?.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('Groq returned empty content');

  logger.info(`[Groq] Success — ${content.length} chars received`);
  onToken?.(content);
  return content;
}

async function ollamaReasoningStream(prompt, onToken, model = OLLAMA_REASONING_MODEL) {
  const response = await axios.post(
    `${OLLAMA_URL}/api/generate`,
    {
      model,
      prompt,
      stream: true,
      format: 'json',
      options: {
        temperature:    0.2,
        top_p:          0.9,
        num_predict:    512,
        num_ctx:        2048,
        repeat_penalty: 1.1,
      },
    },
    {
      responseType: 'stream',
      timeout:      LLM_TIMEOUT_MS,
    },
  );

  let full = '';
  return new Promise((resolve, reject) => {
    response.data.on('data', (chunk) => {
      try {
        const lines = chunk.toString('utf8').split('\n').filter(Boolean);
        for (const line of lines) {
          const parsed = JSON.parse(line);
          if (parsed.response) {
            full += parsed.response;
            onToken?.(parsed.response);
          }
          if (parsed.done) resolve(full);
        }
      } catch {

      }
    });
    response.data.on('end',   () => resolve(full));
    response.data.on('error', reject);
  });
}

async function hfDedicatedEndpointStream(prompt, onToken) {
  const response = await axios.post(
    `${HF_ENDPOINT_URL}/generate_stream`,
    {
      inputs: prompt,
      parameters: {
        max_new_tokens:     1024,
        temperature:        0.2,
        top_p:              0.9,
        repetition_penalty: 1.1,
        do_sample:          true,
        return_full_text:   false,
      },
    },
    {
      headers: {
        Authorization:  `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      responseType: 'stream',
      timeout:      LLM_TIMEOUT_MS,
    },
  );

  let full   = '';
  let buffer = '';

  return new Promise((resolve, reject) => {
    response.data.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        try {
          const payload = JSON.parse(trimmed.slice(5).trim());
          const token   = payload?.token?.text ?? '';
          if (token && token !== '</s>' && token !== '<|eot_id|>') {
            full += token;
            onToken?.(token);
          }
          if (payload?.generated_text) resolve(full || payload.generated_text);
        } catch {

        }
      }
    });
    response.data.on('end',   () => resolve(full));
    response.data.on('error', reject);
  });
}
