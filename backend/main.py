import os
import re
import uuid
import tempfile
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from models import AmazonFetchRequest, QueryRequest, QueryResponse, SchemaResponse, UploadResponse, ChartData, QueryPlan, ExecutiveSummary
from database import init_default_db, execute_query, get_schema, load_csv_for_session, merge_csv_into_session, load_records_for_session, merge_records_into_session, get_dataset_profile
from llm_service import generate_dashboard, repair_sql_query, DEFAULT_SCHEMA_CONTEXT
from query_parser import validate_sql, validate_sql_columns, clean_sql
from chart_recommender import recommend_chart
from amazon_service import fetch_amazon_best_sellers

app = FastAPI(
    title="E-Commerce BI Dashboard API",
    description="Conversational AI for Instant Business Intelligence Dashboards",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory conversation history per session
_conversation_history: dict[str, list[dict]] = {}
# Schema context per session (for uploaded datasets)
_session_schema_context: dict[str, str] = {}
# Keep last successful dashboard per session for follow-up command transforms
_session_last_dashboard: dict[str, dict] = {}


def _build_query_plan(intent: str, chart_strategy: list[str], assumptions: list[str], warnings: list[str]) -> QueryPlan:
    return QueryPlan(
        intent=intent,
        chart_strategy=chart_strategy,
        assumptions=assumptions,
        warnings=warnings,
    )


def _detect_clarification_need(user_query: str) -> tuple[bool, str | None, list[str]]:
    q = user_query.lower()

    asks_quarter = bool(re.search(r"\bq[1-4]\b|\bquarter\b", q))
    has_year = bool(re.search(r"\b(20\d{2})\b", q))
    if asks_quarter and not has_year:
        return (
            True,
            "You mentioned a quarter but not a year. Which year should I use?",
            ["Use 2022", "Use 2023", "Compare 2022 vs 2023"],
        )

    asks_top = any(token in q for token in ["top", "best", "highest", "top-performing"])
    has_metric = any(token in q for token in [
        "revenue",
        "sales",
        "profit",
        "rating",
        "quantity",
        "discount",
        "review",
        "reviews",
        "review count",
        "price",
    ])
    if asks_top and not has_metric:
        return (
            True,
            "What metric should define top performance?",
            ["By revenue", "By quantity sold", "By average rating"],
        )

    return False, None, []


def _try_followup_chart_transform(user_query: str, session_id: str) -> tuple[list[ChartData] | None, str | None]:
    last_dashboard = _session_last_dashboard.get(session_id)
    if not last_dashboard:
        return None, None

    q = user_query.lower().strip()
    target = None
    transform_targets = {
        "horizontal bar": "horizontal_bar",
        "stacked bar": "stacked_bar",
        "heatmap": "heatmap",
        "donut": "donut",
        "area": "area",
        "bar": "bar",
        "line": "line",
        "pie": "pie",
        "scatter": "scatter",
    }
    if re.search(r"\b(change|convert|switch)\b", q):
        for phrase, normalized in transform_targets.items():
            if phrase in q:
                target = normalized
                break

    if not target:
        match = re.search(r"\b(change|convert|switch)\b.*\b(bar|line|pie|scatter)\b", q)
        if match:
            target = match.group(2)
    if not target:
        return None, None

    transformed = []
    for chart in last_dashboard.get("charts", []):
        transformed.append(ChartData(
            chart_type=target,
            title=f"{chart.title} ({target.title()} View)",
            data=chart.data,
            x_column=chart.x_column,
            y_column=chart.y_column,
            color_column=chart.color_column,
            labels_column=chart.labels_column,
            values_column=chart.values_column,
            description=chart.description,
        ))

    return transformed, target


def _try_followup_filter(user_query: str, session_id: str) -> tuple[list[ChartData] | None, str | None, str | None]:
    last_dashboard = _session_last_dashboard.get(session_id)
    if not last_dashboard:
        return None, None, None

    q = user_query.lower().strip()
    if "filter" not in q and "only show" not in q:
        return None, None, None

    match = re.search(r"(?:only show|filter(?:\s+this)?(?:\s+to)?)(?:\s+by)?\s+(.+)$", q)
    if not match:
        return None, None, None

    raw_value = match.group(1).strip(" .,!?:;\"'")
    raw_value = re.sub(r"^(only\s+show|show|by)\s+", "", raw_value).strip()
    if not raw_value:
        return None, None, None

    filtered_charts: list[ChartData] = []
    for chart in last_dashboard.get("charts", []):
        filtered_rows = []
        for row in chart.data:
            row_values = [str(v).lower() for v in row.values() if v is not None]
            if any(raw_value in val for val in row_values):
                filtered_rows.append(row)

        if filtered_rows:
            filtered_charts.append(ChartData(
                chart_type=chart.chart_type,
                title=f"{chart.title} (Filtered: {raw_value})",
                data=filtered_rows,
                x_column=chart.x_column,
                y_column=chart.y_column,
                color_column=chart.color_column,
                labels_column=chart.labels_column,
                values_column=chart.values_column,
                description=chart.description,
            ))

    if not filtered_charts:
        return [], raw_value, "No rows matched the requested filter in the current dashboard output."
    return filtered_charts, raw_value, None


def _build_executive_summary(charts: list[ChartData], insights: str, query: str) -> ExecutiveSummary:
    if not charts:
        return ExecutiveSummary(
            what_happened="No chartable result was returned for this query.",
            why_it_matters="The request may be too broad or not fully supported by the current dataset schema.",
            recommended_action="Refine the query with specific metrics, dimensions, and timeframe.",
        )

    first_chart = charts[0]
    top_row = first_chart.data[0] if first_chart.data else {}
    top_pair = ""
    if isinstance(top_row, dict) and top_row:
        first_key = next(iter(top_row.keys()))
        top_pair = f"Top observed item is {first_key}={top_row.get(first_key)}"

    what_happened = f"Generated {len(charts)} chart(s) for: '{query}'. {top_pair}".strip()
    why_it_matters = insights[:220] if insights else "This view highlights performance distribution and trend direction for faster executive decisions."
    recommended_action = "Use follow-up prompts to drill down by region, year, or product category before taking budget or inventory actions."

    return ExecutiveSummary(
        what_happened=what_happened,
        why_it_matters=why_it_matters,
        recommended_action=recommended_action,
    )


def _recommended_companion_types(chart_type: str) -> list[str]:
    normalized = chart_type.lower()
    if normalized in {"bar", "horizontal_bar", "stacked_bar"}:
        return ["horizontal_bar", "stacked_bar", "line", "area", "pie", "donut", "scatter"]
    if normalized in {"line", "area"}:
        return ["area", "line", "bar", "scatter", "pie", "donut"]
    if normalized in {"pie", "donut"}:
        return ["donut", "pie", "bar", "horizontal_bar"]
    if normalized == "scatter":
        return ["line", "bar", "area"]
    if normalized == "heatmap":
        return ["bar", "stacked_bar", "line"]
    return ["bar", "line", "pie", "scatter"]


def _build_chart_variant(base: ChartData, chart_type: str) -> ChartData | None:
    x_col = base.x_column or base.labels_column
    y_col = base.y_column or base.values_column
    labels_col = base.labels_column or base.x_column
    values_col = base.values_column or base.y_column

    if chart_type in {"bar", "line", "scatter", "area", "horizontal_bar", "stacked_bar"}:
        if not x_col or not y_col:
            return None
        return ChartData(
            chart_type=chart_type,
            title=f"{base.title} ({chart_type.replace('_', ' ').title()} View)",
            data=base.data,
            x_column=x_col,
            y_column=y_col,
            color_column=base.color_column,
            labels_column=None,
            values_column=None,
            description=base.description,
        )

    if chart_type in {"pie", "donut"}:
        if not labels_col or not values_col:
            return None
        return ChartData(
            chart_type=chart_type,
            title=f"{base.title} ({chart_type.title()} View)",
            data=base.data,
            x_column=None,
            y_column=None,
            color_column=base.color_column,
            labels_column=labels_col,
            values_column=values_col,
            description=base.description,
        )

    if chart_type == "heatmap":
        if not x_col or not y_col:
            return None
        return ChartData(
            chart_type=chart_type,
            title=f"{base.title} (Heatmap View)",
            data=base.data,
            x_column=x_col,
            y_column=y_col,
            color_column=base.color_column,
            labels_column=None,
            values_column=values_col,
            description=base.description,
        )

    return None


def _expand_chart_recommendations(charts: list[ChartData], max_total: int = 6) -> list[ChartData]:
    if not charts:
        return []

    expanded: list[ChartData] = []
    seen_keys: set[tuple[str, str | None, str | None, str | None, str | None]] = set()

    for base in charts:
        candidate_types = [base.chart_type] + _recommended_companion_types(base.chart_type)
        for chart_type in candidate_types:
            variant = _build_chart_variant(base, chart_type)
            if not variant:
                continue

            dedupe_key = (
                variant.chart_type,
                variant.x_column,
                variant.y_column,
                variant.labels_column,
                variant.values_column,
            )
            if dedupe_key in seen_keys:
                continue

            seen_keys.add(dedupe_key)
            expanded.append(variant)
            if len(expanded) >= max_total:
                return expanded

    return expanded


def _cache_schema_context(session_id: str, schema: SchemaResponse) -> None:
    col_descriptions = "\n".join([
        f"- {col.name} ({col.type}): sample values: {', '.join(str(v) for v in col.sample_values[:3])}"
        for col in schema.columns
    ])
    sample_rows_json = schema.sample_data[:3]
    schema_context = f"""
Table name: sales_data
Columns:
{col_descriptions}

Total rows: {schema.row_count}
    Sample rows (first 3): {sample_rows_json}
"""
    _session_schema_context[session_id] = schema_context


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
    schema_info = get_schema(session_id)
    allowed_columns = {col.name.lower() for col in schema_info.columns}

    clarification_needed, clarification_question, clarification_options = _detect_clarification_need(request.query)
    if clarification_needed:
        return QueryResponse(
            charts=[],
            insights="I need one clarification before I can generate accurate charts.",
            sql_query="",
            session_id=session_id,
            error=None,
            confidence=0.2,
            query_plan=_build_query_plan(
                intent="Clarify ambiguous query before SQL generation",
                chart_strategy=[],
                assumptions=[],
                warnings=["Ambiguous timeframe or ranking metric detected."],
            ),
            clarification_needed=True,
            clarification_question=clarification_question,
            clarification_options=clarification_options,
        )

    transformed_charts, target_chart = _try_followup_chart_transform(request.query, session_id)
    if transformed_charts is not None and target_chart is not None:
        return QueryResponse(
            charts=transformed_charts,
            insights=f"Converted the previous dashboard to {target_chart} chart(s) as requested.",
            sql_query=_session_last_dashboard[session_id].get("sql_query", ""),
            session_id=session_id,
            error=None,
            confidence=0.95,
            query_plan=_build_query_plan(
                intent="Follow-up command: transform chart type from previous dashboard",
                chart_strategy=[f"Render previous query output as {target_chart} chart(s)"],
                assumptions=["Data semantics remain unchanged; only visualization changed."],
                warnings=[],
            ),
            executive_summary=_build_executive_summary(
                transformed_charts,
                f"Converted visualization to {target_chart}.",
                request.query,
            ),
        )

    filtered_charts, filter_value, filter_error = _try_followup_filter(request.query, session_id)
    if filtered_charts is not None and filter_value is not None:
        return QueryResponse(
            charts=filtered_charts,
            insights=(
                f"Applied filter '{filter_value}' to the previous dashboard."
                if not filter_error else
                "Tried to apply your filter, but no rows matched in the current dashboard output."
            ),
            sql_query=_session_last_dashboard[session_id].get("sql_query", ""),
            session_id=session_id,
            error=filter_error,
            confidence=0.88 if not filter_error else 0.45,
            query_plan=_build_query_plan(
                intent="Follow-up command: filter previous dashboard result",
                chart_strategy=[f"Client-side filter applied with token '{filter_value}'"],
                assumptions=["Filter matches text values currently visible in chart data."],
                warnings=[filter_error] if filter_error else [],
            ),
            executive_summary=_build_executive_summary(
                filtered_charts,
                f"Filtered dashboard to '{filter_value}'.",
                request.query,
            ),
        )

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
    warnings: list[str] = []

    for chart_spec in charts_raw:
        raw_sql = chart_spec.get("sql", "")
        sql = clean_sql(raw_sql)
        last_sql = sql

        # Validate SQL
        is_valid, validation_error = validate_sql(sql)
        if not is_valid:
            if validation_error:
                warnings.append(f"Skipped invalid SQL: {validation_error}")
            continue  # Skip invalid charts

        # Hallucination guard: ensure SQL references only known columns
        cols_ok, cols_error = validate_sql_columns(sql, allowed_columns)
        if not cols_ok:
            if cols_error:
                warnings.append(cols_error)
            continue

        # Execute query
        try:
            data = execute_query(sql, session_id)
        except Exception as e:
            # Auto-repair loop: ask LLM to fix SQL once using execution error details.
            repaired_sql = await repair_sql_query(
                user_query=request.query,
                failed_sql=sql,
                execution_error=str(e),
                schema_context=schema_context,
            )

            if repaired_sql:
                repaired_sql = clean_sql(repaired_sql)
                valid_repair, repair_err = validate_sql(repaired_sql)
                cols_ok_repair, cols_err_repair = validate_sql_columns(repaired_sql, allowed_columns)
                if valid_repair and cols_ok_repair:
                    try:
                        data = execute_query(repaired_sql, session_id)
                        sql = repaired_sql
                        last_sql = repaired_sql
                    except Exception as retry_error:
                        warnings.append(f"Retry SQL failed: {str(retry_error)}")
                        continue
                else:
                    merged_error = repair_err or cols_err_repair or "Repaired SQL failed validation"
                    warnings.append(f"Retry validation failed: {merged_error}")
                    continue
            else:
                warnings.append(f"Query execution failed and was skipped: {str(e)}")
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

    expanded_charts = _expand_chart_recommendations(executed_charts)

    error_msg = None
    if not expanded_charts:
        error_msg = "No charts could be generated for this query. Try rephrasing or asking a different question."

    chart_strategy = [
        f"{chart.chart_type} chart: {chart.title}"
        for chart in expanded_charts
    ]
    assumptions = []
    if re.search(r"\bnow\b|\bsame\b|\bfilter\b", request.query.lower()):
        assumptions.append("Follow-up interpreted using session conversation context.")

    confidence = 0.9
    if warnings:
        confidence -= min(0.4, len(warnings) * 0.1)
    if error_msg:
        confidence = min(confidence, 0.35)
    confidence = max(0.05, round(confidence, 2))

    response_insights = insights
    if expanded_charts and len(expanded_charts) > len(executed_charts):
        response_insights = (
            f"{insights} Added {len(expanded_charts) - len(executed_charts)} companion chart recommendations "
            "to show this answer in multiple graph views."
        ).strip()

    if expanded_charts:
        _session_last_dashboard[session_id] = {
            "charts": expanded_charts,
            "sql_query": last_sql,
        }

    return QueryResponse(
        charts=expanded_charts,
        insights=response_insights,
        sql_query=last_sql,
        session_id=session_id,
        error=error_msg,
        confidence=confidence,
        query_plan=_build_query_plan(
            intent=f"Answer: {request.query}",
            chart_strategy=chart_strategy,
            assumptions=assumptions,
            warnings=warnings,
        ),
        executive_summary=_build_executive_summary(expanded_charts, response_insights, request.query),
    )


@app.post("/api/upload", response_model=UploadResponse)
async def api_upload(
    file: UploadFile = File(...),
    session_id: str | None = Form(default=None),
    merge_into_session: str | None = Form(default="false"),
):
    """Upload a CSV file and create a new session for it."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="A file is required")

    lowered_name = file.filename.lower()
    allowed_ext = (".csv", ".json", ".xlsx", ".xls")
    if not lowered_name.endswith(allowed_ext):
        raise HTTPException(status_code=400, detail="Supported file types: CSV, JSON, XLSX")

    requested_session = (session_id or "").strip()
    active_session_id = requested_session or str(uuid.uuid4())
    merge_requested = str(merge_into_session or "false").strip().lower() in {"1", "true", "yes", "on"}

    # Save uploaded file temporarily
    extension = os.path.splitext(file.filename)[1] or ".csv"
    with tempfile.NamedTemporaryFile(suffix=extension, delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        do_merge = bool(merge_requested and requested_session)
        if do_merge:
            schema = merge_csv_into_session(tmp_path, active_session_id)
        else:
            schema = load_csv_for_session(tmp_path, active_session_id)

        _cache_schema_context(active_session_id, schema)

        action_label = "merged into current session" if do_merge else "loaded successfully"

        return UploadResponse(
            message=f"Dataset '{file.filename}' {action_label}",
            columns=[col.name for col in schema.columns],
            row_count=schema.row_count,
            session_id=active_session_id,
            source_mode="uploaded",
            schema_info=schema.columns,
            dataset_profile=get_dataset_profile(active_session_id),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to process CSV file")
    finally:
        os.unlink(tmp_path)


@app.post("/api/amazon/fetch", response_model=UploadResponse)
async def api_amazon_fetch(request: AmazonFetchRequest):
    """Fetch Amazon best-seller data via RapidAPI (or mock fallback) and load it as a session dataset."""
    requested_session = (request.session_id or "").strip()
    session_id = requested_session or str(uuid.uuid4())

    category = (request.category or "electronics").strip().lower()
    country = (request.country or "US").strip().upper()
    limit = max(5, min(int(request.limit or 20), 50))

    try:
        records, source_mode = await fetch_amazon_best_sellers(
            category=category,
            country=country,
            limit=limit,
        )

        do_merge = bool(request.merge_into_session and requested_session)
        if do_merge:
            schema = merge_records_into_session(records, session_id)
        else:
            schema = load_records_for_session(records, session_id)

        _cache_schema_context(session_id, schema)

        source_label = "live RapidAPI" if source_mode == "live" else "mock fallback"
        action_label = "merged into current session" if do_merge else "loaded"
        return UploadResponse(
            message=f"Amazon '{category}' dataset {action_label} ({source_label})",
            columns=[col.name for col in schema.columns],
            row_count=schema.row_count,
            session_id=session_id,
            source_mode=source_mode,
            schema_info=schema.columns,
            dataset_profile=get_dataset_profile(session_id),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch Amazon data: {str(e)}")
