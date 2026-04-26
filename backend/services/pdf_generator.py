import io
import os
import sys
from datetime import date
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether,
)

from services.contract_templates import get_styles, lease_agreement, maintenance_agreement, service_contract, supply_agreement



def _register_fonts():
    """Turkish character support via system TTF fonts."""
    font_dirs = []
    if sys.platform == "win32":
        font_dirs.append(os.path.join(os.environ.get("WINDIR", "C:\\Windows"), "Fonts"))
    elif sys.platform == "darwin":
        font_dirs.extend(["/Library/Fonts", "/System/Library/Fonts/Supplemental"])
    else:
        font_dirs.extend([
            "/usr/share/fonts/truetype/dejavu",
            "/usr/share/fonts/truetype/liberation",
        ])

    font_map = {
        "RG": ["arial.ttf", "Arial.ttf", "DejaVuSans.ttf", "LiberationSans-Regular.ttf"],
        "RG-Bold": ["arialbd.ttf", "Arial Bold.ttf", "DejaVuSans-Bold.ttf", "LiberationSans-Bold.ttf"],
    }

    for font_name, candidates in font_map.items():
        registered = False
        for d in font_dirs:
            for fname in candidates:
                path = os.path.join(d, fname)
                if os.path.isfile(path):
                    pdfmetrics.registerFont(TTFont(font_name, path))
                    registered = True
                    break
            if registered:
                break
        if not registered:
            fallback = "Helvetica" if font_name == "RG" else "Helvetica-Bold"
            pdfmetrics.registerFontFamily(font_name, normal=fallback)


_register_fonts()

FONT = "RG"
FONT_BOLD = "RG-Bold"



def _fmt_currency(value):
    return f"{value:,.2f} TL"




def generate_addendum_pdf(calc):
    """
    Generate PDF based on contract_type from template.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2.5 * cm, rightMargin=2.5 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm,
    )

    styles = get_styles()

    ctype = calc.get("contract_type", "service_contract")
    if ctype == "lease_agreement":
        story = lease_agreement(styles, calc)
    elif ctype == "maintenance_agreement":
        story = maintenance_agreement(styles, calc)
    elif ctype == "supply_agreement":
        story = supply_agreement(styles, calc)
    else:
        story = service_contract(styles, calc)

    doc.build(story)
    buf.seek(0)
    return buf
