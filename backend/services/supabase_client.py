from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY


class _SupabaseStub:
	def __init__(self, message: str):
		self._message = message

	def table(self, *_args, **_kwargs):
		raise RuntimeError(self._message)

	def __getattr__(self, _name):
		raise RuntimeError(self._message)


_missing = []
if not SUPABASE_URL:
	_missing.append("SUPABASE_URL")
if not SUPABASE_KEY:
	_missing.append("SUPABASE_SERVICE_KEY (or SUPABASE_API)")

if _missing:
	supabase = _SupabaseStub(
		"Supabase is not configured. Missing: "
		+ ", ".join(_missing)
		+ ". Set these in backend/.env (or repo root .env) and restart the backend."
	)
else:
	supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
