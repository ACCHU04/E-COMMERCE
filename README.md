# AI Dashboard - Conversational BI for E-Commerce

Turn natural-language questions into interactive dashboards, insights, and exports in seconds.

## What Is Included

- Conversational analytics with follow-up questions
- Interactive Plotly charts (bar, line, pie, scatter)
- Smart clarification flow when a query is ambiguous
- Query planning + confidence indicators
- Executive summary cards for decision-making
- Upload support for CSV, JSON, XLSX/XLS
- Session-aware query history and replay
- Multi-view frontend workspace (Overview, Analytics, Reports, History, Settings)
- Real PDF export from dashboard views (jsPDF + html2canvas)
- JSON and CSV export options from dashboard/session data

## Architecture

- Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS
- Backend: FastAPI + pandas + SQLite
- LLM: Google Gemini (with schema-grounded prompting + SQL safety validation)
- Infra: Local run or Docker Compose

## Quick Start (Local)

### Prerequisites

- Node.js 18+
- Python 3.10+
- Optional: GEMINI_API_KEY

### 1. Backend

```bash
cd backend
python -m venv .venv

# Windows PowerShell
.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend docs: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend app: http://localhost:3000

## Docker Run

1. Create root `.env` with a valid `GEMINI_API_KEY` (or omit to use mock fallback behavior where applicable).
2. Run:

```bash
docker compose up --build
```

Frontend: http://localhost:3000  
Backend: http://localhost:8000/docs

## Environment Variables

### Backend

- `GEMINI_API_KEY` (optional but recommended)
- `DB_PATH` (optional)
- `DATA_DIR` (optional)
- `DEFAULT_CSV` (optional)

### Frontend

- `NEXT_PUBLIC_API_URL` (optional, default: http://localhost:8000)
- `INTERNAL_API_URL` (used in Docker server-side requests)

## Core User Flows

### 1. Ask a Question

Examples:

- What are the total sales by product category?
- Show monthly revenue trend
- Which region has the highest revenue?
- Show top 5 performers

### 2. Refine with Follow-Ups

Examples:

- Change this to line chart
- Filter this to Asia
- Show only Q3

### 3. Export Results

- Top bar: Export PDF
- Dashboard: Export JSON / CSV / Print
- Reports view: session JSON + dashboard PDF

## API Summary

### POST `/api/query`

Request:

```json
{
  "query": "Show monthly revenue by region",
  "session_id": "optional"
}
```

Response includes fields such as:

- `charts`
- `insights`
- `sql_query`
- `confidence`
- `query_plan`
- `clarification_needed`
- `clarification_question`
- `clarification_options`
- `executive_summary`
- `session_id`
- `error`

### POST `/api/upload`

Multipart upload for dataset files.

Supported file types:

- `.csv`
- `.json`
- `.xlsx`
- `.xls`

Response includes dataset profile metadata:

- `columns`
- `row_count`
- `dataset_profile`
- `session_id`

## Frontend UI Notes (Current)

- Ambient dark intelligence theme
- Sidebar section switching with persistent in-session context
- Analytics-focused view for exploration
- Reports view for export workflows
- History view with replayable prompts and message log
- Settings view with session stats

## Project Structure

```text
E-COMMERCE/
|- README.md
|- docker-compose.yml
|- backend/
|  |- main.py
|  |- models.py
|  |- database.py
|  |- query_parser.py
|  |- llm_service.py
|  |- chart_recommender.py
|  |- requirements.txt
|- frontend/
|  |- package.json
|  |- src/
|  |  |- app/
|  |  |  |- page.tsx
|  |  |  |- layout.tsx
|  |  |  |- globals.css
|  |  |- components/
|  |  |  |- ChatInterface.tsx
|  |  |  |- Dashboard.tsx
|  |  |  |- ChartRenderer.tsx
|  |  |  |- FileUpload.tsx
|  |  |  |- InsightCard.tsx
|  |  |  |- LoadingState.tsx
|  |  |- lib/
|  |  |  |- api.ts
|  |  |- types/
|  |     |- index.ts
|- data/
|  |- amazon_sales.csv
```

## Security and Reliability

- SQL allowlist (SELECT-only)
- Injection/comment blocking
- Schema-aware SQL validation against known columns
- LLM output normalization + retry/repair strategy
- Graceful empty/error handling in UI

## License

MIT
