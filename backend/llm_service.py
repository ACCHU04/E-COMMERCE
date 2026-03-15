import json
import re
from typing import Any
from config import settings
from models import ChartData

# Schema context string for default dataset
DEFAULT_SCHEMA_CONTEXT = """
Table name: sales_data
Columns:
- order_id (INTEGER): Unique transaction identifier
- order_date (TEXT): Transaction date in YYYY-MM-DD format
- product_id (INTEGER): Unique product identifier
- product_category (TEXT): Product department — values: Books, Fashion, Electronics, Home, Sports, Beauty
- price (REAL): Original base unit price (USD)
- discount_percent (INTEGER): Discount percentage applied — values: 5, 10, 15, 20, 25, 30
- quantity_sold (INTEGER): Units purchased in the order (1-10)
- customer_region (TEXT): Buyer's geographical area — values: North America, Europe, Asia, South America, Africa, Oceania
- payment_method (TEXT): Payment instrument — values: Credit Card, Debit Card, UPI, PayPal, Net Banking
- rating (REAL): Product rating out of 5.0
- review_count (INTEGER): Number of user reviews
- discounted_price (REAL): Unit price after discount
- total_revenue (REAL): Final transaction value (discounted_price × quantity_sold)

Date range: 2022-01-01 to 2023-12-31
Total rows: ~1000
"""

SYSTEM_PROMPT = """You are an expert data analyst and SQL engineer for an e-commerce business intelligence platform.
Your job is to convert natural language questions into structured dashboard responses.

You must respond ONLY with valid JSON — no extra text, no markdown, no explanations outside the JSON.

For each user query, return a JSON object with this exact structure:
{
  "charts": [
    {
      "chart_type": "<bar|line|pie|scatter>",
      "title": "<descriptive chart title>",
      "sql": "<valid SQLite SELECT query>",
      "x_column": "<column name for x-axis or null>",
      "y_column": "<column name for y-axis or null>",
      "color_column": "<column name for color grouping or null>",
      "labels_column": "<column name for pie chart labels or null>",
      "values_column": "<column name for pie chart values or null>",
      "description": "<one-sentence description of what this chart shows>"
    }
  ],
  "insights": "<2-3 sentence business insight summarizing expected findings>",
  "error": null
}

Chart type selection rules:
- Use "line" for time-series data (monthly trends, date-based analysis)
- Use "bar" for categorical comparisons (by region, by category, by payment method)
- Use "pie" for parts-of-a-whole proportions (market share, distribution) — limit to ≤8 segments
- Use "scatter" for correlation analysis (two continuous variables)
- You may return multiple charts (2-3) for complex queries

SQL rules:
- Write valid SQLite syntax only
- Always use aggregation (SUM, AVG, COUNT) for numerical analysis
- For time series, use strftime('%Y-%m', order_date) to group by month
- For year-level grouping, use strftime('%Y', order_date)
- Always include ORDER BY for time-series queries
- Use ROUND(..., 2) for monetary values
- The table name is always: sales_data
- Do NOT use subqueries in FROM clause unless absolutely necessary
- Do NOT use window functions

If the query cannot be answered with the available data, set error to a helpful message and return empty charts array.
If the query is ambiguous, make a reasonable assumption and note it in insights.
"""


def _build_user_prompt(user_query: str, schema_context: str, conversation_history: list[dict]) -> str:
    history_text = ""
    if conversation_history:
        history_text = "\n\nConversation history (for context):\n"
        for msg in conversation_history[-4:]:  # Last 4 exchanges
            role = msg.get("role", "user")
            content = msg.get("content", "")
            history_text += f"{role.upper()}: {content}\n"

    return f"""Database schema:
{schema_context}

{history_text}

Current user query: {user_query}

Respond with valid JSON only."""


def _parse_llm_response(raw: str) -> dict:
    """Parse JSON from LLM response, handling markdown code blocks."""
    raw = raw.strip()
    # Remove markdown code blocks
    raw = re.sub(r"^```json\s*", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"^```\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    raw = raw.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Try to find JSON object in the response
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise


def _get_mock_response(user_query: str) -> dict:
    """Return a mock response when no API key is configured."""
    query_lower = user_query.lower()

    if any(word in query_lower for word in ["top", "best", "highest", "most sold", "most revenue"]):
        return {
            "charts": [
                {
                    "chart_type": "bar",
                    "title": "Top 5 Product Categories by Revenue",
                    "sql": "SELECT product_category, ROUND(SUM(total_revenue), 2) AS total_revenue FROM sales_data GROUP BY product_category ORDER BY total_revenue DESC LIMIT 5",
                    "x_column": "product_category",
                    "y_column": "total_revenue",
                    "color_column": None,
                    "labels_column": None,
                    "values_column": None,
                    "description": "Top 5 product categories ranked by total revenue"
                }
            ],
            "insights": "This chart highlights the top-performing product categories by total revenue. Electronics and Fashion typically dominate, driven by higher unit prices and strong demand.",
            "error": None
        }
    elif any(word in query_lower for word in ["month", "trend", "time", "revenue over"]):
        return {
            "charts": [
                {
                    "chart_type": "line",
                    "title": "Monthly Revenue Trend (2022-2023)",
                    "sql": "SELECT strftime('%Y-%m', order_date) AS month, ROUND(SUM(total_revenue), 2) AS total_revenue FROM sales_data GROUP BY month ORDER BY month",
                    "x_column": "month",
                    "y_column": "total_revenue",
                    "color_column": None,
                    "labels_column": None,
                    "values_column": None,
                    "description": "Monthly total revenue from January 2022 to December 2023"
                }
            ],
            "insights": "This chart shows the monthly revenue trend over the two-year period. Look for seasonal patterns and growth trends to identify peak sales periods.",
            "error": None
        }
    elif any(word in query_lower for word in ["category", "product", "department"]):
        return {
            "charts": [
                {
                    "chart_type": "bar",
                    "title": "Total Sales by Product Category",
                    "sql": "SELECT product_category, ROUND(SUM(total_revenue), 2) AS total_revenue, SUM(quantity_sold) AS total_units FROM sales_data GROUP BY product_category ORDER BY total_revenue DESC",
                    "x_column": "product_category",
                    "y_column": "total_revenue",
                    "color_column": None,
                    "labels_column": None,
                    "values_column": None,
                    "description": "Total revenue by product category"
                },
                {
                    "chart_type": "pie",
                    "title": "Revenue Distribution by Category",
                    "sql": "SELECT product_category, ROUND(SUM(total_revenue), 2) AS total_revenue FROM sales_data GROUP BY product_category ORDER BY total_revenue DESC",
                    "x_column": None,
                    "y_column": None,
                    "color_column": None,
                    "labels_column": "product_category",
                    "values_column": "total_revenue",
                    "description": "Proportional revenue distribution across product categories"
                }
            ],
            "insights": "Electronics typically drives the highest revenue due to higher price points, while Fashion shows strong volume. The pie chart reveals the proportional contribution of each category.",
            "error": None
        }
    elif any(word in query_lower for word in ["region", "geographic", "location", "country"]):
        return {
            "charts": [
                {
                    "chart_type": "bar",
                    "title": "Revenue by Customer Region",
                    "sql": "SELECT customer_region, ROUND(SUM(total_revenue), 2) AS total_revenue FROM sales_data GROUP BY customer_region ORDER BY total_revenue DESC",
                    "x_column": "customer_region",
                    "y_column": "total_revenue",
                    "color_column": None,
                    "labels_column": None,
                    "values_column": None,
                    "description": "Total revenue broken down by customer geographical region"
                }
            ],
            "insights": "North America and Europe typically lead in total revenue, while emerging markets like Asia show strong growth potential.",
            "error": None
        }
    elif any(word in query_lower for word in ["payment", "method", "credit", "upi", "paypal"]):
        return {
            "charts": [
                {
                    "chart_type": "pie",
                    "title": "Revenue by Payment Method",
                    "sql": "SELECT payment_method, ROUND(SUM(total_revenue), 2) AS total_revenue FROM sales_data GROUP BY payment_method ORDER BY total_revenue DESC",
                    "x_column": None,
                    "y_column": None,
                    "color_column": None,
                    "labels_column": "payment_method",
                    "values_column": "total_revenue",
                    "description": "Revenue distribution across different payment methods"
                }
            ],
            "insights": "Credit Card and Debit Card dominate transactions, while digital wallets like UPI and PayPal are growing. Understanding payment preferences helps optimize checkout experience.",
            "error": None
        }
    elif any(word in query_lower for word in ["discount", "rating", "scatter", "correlation"]):
        return {
            "charts": [
                {
                    "chart_type": "bar",
                    "title": "Average Discount % vs Average Rating by Category",
                    "sql": "SELECT product_category, ROUND(AVG(discount_percent), 1) AS avg_discount, ROUND(AVG(rating), 2) AS avg_rating FROM sales_data GROUP BY product_category ORDER BY avg_discount DESC",
                    "x_column": "product_category",
                    "y_column": "avg_discount",
                    "color_column": None,
                    "labels_column": None,
                    "values_column": None,
                    "description": "Average discount percentage vs average rating across product categories"
                }
            ],
            "insights": "Categories with higher discounts don't necessarily have lower ratings, suggesting discount strategy is not harming perceived product quality.",
            "error": None
        }
    else:
        return {
            "charts": [
                {
                    "chart_type": "bar",
                    "title": "Total Revenue by Product Category",
                    "sql": "SELECT product_category, ROUND(SUM(total_revenue), 2) AS total_revenue FROM sales_data GROUP BY product_category ORDER BY total_revenue DESC",
                    "x_column": "product_category",
                    "y_column": "total_revenue",
                    "color_column": None,
                    "labels_column": None,
                    "values_column": None,
                    "description": "Total revenue aggregated by product category"
                }
            ],
            "insights": "This overview shows revenue distribution across product categories. Electronics and Fashion typically lead in total sales value.",
            "error": None
        }


async def generate_dashboard(
    user_query: str,
    schema_context: str = DEFAULT_SCHEMA_CONTEXT,
    conversation_history: list[dict] | None = None,
) -> dict:
    """
    Call Google Gemini API to generate dashboard configuration.
    Falls back to mock mode if no API key is set.
    """
    if settings.mock_mode or not settings.gemini_api_key:
        return _get_mock_response(user_query)

    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)

        prompt = _build_user_prompt(
            user_query,
            schema_context,
            conversation_history or []
        )

        configured_fallbacks = [
            m.strip() for m in settings.gemini_fallback_models.split(",") if m.strip()
        ]
        model_candidates: list[str] = []
        for candidate in [settings.gemini_model, *configured_fallbacks]:
            if candidate not in model_candidates:
                model_candidates.append(candidate)

        last_error: Exception | None = None
        for model_name in model_candidates:
            try:
                model = genai.GenerativeModel(
                    model_name=model_name,
                    system_instruction=SYSTEM_PROMPT,
                )
                response = model.generate_content(prompt)
                raw_text = response.text
                return _parse_llm_response(raw_text)
            except Exception as model_error:
                last_error = model_error
                continue

        if last_error:
            raise last_error
        raise RuntimeError("No Gemini models are configured")

    except Exception as e:
        error_msg = str(e)
        if "API_KEY" in error_msg.upper() or "INVALID" in error_msg.upper():
            return {
                "charts": [],
                "insights": "",
                "error": "Invalid API key. Please check your GEMINI_API_KEY configuration."
            }
        # For other errors, return a user-friendly message
        return {
            "charts": [],
            "insights": "",
            "error": f"Unable to process your query. Please try rephrasing it. (Error: {error_msg[:100]})"
        }
