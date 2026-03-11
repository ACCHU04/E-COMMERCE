import os
import uuid
import tempfile
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from models import QueryRequest, QueryResponse, SchemaResponse, UploadResponse, ChartData
from database import init_default_db, execute_query, get_schema, load_csv_for_session
from llm_service import generate_dashboard, DEFAULT_SCHEMA_CONTEXT
from query_parser import validate_sql, clean_sql
from chart_recommender import recommend_chart

app = FastAPI(
    title="E-Commerce BI Dashboard API",
    description="Conversational AI for Instant Business Intelligence Dashboards",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory conversation history per session
_conversation_history: dict[str, list[dict]] = {}
# Schema context per session (for uploaded datasets)
_session_schema_context: dict[str, str] = {}


@app.on_event("startup")
async def startup():
    init_default_db()
    print(f"[API] Server started. Mock mode: {settings.mock_mode}")


@app.get("/health")
async def health():
    return {"status": "ok", "mock_mode": settings.mock_mode}


@app.get("/api/schema", response_model=SchemaResponse)
async def api_schema(session_id: str | None = None):
    """Get the schema of the current dataset."""
    try:
        return get_schema(session_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/query", response_model=QueryResponse)
async def api_query(request: QueryRequest):
    """Process a natural language query and return dashboard charts."""
    session_id = request.session_id or str(uuid.uuid4())

    # Get conversation history for this session
    history = _conversation_history.get(session_id, [])

    # Get schema context (custom for uploaded datasets, default for base dataset)
    schema_context = _session_schema_context.get(session_id, DEFAULT_SCHEMA_CONTEXT)

    # Call LLM to generate dashboard config
    llm_response = await generate_dashboard(
        user_query=request.query,
        schema_context=schema_context,
        conversation_history=history,
    )

    # Handle LLM-level errors
    if llm_response.get("error"):
        return QueryResponse(
            charts=[],
            insights=llm_response.get("insights", ""),
            sql_query="",
            session_id=session_id,
            error=llm_response["error"],
        )

    charts_raw = llm_response.get("charts", [])
    insights = llm_response.get("insights", "")
    executed_charts = []
    last_sql = ""

    for chart_spec in charts_raw:
        raw_sql = chart_spec.get("sql", "")
        sql = clean_sql(raw_sql)
        last_sql = sql

        # Validate SQL
        is_valid, validation_error = validate_sql(sql)
        if not is_valid:
            continue  # Skip invalid charts

        # Execute query
        try:
            data = execute_query(sql, session_id)
        except Exception as e:
            continue  # Skip charts with execution errors

        if not data:
            continue  # Skip empty result sets

        # Determine chart type
        chart_type = recommend_chart(
            chart_type_hint=chart_spec.get("chart_type", "bar"),
            data=data,
            x_col=chart_spec.get("x_column"),
            y_col=chart_spec.get("y_column"),
            color_col=chart_spec.get("color_column"),
        )

        executed_charts.append(ChartData(
            chart_type=chart_type,
            title=chart_spec.get("title", "Chart"),
            data=data,
            x_column=chart_spec.get("x_column"),
            y_column=chart_spec.get("y_column"),
            color_column=chart_spec.get("color_column"),
            labels_column=chart_spec.get("labels_column"),
            values_column=chart_spec.get("values_column"),
            description=chart_spec.get("description", ""),
        ))

    # Update conversation history
    history.append({"role": "user", "content": request.query})
    history.append({"role": "assistant", "content": insights})
    _conversation_history[session_id] = history[-20:]  # Keep last 10 exchanges

    error_msg = None
    if not executed_charts:
        error_msg = "No charts could be generated for this query. Try rephrasing or asking a different question."

    return QueryResponse(
        charts=executed_charts,
        insights=insights,
        sql_query=last_sql,
        session_id=session_id,
        error=error_msg,
    )


@app.post("/api/upload", response_model=UploadResponse)
async def api_upload(file: UploadFile = File(...)):
    """Upload a CSV file and create a new session for it."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    session_id = str(uuid.uuid4())

    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        schema = load_csv_for_session(tmp_path, session_id)

        # Build schema context string for LLM
        col_descriptions = "\n".join([
            f"- {col.name} ({col.type}): sample values: {', '.join(str(v) for v in col.sample_values[:3])}"
            for col in schema.columns
        ])
        schema_context = f"""
Table name: sales_data
Columns:
{col_descriptions}

Total rows: {schema.row_count}
"""
        _session_schema_context[session_id] = schema_context

        return UploadResponse(
            message=f"Dataset '{file.filename}' loaded successfully",
            columns=[col.name for col in schema.columns],
            row_count=schema.row_count,
            session_id=session_id,
            schema_info=schema.columns,
        )
    finally:
        os.unlink(tmp_path)
