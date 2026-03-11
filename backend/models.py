from pydantic import BaseModel
from typing import Any, Optional


class QueryRequest(BaseModel):
    query: str
    session_id: Optional[str] = None


class ColumnInfo(BaseModel):
    name: str
    type: str
    sample_values: list[Any] = []


class SchemaResponse(BaseModel):
    columns: list[ColumnInfo]
    sample_data: list[dict[str, Any]]
    row_count: int
    table_name: str = "sales_data"


class ChartData(BaseModel):
    chart_type: str  # bar, line, pie, scatter, donut
    title: str
    data: list[dict[str, Any]]
    x_column: Optional[str] = None
    y_column: Optional[str] = None
    color_column: Optional[str] = None
    labels_column: Optional[str] = None
    values_column: Optional[str] = None
    description: Optional[str] = None


class QueryResponse(BaseModel):
    charts: list[ChartData]
    insights: str
    sql_query: str
    session_id: str
    error: Optional[str] = None


class UploadResponse(BaseModel):
    message: str
    columns: list[str]
    row_count: int
    session_id: str
    schema_info: list[ColumnInfo] = []
