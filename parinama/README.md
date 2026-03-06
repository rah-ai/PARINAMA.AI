# 🧬 PARINAMA — A Self-Evolving Prompt Optimization Engine

> **परिणाम** (*parināma*) — Sanskrit for "transformation, evolution, result"

PARINAMA takes your raw prompts and evolves them through iterative mutation cycles — scoring, mutating, and refining until they reach peak effectiveness. Powered by a **100% free LLM stack**.

---

## How It Works

```
Input Prompt → Score (5 dims) → Identify Weakness → Mutate → Re-score → Repeat
```

### Evolution Algorithm

1. **Score** the prompt across 5 dimensions (Clarity, Specificity, Actionability, Conciseness, Creativity)
2. **Identify** the weakest dimension
3. **Select** a mutation strategy (CLARIFY, EXPAND, COMPRESS, REFRAME, SPECIALIZE, HUMANIZE)
4. **Apply** the mutation via LLM
5. **Re-score** the evolved prompt
6. **Repeat** until score > 90 or max generations reached (default: 5, max: 7)

### Scoring Weights

| Dimension     | Weight |
|---------------|--------|
| Clarity       | 25%    |
| Specificity   | 20%    |
| Actionability | 20%    |
| Conciseness   | 20%    |
| Creativity    | 15%    |

---

## Tech Stack

### Backend
- **Python 3.11+** with **FastAPI** (async)
- **SQLAlchemy 2.0** (async, aiosqlite)
- **WebSocket** for real-time streaming

### LLM Providers (100% Free)
| Provider | Model | Use Case |
|----------|-------|----------|
| **Groq** | llama-3.1-70b-versatile | Primary (fastest) |
| **Google Gemini** | gemini-2.0-flash | Fallback |
| **Ollama** | mistral (local) | Final fallback |

Automatic failover: Groq → Gemini → Ollama

### Frontend
- **React 18** + **Vite**
- **Framer Motion 11** — animations
- **D3.js** — evolution tree visualization
- **Recharts** — score timeline charts
- **Zustand** — state management
- **Tailwind CSS** — styling

### Design System
- **Fonts**: Playfair Display (display), Inter (body), DM Mono (scores/code)
- **Palette**: Warm amber/earthy tones — no blue/purple
- **Dark mode** default with light mode toggle

---

## Project Structure

```
parinama/
├── backend/
│   ├── .env                  # API keys (Groq, Gemini)
│   ├── .env.example          # Template
│   ├── requirements.txt      # Python dependencies
│   ├── main.py               # FastAPI app entry
│   ├── core/
│   │   ├── scorer.py         # 5-dimension prompt scoring
│   │   ├── mutator.py        # 6 mutation strategies
│   │   ├── router.py         # LLM provider routing & fallback
│   │   ├── optimizer.py      # Evolution engine loop
│   │   └── generator.py      # Session manager (DB + WS + engine)
│   ├── api/
│   │   ├── routes.py         # REST endpoints
│   │   └── websocket.py      # WebSocket /ws/evolve
│   ├── database/
│   │   ├── models.py         # SQLAlchemy models
│   │   └── crud.py           # Database operations
│   └── utils/
│       ├── validator.py      # Prompt validation & sanitization
│       └── formatter.py      # Score/tree/export formatting
├── frontend/
│   ├── index.html            # HTML shell
│   ├── vite.config.js        # Vite + proxy config
│   ├── tailwind.config.js    # Tailwind design tokens
│   └── src/
│       ├── main.jsx          # React entry point
│       ├── App.jsx           # App shell, phase-based views
│       ├── context/
│       │   └── ThemeContext.jsx
│       ├── store/
│       │   └── useStore.js   # Zustand store
│       ├── hooks/
│       │   ├── useEvolution.js  # WebSocket evolution lifecycle
│       │   ├── useTheme.js      # Theme helpers
│       │   └── useD3Tree.js     # D3 tree layout
│       ├── components/
│       │   ├── ui/
│       │   │   ├── Navbar.jsx
│       │   │   ├── ThemeToggle.jsx
│       │   │   └── LoadingDNA.jsx
│       │   ├── landing/
│       │   │   ├── HeroSection.jsx
│       │   │   └── PromptInput.jsx
│       │   ├── evolution/
│       │   │   ├── StreamingText.jsx
│       │   │   ├── MutationBadge.jsx
│       │   │   ├── ScoreRadar.jsx
│       │   │   ├── GenerationCard.jsx
│       │   │   └── EvolutionTree.jsx
│       │   └── results/
│       │       ├── ScoreTimeline.jsx
│       │       ├── FinalPrompt.jsx
│       │       └── ExportPanel.jsx
│       └── styles/
│           ├── globals.css
│           ├── themes.css
│           └── animations.css
├── README.md
└── .gitignore
```

---

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- [Ollama](https://ollama.ai) installed (for local fallback)

### 1. Clone & Enter

```bash
git clone <repo-url>
cd parinama
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure API keys
copy .env.example .env
# Edit .env with your Groq and Gemini API keys
```

**Get free API keys:**
- **Groq**: [console.groq.com](https://console.groq.com) — sign up, create API key
- **Gemini**: [aistudio.google.com](https://aistudio.google.com) — get API key

### 3. Ollama Setup (Local Fallback)

```bash
# Install Ollama from https://ollama.ai
# Then pull the Mistral model:
ollama pull mistral
```

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Required packages:
npm install react react-dom framer-motion d3 recharts zustand
npm install -D vite @vitejs/plugin-react tailwindcss postcss autoprefixer
```

### 5. Run

**Terminal 1 — Backend:**
```bash
cd backend
venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** — the frontend proxies API/WS calls to port 8000.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Provider status & health check |
| GET | `/api/providers` | Available LLM providers |
| POST | `/api/evolve` | Start evolution (REST, non-streaming) |
| GET | `/api/sessions` | List all sessions |
| GET | `/api/sessions/{id}` | Get session details |
| GET | `/api/sessions/{id}/export` | Export session as JSON |
| DELETE | `/api/sessions/{id}` | Delete session |
| GET | `/api/stats` | Global statistics |
| WS | `/ws/evolve` | WebSocket evolution with streaming |

### WebSocket Messages

**Client → Server:**
```json
{ "type": "evolve", "prompt": "...", "max_generations": 5 }
{ "type": "cancel" }
{ "type": "ping" }
```

**Server → Client:**
```json
{ "type": "evolution_start", "session_id": "...", "max_generations": 5 }
{ "type": "initial_score", "scores": {...}, "overall_score": 72 }
{ "type": "generation_start", "generation": 1, "mutation_type": "CLARIFY" }
{ "type": "token", "content": "..." }
{ "type": "generation_complete", "generation": 1, "scores": {...} }
{ "type": "evolution_complete", "final_prompt": "...", "final_scores": {...} }
{ "type": "llm_switch", "from": "groq", "to": "gemini" }
{ "type": "error", "message": "..." }
```

---

## Mutation Strategies

| Strategy | When Used | What It Does |
|----------|-----------|--------------|
| CLARIFY | Low clarity score | Restructures for logical flow, adds transitions |
| EXPAND | Low specificity | Adds concrete details, examples, constraints |
| COMPRESS | Low conciseness | Removes redundancy, tightens language |
| REFRAME | Low actionability | Restructures as actionable instructions |
| SPECIALIZE | Balanced but mediocre | Adds domain-specific depth |
| HUMANIZE | Low creativity | Adds voice, personality, engaging elements |

---

## Environment Variables

```env
# Required
GROQ_API_KEY=gsk_...          # From console.groq.com
GEMINI_API_KEY=AIza...         # From aistudio.google.com

# Optional
OLLAMA_HOST=http://localhost:11434
DATABASE_URL=sqlite+aiosqlite:///./parinama.db
```

---

## License

MIT

---

<p align="center">
  <em>Built with patience, iteration, and the belief that every prompt can evolve.</em><br/>
  <strong>परिणाम</strong> — transformation through evolution
</p>
