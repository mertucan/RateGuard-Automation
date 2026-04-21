import os
from pathlib import Path
from dotenv import load_dotenv

_backend_dir = Path(__file__).resolve().parent
_repo_root = _backend_dir.parent
# Prefer backend/.env; fill missing keys from repo root .env (common when .env lives in project root).
load_dotenv(_backend_dir / ".env")
load_dotenv(_repo_root / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE_KEY = SUPABASE_SERVICE_KEY or os.getenv("SUPABASE_API", "")
TCMB_API_KEY = os.getenv("TCMB_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "")
