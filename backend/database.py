import sqlite3
import pandas as pd
import os
from pathlib import Path
from typing import Any
from config import settings
from models import ColumnInfo, SchemaResponse

# In-memory session storage for uploaded datasets
_session_dbs: dict[str, str] = {}  # session_id -> db_path


def _get_db_path(session_id: str | None = None) -> str:
    if session_id and session_id in _session_dbs:
        return _session_dbs[session_id]
    return settings.db_path


def init_default_db() -> None:
    """Initialize the default SQLite database from the CSV file."""
    csv_path = os.path.join(settings.data_dir, settings.default_csv)
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Default CSV not found at {csv_path}")
    _load_csv_to_db(csv_path, settings.db_path, "sales_data")
    print(f"[DB] Default database initialized at {settings.db_path}")


def load_csv_for_session(csv_path: str, session_id: str) -> SchemaResponse:
    """Load a user-uploaded CSV into a session-specific SQLite database."""
    db_path = f"session_{session_id}.db"
    _load_csv_to_db(csv_path, db_path, "sales_data")
    _session_dbs[session_id] = db_path
    return get_schema(session_id)


def _load_csv_to_db(csv_path: str, db_path: str, table_name: str) -> None:
    """Load CSV file into a SQLite database table."""
    df = pd.read_csv(csv_path)
    # Normalize column names: lowercase, replace spaces with underscores
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    conn = sqlite3.connect(db_path)
    df.to_sql(table_name, conn, if_exists="replace", index=False)
    conn.close()


def execute_query(sql: str, session_id: str | None = None) -> list[dict[str, Any]]:
    """Execute a SQL query and return results as a list of dicts."""
    db_path = _get_db_path(session_id)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        cursor = conn.execute(sql)
        rows = [dict(row) for row in cursor.fetchall()]
        return rows
    finally:
        conn.close()


def get_schema(session_id: str | None = None) -> SchemaResponse:
    """Get the schema and sample data from the database."""
    db_path = _get_db_path(session_id)
    conn = sqlite3.connect(db_path)
    try:
        cursor = conn.execute("SELECT * FROM sales_data LIMIT 5")
        sample_rows = [dict(zip([d[0] for d in cursor.description], row)) for row in cursor.fetchall()]
        col_names = [d[0] for d in cursor.description]

        # Get type info
        type_cursor = conn.execute("PRAGMA table_info(sales_data)")
        col_types = {row[1]: row[2] for row in type_cursor.fetchall()}

        count_row = conn.execute("SELECT COUNT(*) FROM sales_data").fetchone()
        row_count = count_row[0] if count_row else 0

        columns = []
        for col in col_names:
            sample_vals = [str(row.get(col, "")) for row in sample_rows[:3]]
            columns.append(ColumnInfo(
                name=col,
                type=col_types.get(col, "TEXT"),
                sample_values=sample_vals
            ))

        return SchemaResponse(
            columns=columns,
            sample_data=sample_rows,
            row_count=row_count
        )
    finally:
        conn.close()
