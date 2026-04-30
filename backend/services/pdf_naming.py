"""Short, ASCII-safe PDF download filenames."""
from __future__ import annotations

import re
from datetime import date


def contract_id_tag(contract_id: str | None) -> str:
    if not contract_id:
        return "NOID"
    clean = re.sub(r"[^a-fA-F0-9]", "", str(contract_id))
    return (clean[:8] or "NOID").upper()


def addendum_download_name(contract_id: str | None) -> str:
    return f"RG_Addendum_{contract_id_tag(contract_id)}_{date.today().strftime('%Y%m%d')}.pdf"
