import os
import secrets
from pathlib import Path
from dotenv import load_dotenv

_backend_dir = Path(__file__).resolve().parent
_repo_root = _backend_dir.parent
# Prefer backend/.env; fill missing keys from repo root .env (common when .env lives in project root).
load_dotenv(_backend_dir / ".env")
load_dotenv(_repo_root / ".env")

APP_ENV = os.getenv("APP_ENV") or os.getenv("FLASK_ENV") or "development"
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE_KEY = SUPABASE_SERVICE_KEY or os.getenv("SUPABASE_API", "")
TCMB_API_KEY = os.getenv("TCMB_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# TCMB Survey of Market Participants: arithmetic mean, 12-month-ahead annual CPI expectation.
PRIVATE_SECTOR_INFLATION_EXPECTATION_SERIES = os.getenv(
    "PRIVATE_SECTOR_INFLATION_EXPECTATION_SERIES", "TP.BEK.S01.E.A"
)
PRIVATE_SECTOR_INFLATION_EXPECTATION_URL = os.getenv(
    "PRIVATE_SECTOR_INFLATION_EXPECTATION_URL", ""
)

# World Bank (free, annual series)
WORLD_BANK_TURKEY_INFLATION_URL = os.getenv("WORLD_BANK_TURKEY_INFLATION_URL", "")
WORLD_BANK_TURKEY_CPI_INDEX_URL = os.getenv("WORLD_BANK_TURKEY_CPI_INDEX_URL", "")
WORLD_BANK_TURKEY_WPI_URL = os.getenv("WORLD_BANK_TURKEY_WPI_URL", "")

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "")
APP_BASE_URL = (
    os.getenv("APP_BASE_URL")
    or os.getenv("FRONTEND_URL")
    or os.getenv("RATEGUARD_APP_URL")
    or "http://localhost:5173"
)

APP_SECRET_KEY = (
    os.getenv("APP_SECRET_KEY")
    or os.getenv("SECRET_KEY")
    or os.getenv("FLASK_SECRET_KEY")
    or ""
)
ALLOW_INSECURE_DEV_AUTH = os.getenv("ALLOW_INSECURE_DEV_AUTH", "").lower() in (
    "1",
    "true",
    "yes",
)
CRON_SECRET = os.getenv("CRON_SECRET", "")
APP_TIMEZONE = os.getenv("APP_TIMEZONE", "Europe/Istanbul")
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
    ).split(",")
    if origin.strip()
]

if not APP_SECRET_KEY and APP_ENV.lower() in ("production", "prod"):
    raise RuntimeError("APP_SECRET_KEY must be set before running in production.")

if not APP_SECRET_KEY:
    APP_SECRET_KEY = secrets.token_urlsafe(32)
    print(
        "[security] APP_SECRET_KEY is not configured. "
        "Using an ephemeral development key; set APP_SECRET_KEY before production deploy."
    )

# Scheduler uses UTC (APScheduler CronTrigger timezone="UTC").
# Example for Turkiye 08:00 (UTC+3): 05:00 UTC -> AUTOMATION_CRON_HOUR_UTC=5
AUTOMATION_CRON_HOUR_UTC = int(os.getenv("AUTOMATION_CRON_HOUR_UTC", "5"))
AUTOMATION_CRON_MINUTE_UTC = int(os.getenv("AUTOMATION_CRON_MINUTE_UTC", "0"))
