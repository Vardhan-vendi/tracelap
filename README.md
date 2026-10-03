# 🎓 TRACELAP — Interactive Python Execution Tracer

> **Watch your code come alive.** Write Python, run it, and see a live animated diagram of exactly what is happening — memory changes, stack frames, heap references, and external API/database calls — explained in plain language, step by step.

---

## 🌟 What Is This?

**TRACELAP** is a free, open-source, interactive learning platform built for students and early developers who want to truly *understand* Python — not just run it.

Most beginners write code and see output, but have no idea **what the computer is actually doing** inside. Code Flow Visualizer bridges that gap:

- You write a Python snippet in the left editor panel.
- You click **Run & Trace**.
- The right panel animates a fully interactive diagram — line by line — showing you:
  - Which variables exist and what values they hold
  - How list/dict/object variables are actually **references** pointing to objects in heap memory (the famous aliasing trap!)
  - How function calls **push frames onto the call stack** and how returns **pop them off**
  - How much memory each line allocates or frees
  - What your code is doing when it queries a database or hits an external API

Each step also shows a **plain-language AI caption** explaining exactly what that line did — no jargon, just clarity.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🔍 **Line-by-line Execution Tracer** | Powered by Python's `sys.settrace` — captures every single execution event |
| 🧠 **Heap Memory & Reference Visualization** | Shows pointer graphs: when two variables alias the same object, you'll see the arrow |
| 📚 **Call Stack Frame View** | Watch functions push frames with local scopes, then pop with return values |
| 💾 **Memory Allocation Tracking** | `tracemalloc` shows bytes allocated/freed at every step |
| 🗄️ **Mock Database Lane** | Call `db.query()` / `db.insert()` in your code — see SQL events animated in real-time |
| 🌐 **Mock HTTP API Lane** | Call `api.get()` / `api.post()` — see request/response payloads visualized |
| 🤖 **Auto-Decides Visuals** | The system detects aliasing, recursion, DB calls, API calls automatically — no manual toggles |
| 📐 **Free Pan & Zoom Canvas** | Infinite canvas — drag, scroll, pinch, zoom from 0.01x to 6x, anywhere |
| 🖥️ **Screen Division Control** | Full Code, 50/50 Split, or Full Visuals layout modes |
| 💬 **AI Plain-Language Captions** | Offline rule-based explainer (zero cost, zero latency) — plug in Groq or Ollama optionally |
| 🔒 **Security Sandboxing** | AST scanner blocks forbidden imports; step limit + timeout watchdog stops infinite loops |
| 💸 **100% Zero-Cost** | Every single component is free — no paid APIs required to run the full application |

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **React** | 19.x | UI Framework |
| **Vite** | 8.x | Build Tool & Dev Server |
| **TypeScript** | 6.x | Type Safety |
| **Tailwind CSS** | 4.x | Utility-First Styling |
| **Monaco Editor** | latest | Code Editor (same engine as VS Code) |
| **@xyflow/react (React Flow)** | 12.x | Infinite Pan & Zoom Graph Canvas |
| **Zustand** | 5.x | Lightweight Global State Management |
| **Lucide React** | latest | Icon Library |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **Python** | 3.12 | Backend Language & Execution Host |
| **FastAPI** | latest | REST API Framework |
| **Uvicorn** | latest | ASGI Server |
| **Pydantic v2** | 2.x | Trace Schema Validation |

### Tracer Engine (Core — No External Dependencies)
| Technology | Purpose |
|---|---|
| `sys.settrace` / `bdb` | Line-by-line execution hooks |
| `tracemalloc` | Memory allocation tracking per step |
| `ast` | Pre-execution security scanning & feature detection |
| Custom Serializer | Cycle-safe heap object & pointer graph builder |

### AI Explainer Layer
| Option | Cost | Notes |
|---|---|---|
| **Rule-Based Explainer** (Default) | $0 / 100% Offline | Instant, ground-truth, no hallucinations |
| **Groq Free Tier** (Optional) | Free API tier | Llama 3.1 ultra-fast cloud inference |
| **Ollama** (Optional) | Free / Self-hosted | Local models (Llama, Qwen, Mistral) |

---

## 🚀 Getting Started & Collaborator Setup Guide

Follow these steps to run the project locally on your machine (works on Windows, macOS, and Linux).

### Prerequisites
- **Python** 3.10+ (3.12 recommended)
- **Node.js** 20+
- **npm** 10+
- **Git**

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/Vardhan-vendi/code-learner.git
cd code-learner
```

---

### Step 2: Install Python Backend & Tracer Engine
```bash
# 1. Install all dependencies from requirements.txt
pip install -r requirements.txt

# 2. Install the tracer engine in editable mode
pip install -e ./tracer
```

---

### Step 3: (Optional) Configure Environment Variables (`.env`)
> 💡 **Good to know:** A `.env` file is **NOT required** to run the project. By default, the application uses an **offline, 100% free rule-based explainer** that requires no API keys and has zero latency.

If you wish to use **Groq** (free-tier cloud LLM) or **Ollama** (local models):
```bash
# Windows (PowerShell):
Copy-Item .env.example .env

# macOS / Linux:
cp .env.example .env
```
Open `.env` in your editor and set:
- `AI_PROVIDER=groq` and supply your `GROQ_API_KEY=gsk_...` (free from [console.groq.com](https://console.groq.com))
- Or `AI_PROVIDER=ollama` with `OLLAMA_HOST=http://localhost:11434`

---

### Step 4: Start the Backend API Server
Open **Terminal 1** in the root `code-learner` directory:
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Base: **http://127.0.0.1:8000**
- Interactive Swagger Docs: **http://127.0.0.1:8000/docs**

---

### Step 5: Install Frontend Dependencies & Start UI
Open **Terminal 2** and navigate to the frontend directory:
```bash
cd frontend
npm install
npm run dev
```
- Web Application: **http://localhost:5173**

---

### Step 6: Verify Everything Works (Run Tests)
In **Terminal 1** (or any terminal in the root folder):
```bash
python -m pytest tracer/tests backend/tests -v
```
All **20 tests** should pass, validating the tracer engine, AST security scanner, mock DB/API events, and FastAPI endpoints.


---

## 📁 Project Structure

```
code-learner/
│
├── tracer/                         # Core execution engine (no external deps)
│   ├── tracer/
│   │   ├── engine.py               # sys.settrace + tracemalloc tracer
│   │   ├── schema.py               # Pydantic schemas (TraceStep, HeapObject, etc.)
│   │   ├── serializer.py           # Cycle-safe pointer/heap graph serializer
│   │   ├── detector.py             # AST security scanner & visual-mode detector
│   │   └── mocks/
│   │       ├── db.py               # Mock Database (query, insert)
│   │       └── api.py              # Mock HTTP API (get, post)
│   └── tests/
│       ├── test_tracer.py          # Tracer unit tests (aliasing, recursion, loops...)
│       ├── test_ast.py             # AST security validation tests
│       └── test_mocks.py           # Mock DB & API event capture tests
│
├── backend/                        # FastAPI service + AI explainer
│   ├── app/
│   │   ├── main.py                 # FastAPI app entry point
│   │   ├── config.py               # Environment settings
│   │   ├── runner.py               # Code execution orchestrator
│   │   ├── routes/
│   │   │   ├── run.py              # POST /api/run, GET /api/trace/{id}
│   │   │   ├── explain.py          # POST /api/explain
│   │   │   └── examples.py         # GET /api/examples
│   │   └── ai/
│   │       ├── base.py             # Abstract AI provider interface
│   │       ├── rule_based.py       # 100% offline deterministic explainer
│   │       ├── providers.py        # Groq + Ollama adapters
│   │       ├── evaluator.py        # Rubric-based caption quality checker
│   │       ├── explainer.py        # Step enrichment pipeline
│   │       └── cache.py            # LRU caption cache (saves LLM calls)
│   └── tests/
│       └── test_backend.py         # API integration tests
│
├── frontend/                       # React 19 + TypeScript frontend
│   └── src/
│       ├── types/trace.ts          # TypeScript mirrors of Pydantic schemas
│       ├── store/useTraceStore.ts  # Zustand global state + auto-visual detection
│       ├── utils/graphBuilder.ts   # Trace step → React Flow nodes/edges
│       └── components/
│           ├── Header.tsx          # Top bar: screen division, auto-visual tags, run
│           ├── EditorPane.tsx      # Monaco editor with live line highlighting
│           ├── Controls.tsx        # Play, pause, step, scrubber, speed
│           ├── CaptionBox.tsx      # AI caption + memory telemetry + stdout drawer
│           ├── ModalSettings.tsx   # AI provider configuration modal
│           └── visualizer/
│               ├── VisualizerPane.tsx      # Infinite canvas with free pan & zoom
│               └── nodes/
│                   ├── FrameNode.tsx       # Call stack frame card
│                   ├── VariableNode.tsx    # Variable with type color + pointer handle
│                   ├── HeapObjectNode.tsx  # Lists, dicts, objects on the heap
│                   └── ExternalCallNode.tsx # Mock DB / API event card
│
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
└── README.md
```

---

## 🧪 Running Tests

```bash
# Run the full test suite (20 tests)
python -m pytest tracer/tests backend/tests -v
```

**All 20 tests** cover:
- Variable assignment, mutation, and type tracking
- Object aliasing: `list2 = list1` — verifies both variables point to same heap object ID
- Loop memory accumulation
- Recursive function call stack frames
- Infinite loop protection (step limit + timeout)
- AST security: blocks `os`, `subprocess`, `sys` imports
- Mock DB query capture
- Mock API request capture
- FastAPI endpoints: `/api/run`, `/api/examples`, `/api/explain`, `/api/health`

---

## 🐳 Docker (Optional)

```bash
docker compose up --build
```

- Frontend: **http://localhost:5173**
- Backend: **http://localhost:8000**

---

## 🤝 Authors & Team Collaboration

This project is a collaborative effort between:

| Author | Role | Focus Areas | GitHub Profile |
|---|---|---|---|
| **Chaitanya Sai Deepthi** | Co-author / Team Member | Concept, UI/UX Design, Frontend Architecture & AI Explainer Layer | [@chaitanyasaideepthi](https://github.com/chaitanyasaideepthi) |
| **Vendi Vardhan Babu** | Co-author / Creator | Core Tracer Engine, AST Analysis, Memory Serializer & Backend API | [@Vardhan-vendi](https://github.com/Vardhan-vendi) |

---

## 🌿 Git Collaboration Guide for Team Members

To work seamlessly together without stepping on each other's code or getting stuck in merge conflicts, follow this recommended Git workflow:

### 1. Daily Sync (Before Starting Work)
Always pull the latest changes from `main` before creating a new branch or starting new work:
```bash
git checkout main
git pull origin main
```

### 2. Work on Feature Branches (Never directly on `main`)
Name your branch by feature or author:
- `feature/ui-improvements`
- `feature/tracer-async-support`
- `fix/memory-leak`
- `chaitanya/caption-enhancement`
- `vardhan/ast-validation`

Create and switch to your new branch:
```bash
git checkout -b feature/<your-feature-name>
```

### 3. Commit Frequently with Descriptive Messages
Keep commits focused on single logical units:
```bash
git add .
git commit -m "feat(frontend): add floating zoom controls to visualizer"
```

### 4. Keep Your Branch Up to Date with `main`
Before pushing or opening a PR, sync any new work your teammate has merged:
```bash
git checkout main
git pull origin main
git checkout feature/<your-feature-name>
git merge main
# or: git rebase main
```
If there are any conflicts, resolve them together in VS Code, run your tests, and commit the resolution.

### 5. Push Your Branch to GitHub
```bash
git push -u origin feature/<your-feature-name>
```

### 6. Create a Pull Request (PR) on GitHub
1. Go to [github.com/Vardhan-vendi/code-learner](https://github.com/Vardhan-vendi/code-learner)
2. Click **Compare & pull request**
3. Add a short summary of changes and tag your collaborator for review
4. Once reviewed and tests pass (`python -m pytest tracer/tests backend/tests -v`), click **Merge pull request** (Squash and merge is recommended for a clean history)

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

*Built with 💜 as a zero-cost, open-source educational tool for Python learners everywhere.*

