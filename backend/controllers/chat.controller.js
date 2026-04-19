import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { runResearchPipeline } from '../pipeline/researchPipeline.js';
import Session     from '../models/Session.model.js';
import UserProfile from '../models/UserProfile.model.js';
import logger      from '../utils/logger.js';
import { createError } from '../middleware/errorHandler.js';
import { getEmbedder } from '../services/embeddings/embedder.js';
import { summariseHistory } from '../services/memory/conversationMemory.js';
import { extractLocationFromQuery } from '../utils/locationExtractor.js';
import { classifyFollowUp } from '../services/followup/followUpClassifier.js';
import axios from 'axios';

async function generateFocusedAnswer(disease, followUpQuery, publications) {
  if (!process.env.GROQ_API_KEY) return null;
  try {
    const topPapers = (publications ?? []).slice(0, 5).map((p, i) =>
      `[P${i + 1}] ${p.title} (${p.year}): ${(p.abstract || '').slice(0, 200)}`
    ).join('\n');

    const prompt = `You are a medical research assistant. Answer this follow-up question about ${disease} in exactly 5-6 lines using only the provided papers.

Question: "${followUpQuery}"

Papers:
${topPapers}

Return a JSON object with these fields:
{
  "direct_answer": "A clear 5-6 line paragraph answering the question with inline citations like [P1], [P2]",
  "key_findings": ["finding 1 with citation [P1]", "finding 2 with citation [P2]", "finding 3 with citation [P3]"],
  "safety_notes": "Any safety concerns or important warnings (1-2 lines)"
}

Return ONLY valid JSON. No markdown, no explanation.`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      },
      {
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        timeout: 10000,
      },
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    logger.info(`[CHAT] Focused answer generated for follow-up: "${followUpQuery}"`);
    return parsed;
  } catch (err) {
    logger.warn(`[CHAT] Focused answer generation failed: ${err.message}`);
    return null;
  }
}

async function rewriteFollowUpQuery(disease, previousQuery, followUpQuery) {
  if (!process.env.GROQ_API_KEY) return followUpQuery;
  try {
    const prompt = `You are a medical search specialist. A user is researching "${disease}".

Previous question: "${previousQuery}"
Follow-up question: "${followUpQuery}"

Rewrite the follow-up into a single complete, standalone medical search query that includes the disease context. Return ONLY the rewritten query, nothing else. Max 15 words.`;

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 60,
      },
      {
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        timeout: 5000,
      },
    );
    const rewritten = response.data?.choices?.[0]?.message?.content?.trim();
    if (rewritten && rewritten.length > 5) {
      logger.info(`[CHAT] Query rewritten: "${followUpQuery}" → "${rewritten}"`);
      return rewritten;
    }
    return followUpQuery;
  } catch {
    return followUpQuery;
  }
}

class LRUCache {
  constructor({ max = 500, ttl = 86_400_000 }) {
    this.max  = max;
    this.ttl  = ttl;
    this.map  = new Map();
  }

  _buildKey({ disease = '', query = '', location = '' }) {
    const normalized = [disease, query, location].map((s) => s.toLowerCase().trim()).join('|');
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  get(keyParams) {
    const key   = this._buildKey(keyParams);
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > this.ttl) { this.map.delete(key); return null; }

    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(keyParams, value) {
    const key = this._buildKey(keyParams);
    if (this.map.has(key)) this.map.delete(key);
    if (this.map.size >= this.max) {

      this.map.delete(this.map.keys().next().value);
    }
    this.map.set(key, { value, ts: Date.now() });
  }
}

const retrievalCache = new LRUCache({ max: 500, ttl: 86_400_000 });

const sessionWindows = new Map();
const SESSION_WINDOW_MS  = 60_000;
const SESSION_MAX_REQS   = 10;

function checkSessionRateLimit(sessionId) {
  const now  = Date.now();
  const hits = (sessionWindows.get(sessionId) ?? []).filter((t) => now - t < SESSION_WINDOW_MS);
  if (hits.length >= SESSION_MAX_REQS) return false;
  hits.push(now);
  sessionWindows.set(sessionId, hits);
  return true;
}

setInterval(() => {
  const cutoff = Date.now() - SESSION_WINDOW_MS;
  for (const [id, hits] of sessionWindows.entries()) {
    if (hits.every((t) => t < cutoff)) sessionWindows.delete(id);
  }
}, 5 * 60_000);

class PipelineQueue {
  constructor(concurrency = 2) {
    this.concurrency = concurrency;
    this.running     = 0;
    this.queue       = [];
  }

  add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this._drain();
    });
  }

  _drain() {
    if (this.running >= this.concurrency || this.queue.length === 0) return;
    this.running++;
    const { fn, resolve, reject } = this.queue.shift();

    setImmediate(() => {
      Promise.resolve()
        .then(() => fn())
        .then(
          (res) => { this.running--; resolve(res); this._drain(); },
          (err) => { this.running--; reject(err);  this._drain(); },
        );
    });
  }
}

const pipelineQueue = new PipelineQueue(2);

const NON_MEDICAL_RE = /\b(recipe|cooking|weather|sports|stock|crypto|bitcoin|celebrity|movie|music|game|gaming|politics|election|travel|fashion|shopping|news)\b/i;
const MEDICAL_RE = /\b(treatment|therapy|drug|medicine|symptom|diagnosis|cancer|disease|trial|study|clinical|patient|doctor|hospital|cure|dose|side effect|research|prognosis)\b/i;

function isOutOfScope(query, disease) {
  if (MEDICAL_RE.test(query)) return false;
  if (disease && disease.length > 2) return false;
  return NON_MEDICAL_RE.test(query);
}

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

const REFINEMENT_RE = /\b(in india|in china|in usa|in uk|in canada|in australia|in europe|trials in|available in|near me|for me|for children|for elderly|for adults|simple|explain|summarize|summarise|only recent|last \d+ year|from \d{4})\b/i;

async function detectTopicShift(previousQuery, newQuery) {
  if (!previousQuery) return false;

  if (REFINEMENT_RE.test(newQuery) && newQuery.split(/\s+/).length <= 10) {
    logger.debug('[CHAT] Refinement query detected — not a topic shift');
    return false;
  }

  try {
    const embedder = await getEmbedder();
    const [embA, embB] = await Promise.all([
      embedder(previousQuery, { pooling: 'mean', normalize: true }),
      embedder(newQuery,      { pooling: 'mean', normalize: true }),
    ]);
    const similarity = cosineSimilarity(embA.data, embB.data);

    const isShift = similarity < 0.35;
    if (isShift) logger.info(`[CHAT] Topic shift (cos=${similarity.toFixed(3)}) → bypassing cache`);
    else         logger.debug(`[CHAT] Same topic (cos=${similarity.toFixed(3)}) → using cache`);
    return isShift;
  } catch {
    return keywordTopicShift(previousQuery, newQuery);
  }
}

function keywordTopicShift(prev, next_) {
  const STOP = new Set(['the','a','an','is','are','for','with','and','or',
    'can','what','how','does','do','my','me','it','this','that','of',
    'to','in','on','at','be','have','has','had','was','were','will','would',
    'should','could','please','tell','about','also','too','any','some','more']);
  const tok = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
  const prevSet = new Set(tok(prev));
  const nextTok = tok(next_);
  if (!prevSet.size || !nextTok.length) return false;
  const overlap = nextTok.filter((t) => prevSet.has(t)).length;
  return (overlap / Math.max(nextTok.length, prevSet.size)) < 0.25;
}

export async function handleChat(req, res, next) {
  const { disease, query, patientName, location, sessionId: existingSessionId } = req.body;

  if (!disease || !query) {
    return next(createError('Both "disease" and "query" are required.', 400));
  }
  if (disease.length > 200 || query.length > 500) {
    return next(createError('Input too long. Max: disease=200, query=500 chars.', 400));
  }

  const sessionId = existingSessionId ?? uuidv4();

  if (!checkSessionRateLimit(sessionId)) {
    return next(createError('Rate limit exceeded for this session. Please wait a minute.', 429));
  }

  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  send('session', { sessionId });

  try {

    let session = await Session.findOne({ sessionId });
    const rawMessages = session
      ? session.messages.slice(-10).map(({ role, content }) => ({ role, content }))
      : [];

    const conversationHistory = session?.conversationSummary
      ?? (rawMessages.length > 0 ? rawMessages.slice(-6) : null);

    if (!session) {

      const userId = patientName
        ? crypto.createHash('md5').update(patientName.toLowerCase().trim()).digest('hex')
        : null;

      session = new Session({
        sessionId, disease,
        patientName: patientName ?? '',
        location:    location ?? '',
        messages:    [],
        userId,
      });

      if (userId) {
        UserProfile.findOneAndUpdate(
          { userId },
          {
            $setOnInsert: {
              name:     patientName,
              location: location ?? '',
            },
            $addToSet: {
              conditions: disease,
            },
          },
          { upsert: true, new: true },
        ).catch((err) => logger.warn(`[CHAT] UserProfile upsert failed: ${err.message}`));
      }

      logger.info(`[CHAT] New session ${sessionId} (userId: ${userId ?? 'anonymous'})`);
    } else {
      logger.info(`[CHAT] Resuming session ${sessionId} (${rawMessages.length} msgs)`);
    }

    session.messages.push({ role: 'user', content: query, timestamp: new Date() });

    let userProfile = null;
    if (session.userId) {
      userProfile = await UserProfile.findOne({ userId: session.userId }).lean();
      if (userProfile) {
        logger.debug(`[CHAT] Loaded profile for user ${session.userId}`);

        UserProfile.updateOne(
          { userId: session.userId },
          { $push: { queryHistory: { query, disease, timestamp: new Date() } } },
        ).catch(() => {});
      }
    }

    if (isOutOfScope(query, disease)) {
      send('result', {
        sessionId,
        conditionOverview: `This assistant is focused on medical research for "${disease}". Your query doesn't appear to be related to this topic.`,
        keyFindings: [],
        treatmentAnalysis: [],
        outcomesSummary: [],
        limitations: [],
        clinicalTrialsSummary: '',
        recommendation: `Please ask a question related to ${disease} — treatments, clinical trials, side effects, research findings, or medications.`,
        disclaimer: 'Information generated by AI. Consult a doctor.',
        publications: [], trials: [], sources: [],
        confidence_score: 0, showOnlyFocused: false,
      });
      send('done', { sessionId });
      return res.end();
    }

    const queryLocation = extractLocationFromQuery(query);
    const resolvedLocation = queryLocation ?? location ?? session.location ?? '';
    if (queryLocation) logger.info(`[CHAT] Location extracted from query: "${queryLocation}"`);

    const lastUserMsg = rawMessages.findLast?.((m) => m.role === 'user');
    const { type: followUpType, focusMode } = classifyFollowUp(query, lastUserMsg?.content ?? null, disease);
    logger.info(`[CHAT] Follow-up type: ${followUpType} | focusMode: ${focusMode ?? 'full'}`);

    // Rewrite follow-up queries using LLM so pipeline searches with full context
    const enrichedQuery = (
      followUpType !== 'new_query' &&
      followUpType !== 'new_topic' &&
      lastUserMsg?.content
    ) ? await rewriteFollowUpQuery(disease, lastUserMsg.content, query) : query;

    const cacheParams = { disease, query, location: resolvedLocation };
    const isTopicShift = lastUserMsg ? await detectTopicShift(lastUserMsg.content, query) : false;

    const skipCache = isTopicShift || focusMode !== null;
    const cached = skipCache ? null : retrievalCache.get(cacheParams);
    send('cache', { hit: Boolean(cached), topicShift: isTopicShift });

    const pipelineResult = await pipelineQueue.add(() => runResearchPipeline({
      disease,
      userQuery:   enrichedQuery,
      patientName: patientName ?? session.patientName,
      location:    resolvedLocation,
      conversationHistory,
      onToken:     (token) => send('token', { token }),
      userProfile,
      focusMode,
      ...(cached && { cachedPublications: cached.publications, cachedTrials: cached.trials }),
    }));

    if (!cached) {
      retrievalCache.set(cacheParams, {
        publications: pipelineResult.publications,
        trials:       pipelineResult.trials,
      });
    }

    // Generate focused answer for follow-up questions
    const isFollowUp = followUpType !== 'new_query' && followUpType !== 'new_topic';
    const focusedAnswer = isFollowUp
      ? await generateFocusedAnswer(disease, query, pipelineResult.publications)
      : null;

    session.messages.push({
      role:             'assistant',
      content:          pipelineResult.recommendation ?? pipelineResult.conditionOverview ?? '',
      sources:          { publications: pipelineResult.publications, trials: pipelineResult.trials },
      confidence_score: pipelineResult.confidence_score,
      validation:       pipelineResult.validation,
      metrics:          pipelineResult.metrics,
    });

    await session.save().catch((err) => logger.warn(`Session save failed: ${err.message}`));

    const updatedMessages = session.messages.slice(-10).map(({ role, content }) => ({ role, content }));
    if (updatedMessages.length >= 4) {
      setImmediate(() => {
        summariseHistory(updatedMessages, disease)
          .then((summary) => {
            if (summary) {
              Session.updateOne(
                { sessionId },
                { $set: { conversationSummary: summary } },
              ).catch(() => {});
            }
          })
          .catch(() => {});
      });
    }

    let welcomeBack = null;
    if (userProfile?.queryHistory?.length > 1) {
      const prevDiseases = [...new Set(
        userProfile.queryHistory.slice(-5).map((h) => h.disease).filter(Boolean)
      )];
      if (prevDiseases.length > 0) {
        welcomeBack = `Welcome back${userProfile.name ? `, ${userProfile.name}` : ''}. You've previously researched: ${prevDiseases.join(', ')}.`;
      }
    }

    send('result', {
      sessionId,

      conditionOverview:      pipelineResult.conditionOverview,
      keyFindings:            pipelineResult.keyFindings,
      treatmentAnalysis:      pipelineResult.treatmentAnalysis,
      outcomesSummary:        pipelineResult.outcomesSummary,
      limitations:            pipelineResult.limitations,
      clinicalTrialsSummary:  pipelineResult.clinicalTrialsSummary,
      confidenceLabel:        pipelineResult.confidenceLabel,
      topResearchers:         pipelineResult.topResearchers,

      researchInsights:       pipelineResult.researchInsights,
      clinicalTrialsInsights: pipelineResult.clinicalTrialsInsights,
      contradictions:         pipelineResult.contradictions,
      recommendation:         pipelineResult.recommendation,
      disclaimer:             pipelineResult.disclaimer,

      publications:           pipelineResult.publications,
      trials:                 pipelineResult.trials,
      sources:                pipelineResult.sources,
      confidence_score:       pipelineResult.confidence_score,
      validation:             pipelineResult.validation,
      validationNotice:       pipelineResult.validationNotice,
      metrics:                pipelineResult.metrics,
      provider:               pipelineResult.provider,
      showOnlyFocused:        focusedAnswer ? true : (pipelineResult.showOnlyFocused ?? false),
      focused_answer:         focusedAnswer ?? pipelineResult.focused_answer ?? null,
      followUpType,
      topicShift:             isTopicShift,
      welcomeBack,
    });

    send('done', { sessionId });
    res.end();

  } catch (err) {
    logger.error(`[CHAT] Pipeline error: ${err.message}`, { stack: err.stack });
    send('error', { message: err.message ?? 'Pipeline failed. Please try again.' });
    res.end();
  }
}
