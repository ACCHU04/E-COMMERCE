import os
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gemini_api_key: str = ""
    gemini_model: str = "gemini-flash-latest"
    gemini_fallback_models: str = "models/gemini-flash-latest,gemini-2.0-flash,models/gemini-2.0-flash,gemini-2.5-flash"
    db_path: str = "ecommerce.db"
    data_dir: str = str(Path(__file__).parent.parent / "data")
    default_csv: str = "amazon_sales.csv"
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    mock_mode: bool = False
    rapidapi_key: str = ""
    rapidapi_host: str = "real-time-amazon-data.p.rapidapi.com"
    rapidapi_base_url: str = "https://real-time-amazon-data.p.rapidapi.com"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# Auto-enable mock mode if no API key is configured
if not settings.gemini_api_key:
    settings.mock_mode = True
