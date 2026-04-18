# Curalink — AI Medical Research Assistant

> A full-stack MERN application that retrieves 180+ papers from 3 live databases, re-ranks them with a 5-stage hybrid pipeline, and synthesises structured, evidence-graded answers using Meta Llama 3.3 70B — with zero hallucinations.

---

## Live Demo

| Service | URL |
|---|---|
| Frontend | https://curalink.vercel.app |
| Backend API | https://curalink-backend.up.railway.app |
| Health Check | https://curalink-backend.up.railway.app/api/health |

---

## What It Does

Curalink is not a chatbot. It is a **research + reasoning system** that:

1. Expands your query into semantic variants
2. Fetches up to 600 raw results from PubMed, OpenAlex, and ClinicalTrials.gov in parallel
3. Deduplicates and re-ranks 180 unique papers through a 5-stage pipeline
4. Sends the top 8 papers to Llama 3.3 70B with strict anti-hallucination rules
5. Returns a structured, cited, evidence-graded answer in under 15 seconds

---

## AI Pipeline

```
User Input (disease + query + optional name/location)
    │
    ▼
[Stage 1] Query Expansion
    Llama 3.2 3B (local) rewrites query into 2 variants
    Falls back to MeSH rule-based expansion in production
    │
    ▼
[Stage 2] Tri-Source Parallel Retrieval  (p-limit concurrency)
    ├── PubMed        — esearch + efetch, retmax=150, API key, date filter
    ├── OpenAlex      — paginated search, per_page=150, 4 pages max
    └── ClinicalTrials.gov v2 — 3 status filters × 2 pages = up to 150 trials
    DOI/title deduplication → 180 unique papers
    Sparse-result fallback: retry with disease-only query if < 10 results
    │
    ▼
[Stage 2.5] Study Type Tagging
    RCT / Systematic Review / Cohort / Peer-reviewed
    Inferred from MeSH tags, OpenAlex type field, title/abstract keywords
    │
    ▼
[Stage 3A] BM25 Keyword Scoring        (Worker Thread — non-blocking)
    │
    ▼
[Stage 3B] MiniLM ONNX Embeddings      (top 150 BM25 candidates, no API)
    all-MiniLM-L6-v2 running in-process via @xenova/transformers
    │
    ▼
[Stage 3C] RRF Fusion                  (Reciprocal Rank Fusion, K=60)
    Merges BM25 + embedding ranked lists
    │
    ▼
[Stage 3C] ms-marco Cross-Encoder      (top 15 RRF candidates)
    Production-grade relevance model, not just similarity
    │
    ▼
[Stage 3D] Passage Extraction          (top 3 query-relevant sentences/paper)
    │
    ▼
[Stage 3E] Query-Relevance Filter      (15% term overlap threshold)
    Prevents stale insights when same disease, different query
    │
    ▼
[Contradiction Detection Pre-Pass]
    Flags conflicting evidence, injects explicit instruction into prompt
    │
    ▼
[Token Budget Guard]
    Groq: 7500 token input cap
    History summarised if needed
    │
    ▼
[Stage 4] LLM Reasoning — Llama 3.3 70B via Groq Cloud
    9 strict rules: no placeholders, inline citations, evidence hierarchy
    Evidence grading: Grade A (RCTs) → D (insufficient evidence)
    Focus mode routing: contextual/drill_down → targeted prompts
    │
    ▼
[Post-Processing]
    JSON extraction + schema enforcement
    Answer validation: citation density, hallucination detection
    Confidence scoring with hallucination penalty
    Deterministic trial summary (LLM never generates trial data)
    │
    ▼
Structured Output → SSE Stream → React Frontend
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Zustand, Framer Motion |
| Backend | Node.js (ESM), Express, SSE streaming |
| Database | MongoDB Atlas (sessions, user profiles) |
| Embeddings | all-MiniLM-L6-v2 via ONNX Runtime (in-process) |
| Re-ranking | ms-marco-MiniLM-L-6-v2 cross-encoder (ONNX) |
| LLM Primary | Llama 3.3 70B via Groq Cloud (free tier) |
| LLM Backup | Mistral 7B via Ollama (local only) |
| Query Expansion | Llama 3.2 3B via Ollama → rule-based MeSH fallback |

---

## Features

### AI Features
- 5-stage hybrid ranking: BM25 → MiniLM → RRF → cross-encoder → MMR
- Contradiction detection pre-pass (flags conflicting study outcomes)
- Evidence grading per response: Grade A/B/C/D with RCT/meta/cohort counts
- Study type tagging: RCT, systematic review, cohort, peer-reviewed
- Date intent parsing: "last 3 years", "since 2020", "recent studies"
- Deterministic trial summaries (no LLM hallucination on trial data)
- Answer validation: citation density, numeric fact grounding (±5%)
- Placeholder detection: strips "X%", "Y months" template leaks
- Circuit breaker: template synthesis fallback if LLM fails

### Product Features
- Multi-turn conversation with session memory
- 5-type follow-up classifier: contextual, drill_down, comparison, refinement, new_topic
- Personalization: UserProfile with conditions + query history injected into prompts
- Location-aware trial filtering ("trials in India")
- Out-of-scope guard: non-medical queries rejected gracefully
- Research history saved to localStorage
- Export to PDF, share link
- Loading skeleton while pipeline runs
- Pipeline progress stepper (5 animated stages)

### Backend Features
- SSE streaming (events: session/cache/token/result/done/error)
- 24h in-process LRU cache (SHA-256 key, 500 entries)
- Per-session rate limiting (10 req/min)
- p-limit concurrency (5 parallel API calls)
- axiosRetry with exponential backoff
- MongoDB session TTL (7-day auto-expire)
- ONNX model pre-warming on server boot

---

## Project Structure

```
Curalink/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/          # MessageBubble, ChatWindow, FollowUpBar
│   │   │   ├── home/          # HomeHero, HomeFeatures
│   │   │   ├── results/       # ResultsTabs, PublicationCard, TrialCard, FocusedAnswerCard
│   │   │   └── ui/            # LoadingSpinner, PipelineProgress, StreamingText
│   │   ├── hooks/             # useChat.js (SSE handler)
│   │   ├── store/             # useChatStore.js (Zustand)
│   │   └── pages/             # Home.jsx, Chat.jsx
│   └── vercel.json
│
├── backend/
│   ├── pipeline/
│   │   └── researchPipeline.js        # Main orchestrator
│   ├── services/
│   │   ├── fetchers/                  # pubmedFetcher, openAlexFetcher, clinicalTrialsFetcher
│   │   ├── ranking/                   # hybridRanker, embeddingRanker, crossEncoderReranker, bm25Worker
│   │   ├── llm/                       # llmService (Groq → Ollama cascade)
│   │   ├── query/                     # queryExpander (Ollama → MeSH fallback)
│   │   ├── followup/                  # followUpClassifier
│   │   ├── evaluation/                # answerValidator
│   │   └── memory/                    # conversationMemory
│   ├── prompts/
│   │   └── v2.js                      # Production prompt builder
│   ├── models/                        # Session.model.js, UserProfile.model.js
│   ├── utils/                         # normalizer, tokenGuard, scorer, locationExtractor
│   ├── config/
│   │   └── constants.js               # FETCH_LIMIT=150, TOP_K=8, GROQ_MAX_INPUT=7500
│   └── server.js
│
├── railway.json                       # Railway backend deploy config
└── README.md
```

---

## Local Development

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free)
- Groq API key — free at [console.groq.com](https://console.groq.com)
- Ollama (optional, for local query expansion)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/curalink.git
cd Curalink

# Install backend
cd backend && npm install

# Install frontend
cd ../frontend && npm install
```

### 2. Configure Environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env — add MONGO_URI and GROQ_API_KEY
```

### 3. Start Development

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Health: http://localhost:5000/api/health

### 4. Optional: Local LLM (Query Expansion)

```bash
# Install Ollama from https://ollama.com/download
ollama pull llama3.2:3b
ollama serve
```

Without Ollama, query expansion uses rule-based MeSH terms (works fine in production).

---

## Deployment

### Backend → Railway

1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Set **Root Directory** to `backend`
4. Add environment variables (copy from `backend/.env.example`)
5. Railway auto-runs `npm start`

**Required env vars on Railway:**
```
MONGO_URI
GROQ_API_KEY
GROQ_MODEL=llama-3.3-70b-versatile
PUBMED_API_KEY
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
PORT=5000
```

### Frontend → Vercel

1. Update `frontend/vercel.json` — replace the Railway URL with your actual Railway domain
2. Go to [vercel.com](https://vercel.com) → New Project → Import repo
3. Set **Root Directory** to `frontend`, Framework to **Vite**
4. Deploy

> Note: ONNX models auto-download on first Railway boot (~30–60s). Subsequent requests are fast.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | ✅ | MongoDB Atlas connection string |
| `GROQ_API_KEY` | ✅ | Groq Cloud API key (free at console.groq.com) |
| `GROQ_MODEL` | ✅ | `llama-3.3-70b-versatile` |
| `PUBMED_API_KEY` | Recommended | NCBI key — 10 req/s vs 3 req/s |
| `FRONTEND_URL` | Production | Deployed Vercel URL (for CORS) |
| `OLLAMA_URL` | Local only | `http://localhost:11434` |
| `PORT` | Optional | Default: 5000 |

---

## Example Queries

| Disease | Query |
|---|---|
| Lung Cancer | Latest immunotherapy treatments |
| Parkinson's Disease | Deep brain stimulation outcomes |
| Alzheimer's Disease | Top researchers and new drug trials |
| Type 2 Diabetes | Clinical trials for GLP-1 receptor agonists |
| Heart Disease | Recent cardiovascular risk reduction studies |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat` | Run research pipeline (SSE stream) |
| GET | `/api/session/:id` | Get session history |
| GET | `/api/health` | System health + model status |

---

## Models Used

| Role | Model | Provider |
|---|---|---|
| LLM Reasoning (primary) | Llama 3.3 70B | Groq Cloud |
| LLM Reasoning (backup) | Mistral 7B | Ollama (local) |
| Query Expansion | Llama 3.2 3B | Ollama (local) |
| Semantic Embeddings | all-MiniLM-L6-v2 | ONNX in-process |
| Cross-Encoder Re-ranking | ms-marco-MiniLM-L-6-v2 | ONNX in-process |

---

## License

MIT — built for the Curalink AI Medical Research Hackathon 2026.

> ⚠️ For research and educational purposes only. Always consult a qualified physician before making medical decisions.
