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

BRAND_BLUE = colors.HexColor("#136dec")
BRAND_DARK = colors.HexColor("#0e52b5")
GRAY_600 = colors.HexColor("#4b5563")
GRAY_200 = colors.HexColor("#e5e7eb")


def _fmt_currency(value):
    return f"{value:,.2f} TL"


def _build_styles():
    base = getSampleStyleSheet()

    title = ParagraphStyle(
        "DocTitle", parent=base["Heading1"],
        fontName=FONT_BOLD,
        fontSize=18, leading=22, textColor=BRAND_DARK,
        spaceAfter=4,
    )
    subtitle = ParagraphStyle(
        "DocSubtitle", parent=base["Normal"],
        fontName=FONT,
        fontSize=10, leading=14, textColor=GRAY_600,
        spaceAfter=12,
    )
    heading = ParagraphStyle(
        "SectionHeading", parent=base["Heading2"],
        fontName=FONT_BOLD,
        fontSize=12, leading=16, textColor=BRAND_BLUE,
        spaceBefore=16, spaceAfter=8,
    )
    body = ParagraphStyle(
        "BodyText2", parent=base["Normal"],
        fontName=FONT,
        fontSize=10, leading=15, textColor=colors.HexColor("#1f2937"),
        alignment=TA_JUSTIFY,
        spaceAfter=6,
    )
    small = ParagraphStyle(
        "SmallText", parent=base["Normal"],
        fontName=FONT,
        fontSize=8, leading=11, textColor=GRAY_600,
    )
    center = ParagraphStyle(
        "CenterText", parent=base["Normal"],
        fontName=FONT,
        fontSize=10, leading=14, alignment=TA_CENTER,
        textColor=colors.HexColor("#1f2937"),
    )
    right = ParagraphStyle(
        "RightText", parent=body,
        fontName=FONT,
        alignment=TA_RIGHT,
    )

    return {
        "title": title, "subtitle": subtitle, "heading": heading,
        "body": body, "small": small, "center": center, "right": right,
    }


def generate_addendum_pdf(calc):
    """
    Hesaplama sonucunu alip profesyonel ek sozlesme PDF'i uretir.
    Bellekte (BytesIO) dondurur.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2.5 * cm, rightMargin=2.5 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm,
    )

    s = _build_styles()
    elements = []
    today = date.today()
    ref_id = calc["contract_id"][:8].upper()

    # ── Header ──
    elements.append(Paragraph("ENFLASYON KALKANI", ParagraphStyle(
        "Brand", parent=s["title"],
        fontName=FONT_BOLD,
        fontSize=14, textColor=BRAND_BLUE, spaceAfter=0,
    )))
    elements.append(HRFlowable(
        width="100%", thickness=2, color=BRAND_BLUE,
        spaceAfter=12, spaceBefore=4,
    ))

    # ── Title ──
    elements.append(Paragraph(
        "EK S\u00d6ZLE\u015eME / CONTRACT ADDENDUM", s["title"],
    ))
    elements.append(Paragraph(
        f"Referans: SA-{ref_id}-RNW &nbsp;&nbsp;|&nbsp;&nbsp; "
        f"Tarih: {today.strftime('%d.%m.%Y')}",
        s["subtitle"],
    ))
    elements.append(Spacer(1, 8 * mm))

    # ── Parties ──
    elements.append(Paragraph("1. TARAFLAR", s["heading"]))
    elements.append(Paragraph(
        f"<b>Hizmet Sa\u011flay\u0131c\u0131:</b> Enflasyon Kalkanı", s["body"],
    ))
    elements.append(Paragraph(
        f"<b>M\u00fc\u015fteri:</b> {calc['company_name']}", s["body"],
    ))
    if calc.get("company_email"):
        elements.append(Paragraph(
            f"<b>Yetkili E-posta:</b> {calc['company_email']}", s["body"],
        ))
    elements.append(Spacer(1, 4 * mm))

    # ── Subject ──
    elements.append(Paragraph("2. KONU", s["heading"]))
    end_date_str = calc.get("end_date") or "\u2014"
    elements.append(Paragraph(
        f"\u0130\u015fbu ek s\u00f6zle\u015fme, {end_date_str} tarihinde sona erecek olan "
        f"hizmet s\u00f6zle\u015fmesinin yenilenmesine ili\u015fkin fiyat g\u00fcncelleme "
        f"ko\u015fullar\u0131n\u0131 d\u00fczenlemektedir. Fiyat g\u00fcncellemesi, "
        f"TCMB EVDS verileri baz al\u0131narak "
        f"<b>{calc['inflation_base_rule']}</b> endeksine g\u00f6re hesaplanm\u0131\u015ft\u0131r.",
        s["body"],
    ))
    elements.append(Spacer(1, 4 * mm))

    # ── Market Data ──
    elements.append(Paragraph(
        "3. P\u0130YASA VER\u0130LER\u0130", s["heading"],
    ))

    market_data = [
        ["G\u00f6sterge", "De\u011fer"],
        ["T\u00dcFE (Y\u0131ll\u0131k De\u011fi\u015fim)", f"%{calc['tufe_rate']:.2f}"],
        ["\u00dcFE (Y\u0131ll\u0131k De\u011fi\u015fim)", f"%{calc['ufe_rate']:.2f}"],
        ["USD/TRY Kuru", f"{calc['usd_rate']:.4f}"],
        ["EUR/TRY Kuru", f"{calc['eur_rate']:.4f}"],
        ["Veri Tarihi", calc["calculation_date"]],
    ]
    market_table = Table(market_data, colWidths=[200, 200])
    market_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), FONT_BOLD),
        ("FONTNAME", (0, 1), (-1, -1), FONT),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.5, GRAY_200),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    elements.append(market_table)
    elements.append(Spacer(1, 6 * mm))

    # ── Calculation ──
    elements.append(Paragraph(
        "4. F\u0130YAT HESAPLAMASI", s["heading"],
    ))

    calc_rows = [
        ["A\u00e7\u0131klama", "Tutar"],
        ["Mevcut S\u00f6zle\u015fme Bedeli", _fmt_currency(calc["previous_amount"])],
        [f"Uygulanan Endeks ({calc['inflation_base_rule']})", f"%{calc['applied_adjustment']:.2f}"],
    ]
    if calc["capped"]:
        calc_rows.append([
            "Maksimum Art\u0131\u015f Limiti (Uyguland\u0131)",
            f"%{calc['max_increase_limit']}",
        ])
    calc_rows.append(["Fark", f"+{_fmt_currency(calc['difference'])}"])
    calc_rows.append([
        "YEN\u0130 S\u00d6ZLE\u015eME BEDEL\u0130",
        _fmt_currency(calc["new_amount"]),
    ])

    calc_table = Table(calc_rows, colWidths=[260, 140])
    n_rows = len(calc_rows)
    calc_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), FONT_BOLD),
        ("FONTNAME", (0, 1), (-1, -1), FONT),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.5, GRAY_200),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#f9fafb")]),
        ("BACKGROUND", (0, n_rows - 1), (-1, n_rows - 1), colors.HexColor("#eff6ff")),
        ("FONTNAME", (0, n_rows - 1), (-1, n_rows - 1), FONT_BOLD),
        ("FONTSIZE", (0, n_rows - 1), (-1, n_rows - 1), 11),
        ("TEXTCOLOR", (0, n_rows - 1), (-1, n_rows - 1), BRAND_DARK),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    elements.append(calc_table)
    elements.append(Spacer(1, 8 * mm))

    # ── Terms ──
    elements.append(Paragraph(
        "5. GENEL KO\u015eULLAR", s["heading"],
    ))
    elements.append(Paragraph(
        "a) Yeni fiyat, i\u015fbu ek s\u00f6zle\u015fmenin her iki taraf\u00e7a "
        "imzalanmas\u0131n\u0131 takiben y\u00fcr\u00fcrl\u00fc\u011fe girecektir.",
        s["body"],
    ))
    elements.append(Paragraph(
        "b) Ana s\u00f6zle\u015fmenin di\u011fer t\u00fcm madde ve ko\u015fullar\u0131 "
        "aynen ge\u00e7erli olmaya devam edecektir.",
        s["body"],
    ))
    elements.append(Paragraph(
        "c) Bu ek s\u00f6zle\u015fme, 2 (iki) n\u00fcsha olarak d\u00fczenlenmi\u015f "
        "olup her iki taraf birer n\u00fcsha alm\u0131\u015ft\u0131r.",
        s["body"],
    ))
    elements.append(Spacer(1, 12 * mm))

    # ── Signatures ──
    sig_block = KeepTogether([
        Paragraph("6. \u0130MZALAR", s["heading"]),
        Spacer(1, 6 * mm),
        Table(
            [
                [
                    Paragraph(
                        f"<b>Hizmet Sa\u011flay\u0131c\u0131</b><br/>Enflasyon Kalkanı",
                        s["body"],
                    ),
                    Paragraph(
                        f"<b>M\u00fc\u015fteri</b><br/>{calc['company_name']}",
                        s["body"],
                    ),
                ],
                [
                    Paragraph(
                        "_________________________<br/>\u0130mza / Ka\u015fe",
                        s["center"],
                    ),
                    Paragraph(
                        "_________________________<br/>\u0130mza / Ka\u015fe",
                        s["center"],
                    ),
                ],
                [
                    Paragraph(f"Tarih: {today.strftime('%d.%m.%Y')}", s["small"]),
                    Paragraph("Tarih: __ / __ / ____", s["small"]),
                ],
            ],
            colWidths=[200, 200],
        ),
    ])
    elements.append(sig_block)
    elements.append(Spacer(1, 15 * mm))

    # ── Footer ──
    elements.append(HRFlowable(
        width="100%", thickness=0.5, color=GRAY_200,
        spaceBefore=8, spaceAfter=6,
    ))
    elements.append(Paragraph(
        f"Bu belge Enflasyon Kalkanı sistemi taraf\u0131ndan otomatik olarak "
        f"\u00fcretilmi\u015ftir. Referans: SA-{ref_id}-RNW | {today.strftime('%d.%m.%Y')}",
        s["small"],
    ))

    doc.build(elements)
    buf.seek(0)
    return buf
