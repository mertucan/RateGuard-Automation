import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE_KEY = SUPABASE_SERVICE_KEY or os.getenv("SUPABASE_API", "")
TCMB_API_KEY = os.getenv("TCMB_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
