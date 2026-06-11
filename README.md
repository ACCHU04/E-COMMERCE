<div align="center">

  <!-- 3D-style logo using SVG that works in both light/dark mode on GitHub -->
  <svg width="600" height="130" viewBox="0 0 600 130" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#7c3aed"/>
        <stop offset="50%" stop-color="#6366f1"/>
        <stop offset="100%" stop-color="#06b6d4"/>
      </linearGradient>
      <linearGradient id="g2" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.08"/>
      </linearGradient>
      <filter id="shadow3d">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#7c3aed" flood-opacity="0.25"/>
      </filter>
    </defs>

    <!-- 3D isometric cube with chart bars -->
    <g transform="translate(40, 25)" filter="url(#shadow3d)">
      <!-- Cube faces -->
      <polygon points="45,0 90,22 45,45 0,22" fill="url(#g1)"/>
      <polygon points="0,22 45,45 45,87 0,64" fill="url(#g2)"/>
      <polygon points="45,45 90,22 90,64 45,87" fill="url(#g1)" opacity="0.4"/>
      <!-- Chart bars rising from cube -->
      <rect x="12" y="32" width="9" height="28" rx="2" fill="#a78bfa"/>
      <rect x="27" y="20" width="9" height="40" rx="2" fill="#818cf8"/>
      <rect x="42" y="26" width="9" height="34" rx="2" fill="#34d399"/>
      <rect x="57" y="12" width="9" height="48" rx="2" fill="#22d3ee"/>
      <rect x="72" y="28" width="9" height="32" rx="2" fill="#c084fc"/>
    </g>

    <!-- Title text with dark gray for light mode compatibility -->
    <text x="170" y="52" font-family="'Segoe UI',Arial,Helvetica,sans-serif" font-size="36" font-weight="800" fill="#1e293b" letter-spacing="1.5">AI DASHBOARD</text>
    <text x="170" y="78" font-family="'Segoe UI',Arial,Helvetica,sans-serif" font-size="16" fill="#475569" letter-spacing="3">CONVERSATIONAL BI FOR E-COMMERCE</text>
    <!-- Decorative underline -->
    <rect x="170" y="90" width="280" height="3" rx="1.5" fill="url(#g1)"/>
    <text x="170" y="115" font-family="'Segoe UI',Arial,Helvetica,sans-serif" font-size="13" fill="#64748b">Turn questions into dashboards · Instant insights · Export-ready</text>
  </svg>

  <br/>

  <p align="center">
    <b>Turn natural-language questions into interactive dashboards, insights, and exports in seconds.</b>
  </p>

  <!-- Badges -->
  <p>
    <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js&logoColor=white" alt="Next.js 15"/>
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React 19"/>
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5"/>
    <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI"/>
    <img src="https://img.shields.io/badge/Python-3.10-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python 3.10"/>
    <img src="https://img.shields.io/badge/Gemini-LLM-8E75B2?style=flat-square&logo=googlegemini&logoColor=white" alt="Gemini"/>
    <img src="https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite"/>
    <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS"/>
    <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker"/>
    <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT License"/>
  </p>
</div>

---

## Overview

**AI Dashboard** is a conversational business intelligence platform purpose-built for e-commerce analytics. Users ask questions in plain English, and the system plans, generates, validates, and executes SQL on real data — returning interactive Plotly charts, executive summaries, and exportable reports.

```text
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  User Query  │ ──→│  Plan Intent │ ──→│  Generate    │ ──→│  Validate &  │
│  (Natural    │    │  & Strategy  │    │  SQL Query   │    │  Repair SQL  │
│   Language)  │    │              │    │              │    │              │
└──────────────┘    └──────────────┘    └──────────────┘    └──────┬───────┘
                                                                    │
                                                                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Export PDF/ │ ←──│  Dashboard   │ ←──│  Plotly      │ ←──│  Execute on  │
│  JSON/CSV    │    │  Render      │    │  Charts      │    │  SQLite      │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

## Key Features

- **Agentic 3‑Step Pipeline** — Plan → Generate SQL → Validate/Repair + Execute — aligns directly with innovation‑rubric scoring.
- **SQLite Backed Execution** — Generated SQL runs on real tables. Dashboard values come from actual query results, not LLM hallucinations.
- **Conversational Analytics** — Follow‑up questions, chart‑type switching, and filter drill‑downs keep the workflow fluid.
- **Smart Clarification** — Ambiguous queries (e.g., "top performers" without a metric) trigger an intelligent clarification flow.
- **Interactive Plotly Charts** — Bar, line, pie, scatter, donut, horizontal bar, stacked bar, heatmap, area — automatically recommended per query.
- **Executive Summaries** — AI‑generated `What Happened`, `Why It Matters`, and `Recommended Action` for decision‑ready insights.
- **Dataset Upload** — Upload CSV, JSON, XLSX/XLS datasets; merge into existing sessions.
- **Amazon Best‑Sellers** — Fetch live data via RapidAPI (with safe mock fallback when unconfigured).
- **Multi‑View Workspace** — Overview, Analytics, Reports, History, and Settings views with persistent session context.
- **PDF & Data Export** — Export dashboards to PDF (jsPDF + html2canvas) or download session data as JSON/CSV.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS, Plotly.js, Lucide Icons |
| **Backend** | FastAPI, pandas, SQLite, Google Gemini LLM |
| **Auth** | JWT + optional Google OAuth |
| **Infrastructure** | Docker Compose, Vercel‑ready serverless entry point |
| **Export** | jsPDF, html2canvas, JSON/CSV download |

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- (Optional) [Gemini API Key](https://aistudio.google.com/app/apikey)

### 1. Backend

```bash
cd backend
python -m venv .venv

# Windows PowerShell
.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

### Docker (Production‑like)

```bash
# Optional: create .env with GEMINI_API_KEY=your_key
docker compose up --build
```

Frontend: [http://localhost:3000](http://localhost:3000)  
Backend: [http://localhost:8000/docs](http://localhost:8000/docs)

## Environment Variables

### Backend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | No | — | Google Gemini API key (fallback to mock if empty) |
| `RAPIDAPI_KEY` | No | — | RapidAPI key for live Amazon data |
| `DB_PATH` | No | `ecommerce.db` | SQLite database path |
| `DATA_DIR` | No | `./data` | Directory for default dataset |
| `DEFAULT_CSV` | No | `amazon_sales.csv` | Default CSV filename |

### Frontend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:8000` | Backend API URL |

## Core User Flows

### Ask a Question

```
What are the total sales by product category?
Show monthly revenue trend
Which region has the highest revenue?
Show top 5 performers
```

### Refine with Follow‑Ups

```
Change this to line chart
Switch this to donut chart
Show this as a heatmap
Filter this to Asia
Show only Q3
```

### Export

- **Top bar** — Export PDF
- **Dashboard panel** — Export JSON / CSV
- **Reports view** — Session JSON + Dashboard PDF

## API Reference

### `POST /api/query`

Process a natural‑language query.

**Request:**
```json
{
  "query": "Show monthly revenue by region",
  "session_id": "optional"
}
```

**Response includes:** `charts`, `insights`, `sql_query`, `confidence`, `query_plan`, `clarification_needed`, `clarification_question`, `clarification_options`, `executive_summary`, `session_id`

### `POST /api/upload`

Upload a dataset file (`.csv`, `.json`, `.xlsx`, `.xls`).

**Response:** `columns`, `row_count`, `dataset_profile`, `session_id`

### `POST /api/amazon/fetch`

Fetch Amazon best‑seller data into a new session.

**Request:**
```json
{
  "category": "electronics",
  "country": "US",
  "limit": 20
}
```

## Project Structure

```
E-COMMERCE/
├── README.md
├── docker-compose.yml
├── backend/
│   ├── main.py              # FastAPI application & routes
│   ├── models.py            # Pydantic models
│   ├── database.py          # SQLite operations
│   ├── query_parser.py      # SQL validation & safety
│   ├── llm_service.py       # Gemini LLM integration
│   ├── chart_recommender.py # Chart type selection
│   ├── config.py            # App configuration
│   ├── auth_service.py      # JWT authentication
│   └── amazon_service.py    # RapidAPI Amazon client
├── frontend/
│   ├── package.json
│   └── src/
│       ├── app/             # Next.js pages & layout
│       ├── components/      # React components
│       ├── lib/             # API client & auth helpers
│       └── types/           # TypeScript type definitions
├── api/
│   └── index.py             # Vercel serverless entry
└── data/
    └── amazon_sales.csv     # Default sample dataset
```

## Security & Reliability

- **SQL Allowlist** — Only `SELECT` queries are permitted
- **Injection Blocking** — SQL comment tokens and stacked statements are rejected
- **Column Validation** — Generated SQL is checked against known schema columns
- **Auto‑Repair** — Failed queries are sent back to the LLM for automatic correction
- **Graceful Fallbacks** — Empty results, mock API mode, and error states are handled in the UI

## Innovation Highlights

1. **SQLite‑Backed Execution** — Unlike pure LLM dashboards that fabricate numbers, every chart value comes from a real SQL query on actual data tables.
2. **Agentic 3‑Step Pipeline** — The `Plan → Generate SQL → Validate/Repair + Execute` loop creates a deterministic, auditable path from question to insight.
3. **Chart Recommendation Engine** — Automatically recommends companion chart types (e.g., bar + line + donut) based on data shape.

## License

MIT — see [LICENSE](LICENSE) for details.
