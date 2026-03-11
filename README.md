# 🤖 AI Dashboard — Conversational BI for E-Commerce

> Turn natural language questions into interactive data dashboards instantly — no SQL or BI tool knowledge required.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER BROWSER                            │
│  ┌─────────────────────┐   ┌─────────────────────────────┐  │
│  │   Chat Interface    │   │    Interactive Dashboard    │  │
│  │  (natural language) │   │   (Plotly charts + insight) │  │
│  └──────────┬──────────┘   └──────────────┬──────────────┘  │
│             │   Next.js + Tailwind CSS     │                 │
└─────────────┼─────────────────────────────┼─────────────────┘
              │ REST API                     │ JSON response
              ▼                             ▲
┌─────────────────────────────────────────────────────────────┐
│                   FASTAPI BACKEND                           │
│                                                             │
│  ┌──────────────┐   ┌───────────────┐   ┌───────────────┐  │
│  │  LLM Service │   │  SQL Validator│   │Chart Recommender│ │
│  │ (Gemini API) │   │(query_parser) │   │(chart_recommender)│
│  └──────┬───────┘   └───────┬───────┘   └───────────────┘  │
│         │                   │                               │
│  ┌──────▼───────────────────▼──────┐                       │
│  │         Database Layer          │                       │
│  │  (SQLite + pandas CSV loader)   │                       │
│  └─────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│              GOOGLE GEMINI API                              │
│  Natural language → SQL + Chart config + Insights           │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

| Feature | Description |
|---|---|
| 💬 **Chat Interface** | Type natural language questions, get instant dashboards |
| 📊 **Smart Chart Selection** | Auto-selects bar, line, pie, or scatter based on data type |
| 🔄 **Follow-up Questions** | Chat with the dashboard to filter/alter charts |
| 📁 **CSV Upload** | Upload any CSV and start prompting it immediately |
| 🛡️ **SQL Validation** | All LLM-generated SQL is validated before execution |
| 🎭 **Mock Mode** | Works without a Gemini API key using built-in responses |
| 🌙 **Dark Mode** | Clean, professional dark UI |
| 📱 **Responsive** | Works on desktop and mobile |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.10+
- (Optional) **Google Gemini API key** from [Google AI Studio](https://aistudio.google.com/)

### 1. Clone & Setup Environment

```bash
git clone https://github.com/ACCHU04/E-COMMERCE.git
cd E-COMMERCE

# Copy environment template
cp .env.example backend/.env
# Edit backend/.env and add your GEMINI_API_KEY (optional — app works without it)
```

### 2. Start the Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.
Swagger docs: `http://localhost:8000/docs`

### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## 🐳 Docker (One-Command Setup)

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your GEMINI_API_KEY

# Start everything
docker-compose up --build
```

---

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Optional | Google Gemini API key. Without it, app runs in mock mode. |
| `DB_PATH` | No | SQLite database path (default: `ecommerce.db`) |
| `DATA_DIR` | No | Directory containing CSV files (default: `../data`) |
| `DEFAULT_CSV` | No | Default dataset filename (default: `amazon_sales.csv`) |
| `NEXT_PUBLIC_API_URL` | No | Backend URL for frontend (default: `http://localhost:8000`) |

---

## 📊 Example Queries

### Simple — Category Revenue
> **"What are the total sales by product category?"**

Generates a bar chart and pie chart showing revenue distribution across Books, Fashion, Electronics, Home, Sports, and Beauty categories.

### Medium — Time Series by Region
> **"Show me monthly revenue trends for 2023 broken down by region"**

Generates a multi-series line chart showing month-over-month revenue for each geographical region (North America, Europe, Asia, etc.).

### Complex — Multi-Metric Analysis
> **"Compare the average discount percentage vs average rating across categories, and show which payment method generates the most revenue in North America"**

Generates multiple charts: a scatter/bar chart comparing discount vs rating by category, plus a pie chart of payment method revenue for the North American region.

### Follow-up Questions
After generating any dashboard:
- *"Now filter this to only show Asia"*
- *"Show the same data but for 2022 only"*
- *"Which category has the highest average rating?"*

---

## 📁 Project Structure

```
E-COMMERCE/
├── README.md
├── data/
│   └── amazon_sales.csv          # Synthetic dataset (~1000 rows, 2022-2023)
├── backend/
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── main.py                   # FastAPI app, API endpoints
│   ├── config.py                 # Settings (API keys, DB path)
│   ├── database.py               # SQLite setup, CSV loading, query execution
│   ├── llm_service.py            # Gemini API integration + prompt engineering
│   ├── query_parser.py           # SQL validation & sanitization
│   ├── chart_recommender.py      # Chart type selection heuristics
│   └── models.py                 # Pydantic request/response models
├── frontend/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── Dockerfile
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   └── globals.css
│       ├── components/
│       │   ├── ChatInterface.tsx  # Chat input + message history
│       │   ├── Dashboard.tsx      # Dashboard container
│       │   ├── ChartRenderer.tsx  # Plotly chart wrapper
│       │   ├── FileUpload.tsx     # CSV upload with drag-and-drop
│       │   ├── InsightCard.tsx    # AI insight display
│       │   └── LoadingState.tsx   # Loading animations
│       ├── lib/
│       │   └── api.ts             # API client
│       └── types/
│           └── index.ts           # TypeScript types
├── .env.example
├── .gitignore
└── docker-compose.yml
```

---

## 🔌 API Reference

### `POST /api/query`
Process a natural language query and return dashboard charts.

**Request:**
```json
{
  "query": "Show me monthly revenue trends for 2023",
  "session_id": "optional-session-id"
}
```

**Response:**
```json
{
  "charts": [
    {
      "chart_type": "line",
      "title": "Monthly Revenue Trend 2023",
      "data": [...],
      "x_column": "month",
      "y_column": "total_revenue",
      "description": "..."
    }
  ],
  "insights": "Revenue shows a strong upward trend...",
  "sql_query": "SELECT strftime('%Y-%m', order_date) AS month...",
  "session_id": "abc123",
  "error": null
}
```

### `POST /api/upload`
Upload a CSV file to create a new queryable session.

**Request:** Multipart form with `file` field (CSV only)

**Response:**
```json
{
  "message": "Dataset 'my_data.csv' loaded successfully",
  "columns": ["col1", "col2", ...],
  "row_count": 1500,
  "session_id": "new-uuid",
  "schema_info": [...]
}
```

### `GET /api/schema?session_id=<id>`
Get the schema and sample data for the current/session dataset.

---

## 🧠 How It Works

1. **User types a question** in the chat interface
2. **Frontend sends** the query + session ID to `POST /api/query`
3. **Backend calls Gemini API** with a carefully engineered system prompt that includes:
   - The database schema
   - Chart type selection rules
   - SQL generation guidelines
   - Hallucination prevention instructions
4. **Gemini returns** a JSON object with SQL queries, chart types, and insights
5. **Backend validates** the SQL (only SELECT allowed, no injection patterns)
6. **Backend executes** the SQL against SQLite
7. **Frontend renders** interactive Plotly charts with the returned data

---

## 🛡️ Security & Hallucination Prevention

- **SQL Validation**: Only `SELECT` statements are allowed; INSERT/UPDATE/DELETE/DROP are blocked
- **Comment Injection Prevention**: SQL comments (`--`, `/*`) are rejected
- **Schema-grounded Prompts**: The LLM is always given the actual schema — it cannot invent columns
- **Empty Result Handling**: Charts with no data are silently skipped
- **Error Transparency**: Errors are shown to the user with actionable messages

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS |
| **Charts** | Plotly.js / react-plotly.js |
| **Backend** | Python FastAPI, Uvicorn |
| **LLM** | Google Gemini 1.5 Flash |
| **Database** | SQLite (via Python sqlite3 + pandas) |
| **Deployment** | Docker + docker-compose |

---

## 📸 Screenshots

*Run the app locally to see it in action!*

---

## 📄 License

MIT