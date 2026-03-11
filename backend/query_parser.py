import re
from typing import Optional


# SQL keywords that are dangerous to allow
_FORBIDDEN_KEYWORDS = {
    "INSERT", "UPDATE", "DELETE", "DROP", "CREATE", "ALTER",
    "TRUNCATE", "REPLACE", "MERGE", "EXEC", "EXECUTE",
    "GRANT", "REVOKE", "ATTACH", "DETACH", "PRAGMA",
}

# Only allow SELECT statements
_SELECT_PATTERN = re.compile(r"^\s*SELECT\b", re.IGNORECASE)


def validate_sql(sql: str) -> tuple[bool, Optional[str]]:
    """
    Validate that the SQL is safe to execute.
    Returns (is_valid, error_message).
    """
    if not sql or not sql.strip():
        return False, "Empty SQL query"

    # Must start with SELECT
    if not _SELECT_PATTERN.match(sql):
        return False, "Only SELECT queries are allowed"

    # Check for forbidden keywords
    upper_sql = sql.upper()
    for keyword in _FORBIDDEN_KEYWORDS:
        pattern = r"\b" + keyword + r"\b"
        if re.search(pattern, upper_sql):
            return False, f"Forbidden SQL keyword detected: {keyword}"

    # Check for comment injection
    if "--" in sql or "/*" in sql:
        return False, "SQL comments are not allowed"

    # Check for multiple statements
    stripped = sql.rstrip("; \t\n\r")
    if ";" in stripped:
        return False, "Multiple SQL statements are not allowed"

    return True, None


def clean_sql(sql: str) -> str:
    """
    Clean SQL output from LLM (remove markdown code blocks, trailing semicolons).
    """
    # Remove markdown code fences
    sql = re.sub(r"```sql\s*", "", sql, flags=re.IGNORECASE)
    sql = re.sub(r"```\s*", "", sql)
    # Remove trailing semicolons
    sql = sql.strip().rstrip(";").strip()
    return sql
