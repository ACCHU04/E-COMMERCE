from typing import Any


def recommend_chart(
    chart_type_hint: str,
    data: list[dict[str, Any]],
    x_col: str | None,
    y_col: str | None,
    color_col: str | None,
) -> str:
    """
    Validate or override the LLM-suggested chart type based on data characteristics.
    Returns the final recommended chart type.
    """
    if not data:
        return "bar"

    hint = (chart_type_hint or "bar").lower().strip()

    # Map aliases
    alias_map = {
        "donut": "pie",
        "column": "bar",
        "histogram": "bar",
        "time_series": "line",
        "timeseries": "line",
        "area": "line",
    }
    hint = alias_map.get(hint, hint)

    valid_types = {"bar", "line", "pie", "scatter"}
    if hint not in valid_types:
        hint = "bar"

    # Heuristic overrides
    if x_col and _is_date_column(x_col, data):
        # Time series data should use line chart
        if hint not in ("line", "bar"):
            return "line"

    if not color_col and y_col:
        row_count = len(data)
        # Too many categories for pie chart → switch to bar
        if hint == "pie" and row_count > 8:
            return "bar"

    return hint


def _is_date_column(col_name: str, data: list[dict[str, Any]]) -> bool:
    """Check if a column appears to contain date/time values."""
    date_keywords = {"date", "month", "year", "week", "quarter", "time", "period"}
    if any(kw in col_name.lower() for kw in date_keywords):
        return True

    # Sample value check
    sample = data[0].get(col_name, "") if data else ""
    if isinstance(sample, str) and len(sample) >= 7:
        import re
        if re.match(r"\d{4}-\d{2}", sample):
            return True
    return False
