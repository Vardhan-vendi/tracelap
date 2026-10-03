# Code Flow Visualizer — Project Plan (Zero-Cost Build)

A website where students write code, run it, and watch a second panel animate exactly what's happening line by line: memory changes, execution flow, and any database/API calls — all explained in plain language and drawn as a colorful diagram.

This plan uses **only free-tier or open-source tools** end to end. Where a "paid" option exists, a free alternative is listed alongside it with its limits called out honestly.

---

## 1. Free tech stack

### Frontend (100% free, open-source)

| Technology | Version | Purpose | Cost |
|---|---|---|---|
| React | 19.3 | UI framework | Free, open-source |
| Vite | 6.x | Build tool/dev server | Free, open-source |
| TypeScript | 5.7+ | Type safety | Free, open-source |
| Monaco Editor | latest | Code editor pane | Free, open-source (MIT) |
| `@xyflow/react` (React Flow) | 12.x | Flow/memory diagram rendering | Free, open-source (MIT) |
| Tailwind CSS | 4.x | Styling | Free, open-source |
| Zustand | latest | Playback state management | Free, open-source |
| Framer Motion | 11.x | Step-to-step animation | Free, open-source |

### Backend (100% free, open-source)

| Technology | Version | Purpose | Cost |
|---|---|---|---|
| Python | 3.13 | Backend + tracer language | Free |
| FastAPI | latest | REST API | Free, open-source |
| Uvicorn | 0.3x | ASGI server | Free, open-source |
| Pydantic | v2 | Trace/AI schema validation | Free, open-source |
| SQLite (dev) → PostgreSQL (prod) | — | Data storage | Free (see hosting below) |
| `arq` or Celery + Redis | latest | Async job queue for running code | Free, open-source |

### Tracer engine (no cost — it's your own code)

- `sys.settrace` / `bdb` — line-by-line execution hooks
- `tracemalloc` — memory allocation tracking
- `ast` — pre-parses code to detect DB/API calls before running

### Sandboxing (free tier friendly)

| Technology | Purpose | Cost |
|---|---|---|
| Docker | Isolate each code run in a container | Free (Docker Desktop / Docker Engine) |
| Resource limits (`--memory`, `--cpus`, timeout flags) | Prevent runaway code | Free — built into Docker |
| Network disabled in container | Forces DB/API calls through your mock layer | Free |

### AI layer — this is the one place "free" needs real trade-offs

You need an LLM for the explainer + evaluator agents. Options, cheapest to most capable:

| Option | Cost | Trade-off |
|---|---|---|
| **Ollama + a local open model** (Llama 3.1 8B, Qwen2.5, Mistral) | Completely free, runs on your own machine/server | Needs a machine with a decent GPU (or slow on CPU); quality is lower than frontier models, so your evaluator agent needs a stricter rubric to catch mistakes |
| **Groq free tier** (Llama/Qwen models via API) | Free with generous rate limits as of now | Rate limits are shared/variable — fine for a student project or small class, not for scale |
| **Google Gemini free tier (AI Studio)** | Free with daily request limits | Good quality, but limits will bite once you have more than a handful of concurrent students |
| **Claude API (Anthropic)** | Free trial credit for new accounts, paid after | Best quality/grounding for structured JSON output; use this if you can accept a small ongoing cost later |

**Recommendation for a truly $0 build:** start with **Ollama running a small local model** for development and demos. It costs nothing but your own compute, and because your tracer engine supplies the ground truth, the LLM's job is narrow (caption + light reasoning), which smaller models handle reasonably well. You can swap in a hosted API later without changing your architecture — the AI layer is already an isolated component.

### Mocking external systems (DB/API) — free, all your own code

- SQLAlchemy event hooks or in-memory SQLite to fake a database
- A tiny local FastAPI endpoint that returns canned responses to fake an external API

### Hosting & deployment (free tiers)

| Layer | Free option | Free-tier limit to know about |
|---|---|---|
| Frontend | Vercel or Netlify (free plan) | Fine for personal/student projects; generous bandwidth |
| Backend API | Render free web service, or Fly.io free allowance | Free instances sleep after inactivity — first request after idle is slow |
| Database | Supabase (free Postgres) or Neon (free Postgres) | Storage cap (usually ~500MB–1GB), fine for early stage |
| Redis/queue | Upstash (free Redis tier) | Request-count cap per day |
| Code execution sandbox | Self-hosted Docker on the same free backend instance, or a free-tier VM (Oracle Cloud Free Tier gives an always-free small VM) | Free VM is CPU-limited — fine for one student running code at a time, not for a full classroom hammering it simultaneously |
| CI/CD | GitHub Actions (free minutes for public repos) | Free minutes cap on private repos |

**Honest limitation:** free tiers work great for building, testing, and demoing this to a small group. If it grows to hundreds of concurrent students, sandboxed code execution is the first thing that will need paid compute — it's inherently resource-hungry. Everything else in this stack can stay free much longer.

---

## 2. Complete task list, by phase

### Phase 0 — Setup
- [ ] Create GitHub repo, set up monorepo structure (`/frontend`, `/backend`, `/tracer`)
- [ ] Set up Docker Compose for local dev (backend, Postgres/SQLite, Redis)
- [ ] Set up linting/formatting (ESLint + Prettier for frontend, Ruff + Black for backend)
- [ ] Write a one-line "hello world" trace to confirm the dev loop works end to end

### Phase 1 — Tracer engine (build this first, no AI, no frontend)
- [ ] Implement `sys.settrace`-based line tracker that captures: line number, local variables, call stack depth
- [ ] Add object-identity tracking (so references/pointers can be shown, not just values)
- [ ] Add `tracemalloc` hooks for memory allocation events
- [ ] Design the trace JSON schema (Pydantic models) — this is the contract every other layer depends on
- [ ] Write unit tests: loops, conditionals, function calls, recursion, exceptions
- [ ] Handle infinite loops / timeouts safely inside the tracer
- [ ] Use `ast` to pre-scan code and flag DB/API-looking calls before execution

### Phase 2 — Sandbox & mocking
- [ ] Containerize the tracer (Docker image, no network, memory/CPU/time limits)
- [ ] Build the async execution job (submit code → job ID → poll or fetch result)
- [ ] Build the mock database layer (SQLAlchemy event hooks or fake SQLite) and capture query events into the trace
- [ ] Build the mock API layer (local fake HTTP server) and capture request/response events into the trace
- [ ] Test malicious/edge-case code (infinite loops, huge memory allocation, fork attempts) against the sandbox limits

### Phase 3 — Backend API
- [ ] FastAPI project scaffold, health check endpoint
- [ ] `POST /run` — submit code, returns job ID
- [ ] `GET /trace/{job_id}` — returns full trace once ready
- [ ] Data models for saving code snippets and trace history (if you want persistence)
- [ ] Basic rate limiting so free-tier hosting doesn't get overwhelmed

### Phase 4 — AI layer
- [ ] Set up Ollama (or chosen free LLM) locally/on server
- [ ] Build the **explainer agent**: takes one trace event → returns a short plain-language caption, strictly grounded in the event's fields (use structured/JSON output)
- [ ] Build the **external-systems interpreter**: takes a mocked DB/API event → returns an explanation of what that call conceptually does
- [ ] Build the **evaluator agent**: checks each caption against the rubric (grounding, level-appropriateness, consistency, no future-state spoilers)
- [ ] Wire the feedback loop: failed evaluation → regenerate caption with the failure reason attached
- [ ] Add a beginner/intermediate toggle that changes prompt vocabulary, not facts
- [ ] Cache captions for identical trace patterns (saves LLM calls — important on free tiers)

### Phase 5 — Frontend: code editor pane
- [ ] Integrate Monaco Editor
- [ ] "Run" button → calls backend, shows loading state
- [ ] Line-highlight decoration that syncs to the current playback step
- [ ] Basic error display (syntax errors, runtime exceptions)

### Phase 6 — Frontend: visualization pane
- [ ] Set up React Flow canvas
- [ ] Render variables/objects as nodes, colored by type/category
- [ ] Render references/calls as colored, directional edges
- [ ] Render external DB/API calls as a distinct visual lane or node style
- [ ] Step-by-step playback controls (play, pause, step forward/back, speed slider)
- [ ] Small caption box showing the AI-generated "what this line is doing" message per step
- [ ] Animate transitions between steps (Framer Motion)

### Phase 7 — Integration & polish
- [ ] Connect editor pane + visualization pane + playback state (Zustand store)
- [ ] End-to-end test: write code → run → watch full animated trace with captions
- [ ] Responsive layout (split panes, resizable)
- [ ] Difficulty-level toggle wired through the UI
- [ ] Error states: what happens when code has a bug, infinite loop, or unsupported syntax

### Phase 8 — Testing
- [ ] Unit tests: tracer correctness across many code patterns
- [ ] Unit tests: evaluator agent catches deliberately wrong captions (feed it bad captions, confirm it flags them)
- [ ] Load test: sandbox behavior under concurrent runs (find your free-tier ceiling)
- [ ] Manual usability test with a few real students

### Phase 9 — Deployment (free tiers)
- [ ] Deploy frontend to Vercel/Netlify
- [ ] Deploy backend to Render/Fly.io free tier
- [ ] Set up Supabase/Neon free Postgres
- [ ] Set up Upstash free Redis
- [ ] Configure environment variables/secrets
- [ ] Set up GitHub Actions CI (lint, test, deploy on merge)

### Phase 10 — Stretch goals (after MVP works)
- [ ] Add a second language (Java or C) — new tracer, new memory model
- [ ] Real DB/API connections (opt-in, sandboxed) instead of only mocks
- [ ] Shareable trace links (send a friend your visualized run)
- [ ] Classroom mode (teacher dashboard, assigned exercises)
- [ ] Swap in a paid LLM API for higher-quality explanations once budget allows

---

## 3. Suggested build order (why this sequence)

1. **Tracer first, isolated from everything else.** It's the ground truth; nothing above it matters if it's wrong.
2. **Sandbox second** — you need this before you let any code (even your own test code) run automatically.
3. **AI layer third**, tested against real trace output, not fake data.
4. **Frontend last** — by the time you build it, you already have a real API to point it at instead of guessing at the shape of the data.

This order also means you always have a working, demoable piece at each stage — even before there's a UI, you can prove the tracer works by printing trace JSON to a terminal.

---

## 4. Where free will eventually cost you

Being upfront about this so it doesn't surprise you later:
- **LLM quality** — free/local models will occasionally produce weaker captions than a frontier API. The evaluator agent is what protects you here; invest time in its rubric rather than the model choice.
- **Concurrent code execution** — this is CPU/memory-bound and free-tier VMs are limited. Fine for solo use or a small classroom; a real bottleneck at scale.
- **Free hosting cold-starts** — free backend tiers often sleep when idle, so the first request after a break will be slow. Not a problem for a project/demo, worth knowing before a live class demo.
