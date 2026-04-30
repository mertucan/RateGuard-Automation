from datetime import date
from xml.sax.saxutils import escape

from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


import sys
import os

def _register_fonts():
    font_dirs = []
    if sys.platform == "win32":
        font_dirs.append(os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts"))
    elif sys.platform == "darwin":
        font_dirs.extend(["/Library/Fonts", "/System/Library/Fonts/Supplemental"])
    else:
        font_dirs.extend([
            "/usr/share/fonts/truetype/dejavu",
            "/usr/share/fonts/truetype/liberation",
        ])

    font_map = {
        "DejaVu": ["arial.ttf", "Arial.ttf", "DejaVuSans.ttf", "LiberationSans-Regular.ttf"],
        "DejaVu-Bold": ["arialbd.ttf", "Arial Bold.ttf", "DejaVuSans-Bold.ttf", "LiberationSans-Bold.ttf"],
        "DejaVu-Italic": ["ariali.ttf", "Arial Italic.ttf", "DejaVuSans-Oblique.ttf", "LiberationSans-Italic.ttf"],
    }

    for font_name, candidates in font_map.items():
        registered = False
        for d in font_dirs:
            for fname in candidates:
                path = os.path.join(d, fname)
                if os.path.isfile(path):
                    try:
                        pdfmetrics.registerFont(TTFont(font_name, path))
                        registered = True
                        break
                    except:
                        pass
            if registered:
                break
        if not registered:
            fallback = "Helvetica"
            if "Bold" in font_name: fallback = "Helvetica-Bold"
            if "Italic" in font_name: fallback = "Helvetica-Oblique"
            pdfmetrics.registerFontFamily(font_name, normal=fallback)

    pdfmetrics.registerFontFamily('DejaVu', normal='DejaVu', bold='DejaVu-Bold', italic='DejaVu-Italic', boldItalic='DejaVu-Bold')

_register_fonts()

FONT = 'DejaVu'
FONT_BOLD = 'DejaVu-Bold'


def get_styles():
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle('ContractTitle', parent=styles['Normal'],
        fontSize=14, fontName=FONT_BOLD, alignment=TA_CENTER, spaceAfter=20, spaceBefore=10,
        textColor=colors.black)
    
    section_style = ParagraphStyle('SectionHeading', parent=styles['Normal'],
        fontSize=10, fontName=FONT_BOLD, alignment=TA_LEFT, spaceBefore=12, spaceAfter=4,
        textColor=colors.black)
    
    body_style = ParagraphStyle('BodyText', parent=styles['Normal'],
        fontSize=10, fontName=FONT, alignment=TA_JUSTIFY, spaceBefore=2, spaceAfter=4, leading=14,
        textColor=colors.black)
    
    indent_style = ParagraphStyle('IndentText', parent=styles['Normal'],
        fontSize=10, fontName=FONT, alignment=TA_JUSTIFY, leftIndent=20, spaceBefore=2, spaceAfter=2, leading=14,
        textColor=colors.black)
    
    checkbox_style = ParagraphStyle('CheckboxText', parent=styles['Normal'],
        fontSize=10, fontName=FONT, leftIndent=20, spaceBefore=2, spaceAfter=2, leading=14,
        textColor=colors.black)
    
    sign_style = ParagraphStyle('SignatureLine', parent=styles['Normal'],
        fontSize=10, fontName=FONT_BOLD, alignment=TA_LEFT, spaceBefore=8, spaceAfter=2,
        textColor=colors.black)
    
    sign_sub_style = ParagraphStyle('SignatureSub', parent=styles['Normal'],
        fontSize=10, fontName=FONT, alignment=TA_LEFT, spaceBefore=0, spaceAfter=4,
        textColor=colors.black)

    return {
        'title': title_style, 'section': section_style, 'body': body_style,
        'indent': indent_style, 'checkbox': checkbox_style,
        'sign': sign_style, 'sign_sub': sign_sub_style,
    }


def bl(n=20):
    return "_" * n


def _pxml(text):
    """Escape for ReportLab Paragraph mini-HTML."""
    if text is None:
        return ""
    return escape(str(text), entities={'"': "&quot;", "'": "&apos;"})


def _money_line(calc):
    amt = calc.get("new_amount")
    cur = (calc.get("currency") or "TRY").strip() or "TRY"
    if amt is None:
        return "—"
    try:
        a = float(amt)
    except (TypeError, ValueError):
        return f"{amt} {cur}"
    return f"{a:,.2f} {cur}"


def _agreement_today():
    return date.today().strftime("%d %b, %Y")


def _end_pretty(calc):
    ed = calc.get("end_date") or ""
    if not ed:
        return ""
    try:
        return date.fromisoformat(ed[:10]).strftime("%d %b, %Y")
    except ValueError:
        return str(ed)


def cb():
    return "[ ]"


def build_doc(filename, content_func):
    doc = SimpleDocTemplate(filename, pagesize=A4,
        rightMargin=2.5*cm, leftMargin=2.5*cm, topMargin=2.5*cm, bottomMargin=2.5*cm)
    styles = get_styles()
    story = content_func(styles)
    doc.build(story)
    print(f"Created: {filename}")


# =============================================================================
# 1. LEASE AGREEMENT
# =============================================================================
def lease_agreement(styles, calc):
    s = styles
    story = []

    story.append(Paragraph("LEASE AGREEMENT", s['title']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.black))
    story.append(Spacer(1, 10))
    
    tenant_name = _pxml(calc.get("company_name") or "Client")
    rent_amt = _pxml(_money_line(calc))
    end_date = _pxml(_end_pretty(calc) or (calc.get("end_date") or "—"))

    story.append(Paragraph(
        f'<b>I. The Parties.</b> This Lease Agreement ("Agreement") made {_pxml(_agreement_today())}, '
        f'is by and between:', s['body']))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        f'<u>Landlord:</u> RateGuard, with a mailing address of Istanbul, TR ("Landlord"), and',
        s['indent']))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        f'<u>Tenant:</u> {tenant_name} ("Tenant").',
        s['indent']))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        'Landlord and Tenant are each referred to herein as a "Party" and, collectively, as the "Parties."',
        s['body']))
    story.append(Paragraph(
        'NOW, THEREFORE, FOR AND IN CONSIDERATION of the mutual promises and agreements contained herein, '
        'the Landlord agrees to lease the Property to the Tenant under the following terms and conditions:',
        s['body']))

    story.append(Paragraph("II. Leased Property.", s['section']))
    story.append(Paragraph(f'The address of the leased property is: Default Location', s['body']))
    story.append(Paragraph('Hereinafter known as the "Property".', s['body']))

    story.append(Paragraph("III. Term.", s['section']))
    story.append(Paragraph(
        f'This Agreement shall commence immediately, and terminate: (check one)', s['body']))
    story.append(Paragraph(f'[X] - Fixed Term. On {end_date}.', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Month-to-Month. Written notice of at least {bl(6)} days.', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Other: {bl(30)}.', s['checkbox']))

    story.append(Paragraph("IV. Rent.", s['section']))
    story.append(Paragraph('The Tenant agrees to pay the Landlord the following rent: (check one)', s['body']))
    story.append(Paragraph(f'[X] - {rent_amt} / Month', s['checkbox']))
    story.append(Paragraph(f'{cb()} - ${bl(10)} / Year', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Other: {bl(30)}.', s['checkbox']))
    story.append(Paragraph('Hereinafter known as the "Rent".', s['body']))

    story.append(Paragraph("V. Payment Method.", s['section']))
    story.append(Paragraph('The Rent shall be paid as follows: (check one)', s['body']))
    story.append(Paragraph(f'{cb()} - On the {bl(6)} day of each month', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Bank transfer / wire', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Cash', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Other: {bl(30)}.', s['checkbox']))

    story.append(Paragraph("VI. Security Deposit.", s['section']))
    story.append(Paragraph('This Agreement requires: (check one)', s['body']))
    story.append(Paragraph(
        f'{cb()} - A Security Deposit. Tenant agrees to pay ${bl(10)} as a security deposit.', s['checkbox']))
    story.append(Paragraph(f'      {cb()} - Deposit is refundable.', s['checkbox']))
    story.append(Paragraph(f'      {cb()} - Deposit is non-refundable.', s['checkbox']))
    story.append(Paragraph(f'{cb()} - No Security Deposit required.', s['checkbox']))

    story.append(Paragraph("VII. Use of Property.", s['section']))
    story.append(Paragraph(
        'Tenant shall use the Property solely for residential/commercial purposes and shall maintain '
        'the Property in good condition. Tenant shall not make any alterations or modifications to '
        'the Property without the prior written consent of the Landlord.', s['body']))

    story.append(Paragraph("VIII. Maintenance and Repairs.", s['section']))
    story.append(Paragraph(
        f'Routine maintenance and minor repairs are the responsibility of the Tenant; major structural '
        f'repairs are the responsibility of the Landlord. The maximum repair cost borne by the Tenant '
        f'shall not exceed ${bl(10)} per occurrence.', s['body']))

    story.append(Paragraph("IX. Termination.", s['section']))
    story.append(Paragraph(
        f'This Agreement may be terminated by either Party upon written notice of at least {bl(6)} days. '
        'In the event of Tenant default, the Landlord may pursue legal eviction proceedings.', s['body']))

    story.append(Paragraph("X. Confidentiality.", s['section']))
    story.append(Paragraph(
        'Both Parties agree to keep the terms of this Agreement and any proprietary business '
        'information confidential and shall not disclose such information to third parties.', s['body']))

    story.append(Paragraph("XI. Governing Law.", s['section']))
    story.append(Paragraph(
        'This Agreement shall be governed by and construed in accordance with the laws of the '
        'Republic of Turkey.', s['body']))

    story.append(Paragraph("XII. Additional Terms & Conditions.", s['section']))
    story.append(Paragraph(f'{bl(70)}', s['body']))
    story.append(Paragraph(f'{bl(70)}', s['body']))
    story.append(Paragraph(f'{bl(70)}', s['body']))

    story.append(Paragraph("XIII. Entire Agreement.", s['section']))
    story.append(Paragraph(
        'This Agreement constitutes the entire agreement between the Parties and supersedes all prior '
        'agreements, representations, and understandings. No amendment shall be binding unless executed '
        'in writing by both Parties.', s['body']))

    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.black))
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        f"<b>Landlord&apos;s Signature</b> RateGuard     Date {_pxml(_agreement_today())}", s['sign']))
    story.append(Paragraph(f'Print Name RateGuard', s['sign_sub']))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        f"<b>Tenant&apos;s Signature</b> {tenant_name}     Date {_pxml(_agreement_today())}", s['sign']))
    story.append(Paragraph(f'Print Name {tenant_name}', s['sign_sub']))

    return story


# =============================================================================
# 2. MAINTENANCE AGREEMENT
# =============================================================================
def maintenance_agreement(styles, calc):
    s = styles
    story = []

    story.append(Paragraph("MAINTENANCE AGREEMENT", s['title']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.black))
    story.append(Spacer(1, 10))

    made = _pxml(_agreement_today())
    client_name = _pxml(calc.get("company_name") or "Client")
    provider_addr = "Istanbul, Turkey"
    pay = _pxml(_money_line(calc))
    end_disp = _pxml(_end_pretty(calc) or (calc.get("end_date") or "—"))

    story.append(Paragraph(
        f'<b>I. The Parties.</b> This Maintenance Agreement ("Agreement") made {made}, '
        f'is by and between:', s['body']))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        f'<u>Service Provider:</u> RateGuard, with a mailing address of {provider_addr} ("Service Provider"), and',
        s['indent']))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        f'<u>Client:</u> {client_name}, with a mailing address as per company records ("Client").',
        s['indent']))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        'Service Provider and Client are each referred to herein as a "Party" and, collectively, as the "Parties."',
        s['body']))
    story.append(Paragraph(
        'NOW, THEREFORE, FOR AND IN CONSIDERATION of the mutual promises and agreements contained herein, '
        'the Client hires the Service Provider to perform maintenance services under the following terms and conditions:',
        s['body']))

    story.append(Paragraph("II. Term.", s['section']))
    story.append(Paragraph(
        f'This Agreement shall commence on {made}, and terminate: (check one)', s['body']))
    story.append(Paragraph(f'{cb()} - At-Will. Written notice of at least thirty (30) days.', s['checkbox']))
    story.append(Paragraph(f'[X] - End Date. On {end_disp}.', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Other: {bl(30)}.', s['checkbox']))

    story.append(Paragraph("III. Maintenance Services.", s['section']))
    story.append(Paragraph(
        'The Service Provider agrees to perform the following maintenance services:', s['body']))
    story.append(Paragraph(f'{bl(70)}', s['body']))
    story.append(Paragraph(f'{bl(70)}', s['body']))
    story.append(Paragraph(f'{bl(70)}', s['body']))
    story.append(Paragraph('Hereinafter known as the "Services".', s['body']))
    story.append(Paragraph(
        'The Service Provider shall comply with the policies, standards, and regulations of the Client, '
        'including all applicable local, state, and federal laws, to the best of their abilities.', s['body']))

    story.append(Paragraph("IV. Scope of Services.", s['section']))
    story.append(Paragraph('The maintenance services shall include: (check one)', s['body']))
    story.append(Paragraph(f'{cb()} - Scheduled / preventive maintenance', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Corrective / on-demand maintenance', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Full coverage (scheduled + corrective)', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Other: {bl(30)}.', s['checkbox']))

    story.append(Paragraph("V. Payment Amount.", s['section']))
    story.append(Paragraph(
        'The Client agrees to pay the Service Provider the following compensation: (check one)', s['body']))
    story.append(Paragraph(f'{cb()} - ${bl(10)} / Hour', s['checkbox']))
    story.append(Paragraph(f'{cb()} - ${bl(10)} / Visit', s['checkbox']))
    story.append(Paragraph(f'[X] - {pay} / Month (flat fee)', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Other: {bl(30)}.', s['checkbox']))
    story.append(Paragraph('Hereinafter known as the "Payment Amount".', s['body']))

    story.append(Paragraph("VI. Payment Method.", s['section']))
    story.append(Paragraph('The Client shall pay the Payment Amount: (check one)', s['body']))
    story.append(Paragraph(f'{cb()} - When Invoiced', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Weekly', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Monthly', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Other: {bl(30)}.', s['checkbox']))

    story.append(Paragraph("VII. Inspection of Services.", s['section']))
    story.append(Paragraph(
        'Any payment shall be subject to the Client inspecting the completed Services. If any Services '
        'are found to be defective or incomplete, the Client shall notify the Service Provider in writing, '
        'and the Service Provider shall promptly correct such work within a reasonable time.', s['body']))

    story.append(Paragraph("VIII. Parts and Materials.", s['section']))
    story.append(Paragraph(
        'Parts and materials required to perform the Services shall be: (check one)', s['body']))
    story.append(Paragraph(f'{cb()} - Supplied by the Service Provider (included in the Payment Amount).', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Supplied by the Client.', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Agreed upon mutually on a case-by-case basis.', s['checkbox']))

    story.append(Paragraph("IX. Confidentiality.", s['section']))
    story.append(Paragraph(
        'Service Provider acknowledges and agrees that all financial records, client lists, and business '
        'information related to the Client are confidential ("Confidential Information") and shall not '
        'be disclosed to any third party during or after the term of this Agreement.', s['body']))

    story.append(Paragraph("X. Independent Contractor Status.", s['section']))
    story.append(Paragraph(
        'Service Provider acknowledges that he/she/they are an independent contractor and not an employee, '
        'agent, partner, or joint venturer of the Client.', s['body']))

    story.append(Paragraph("XI. Governing Law.", s['section']))
    story.append(Paragraph(
        'This Agreement shall be governed by and construed in accordance with the laws of the '
        'Republic of Turkey.', s['body']))

    story.append(Paragraph("XII. Additional Terms & Conditions.", s['section']))
    story.append(Paragraph(f'{bl(70)}', s['body']))
    story.append(Paragraph(f'{bl(70)}', s['body']))

    story.append(Paragraph("XIII. Entire Agreement.", s['section']))
    story.append(Paragraph(
        'This Agreement constitutes the entire agreement between the Parties and supersedes all prior '
        'agreements. No amendment shall be binding unless executed in writing by both Parties.', s['body']))

    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.black))
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        f"<b>Client&apos;s Signature</b> {client_name}     Date {_pxml(_agreement_today())}", s['sign']))
    story.append(Paragraph(f'Print Name {client_name}', s['sign_sub']))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        f"<b>Service Provider Signature</b> RateGuard     Date {_pxml(_agreement_today())}", s['sign']))
    story.append(Paragraph(f'Print Name RateGuard', s['sign_sub']))

    return story


# =============================================================================
# 3. SERVICE CONTRACT
# =============================================================================
def service_contract(styles, calc):
    s = styles
    story = []

    story.append(Paragraph("SERVICE CONTRACT", s['title']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.black))
    story.append(Spacer(1, 10))

    made = _pxml(_agreement_today())
    client_name = _pxml(calc.get("company_name") or "Client")
    provider_addr = "Istanbul, Turkey"
    pay = _pxml(_money_line(calc))
    end_disp = _pxml(_end_pretty(calc) or (calc.get("end_date") or "—"))

    story.append(Paragraph(
        f'<b>I. The Parties.</b> This Service Contract ("Agreement") made {made}, '
        f'is by and between:', s['body']))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        f'<u>Service Provider:</u> RateGuard, with a mailing address of {provider_addr} ("Service Provider"), and',
        s['indent']))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        f'<u>Client:</u> {client_name}, with a mailing address as per company records ("Client").',
        s['indent']))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        'Service Provider and Client are each referred to herein as a "Party" and, collectively, as the "Parties."',
        s['body']))
    story.append(Paragraph(
        'NOW, THEREFORE, FOR AND IN CONSIDERATION of the mutual promises and agreements contained herein, '
        'the Client hires the Service Provider to work under the terms and conditions hereby agreed upon by the Parties:',
        s['body']))

    story.append(Paragraph("II. Term.", s['section']))
    story.append(Paragraph(
        f'The term of this Agreement shall commence on {made}, and terminate: (check one)', s['body']))
    story.append(Paragraph(f'{cb()} - At-Will. Written notice of at least thirty (30) days.', s['checkbox']))
    story.append(Paragraph(f'[X] - End Date. On {end_disp}.', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Other: {bl(30)}.', s['checkbox']))

    story.append(Paragraph("III. The Service.", s['section']))
    story.append(Paragraph('The Service Provider agrees to provide the following:', s['body']))
    story.append(Paragraph(f'{bl(70)}', s['body']))
    story.append(Paragraph(f'{bl(70)}', s['body']))
    story.append(Paragraph(f'{bl(70)}', s['body']))
    story.append(Paragraph('Hereinafter known as the "Service".', s['body']))
    story.append(Paragraph(
        'The Service Provider shall, while performing the Service, comply with the policies, standards, '
        'and regulations of the Client, including local, State, and Federal laws and to the best of their abilities.',
        s['body']))

    story.append(Paragraph("IV. Payment Amount.", s['section']))
    story.append(Paragraph(
        'The Client agrees to pay the Service Provider the following compensation for the Service '
        'performed under this Agreement: (check one)', s['body']))
    story.append(Paragraph(f'{cb()} - ${bl(10)} / Hour', s['checkbox']))
    story.append(Paragraph(f'{cb()} - ${bl(10)} / per Job.', s['checkbox']))
    story.append(Paragraph(
        f'[X] - Fixed renewal amount: {pay} for the contract period (inclusive of applicable adjustment).',
        s['checkbox']))
    story.append(Paragraph(f'{cb()} - Other: {bl(30)}.', s['checkbox']))
    story.append(Paragraph('Hereinafter known as the "Payment Amount".', s['body']))

    story.append(Paragraph("V. Payment Method.", s['section']))
    story.append(Paragraph('The Client shall pay the Payment Amount: (check one)', s['body']))
    story.append(Paragraph(f'{cb()} - When Invoiced', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Daily', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Weekly', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Bi-Weekly', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Monthly', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Other: {bl(30)}.', s['checkbox']))
    story.append(Paragraph(
        'The Payment Amount and Payment Method collectively shall be referred to as "Compensation".', s['body']))

    story.append(Paragraph("VI. Retainer.", s['section']))
    story.append(Paragraph('This Agreement requires: (check one)', s['body']))
    story.append(Paragraph(
        f'{cb()} - A Retainer. Client agrees to pay a retainer of ${bl(10)} as an advance on future Services.',
        s['checkbox']))
    story.append(Paragraph(f'      {cb()} - Retainer is refundable.', s['checkbox']))
    story.append(Paragraph(f'      {cb()} - Retainer is non-refundable.', s['checkbox']))
    story.append(Paragraph(
        f'{cb()} - No Retainer. The Client is not required to pay a retainer before work commences.',
        s['checkbox']))

    story.append(Paragraph("VII. Inspection of Services.", s['section']))
    story.append(Paragraph(
        'Any Compensation shall be subject to the Client inspecting the completed Services of the '
        'Service Provider. If any Services are defective or incomplete, the Client shall notify the '
        'Service Provider, who shall promptly correct such work within a reasonable time.', s['body']))

    story.append(Paragraph("VIII. Return of Property.", s['section']))
    story.append(Paragraph(
        'Upon termination of this Agreement, all property provided by the Client, including but not '
        'limited to equipment, supplies, and uniforms, must be returned by the Service Provider. '
        'Failure to do so may result in a delay in any final payment.', s['body']))

    story.append(Paragraph("IX. Time is of the Essence.", s['section']))
    story.append(Paragraph(
        'Service Provider acknowledges that time is of the essence in regard to the performance of all Services.',
        s['body']))

    story.append(Paragraph("X. Confidentiality.", s['section']))
    story.append(Paragraph(
        'Service Provider acknowledges and agrees that all financial and accounting records, client and '
        'customer lists, and any other data related to the Client\'s business is confidential '
        '("Confidential Information") and shall not be disclosed during or after the term of this Agreement '
        'without prior written consent of the Client.', s['body']))

    story.append(Paragraph("XI. Taxes.", s['section']))
    story.append(Paragraph(
        'Service Provider shall pay and be solely responsible for all withholdings, including Social '
        'Security, State unemployment, State and Federal income taxes, and any other applicable '
        'tax obligations arising from the Services performed.', s['body']))

    story.append(Paragraph("XII. Independent Contractor Status.", s['section']))
    story.append(Paragraph(
        'Service Provider acknowledges that he/she/they are an independent contractor and not an agent, '
        'partner, joint venturer, nor an employee of the Client. Service Provider shall have no authority '
        'to bind or obligate the Client in any manner.', s['body']))

    story.append(Paragraph("XIII. Safety.", s['section']))
    story.append(Paragraph(
        'Service Provider shall, at their own expense, be solely responsible for protecting all persons '
        'from risk of death, injury, or bodily harm arising from the Services or the Work Site. '
        'Service Provider shall comply with all OSHA regulations and applicable federal law.', s['body']))

    story.append(Paragraph("XIV. Governing Law.", s['section']))
    story.append(Paragraph(
        'This Agreement shall be governed by and construed in accordance with the laws of the '
        'Republic of Turkey.', s['body']))

    story.append(Paragraph("XV. Additional Terms & Conditions.", s['section']))
    story.append(Paragraph(f'{bl(70)}', s['body']))
    story.append(Paragraph(f'{bl(70)}', s['body']))

    story.append(Paragraph("XVI. Entire Agreement.", s['section']))
    story.append(Paragraph(
        'This Agreement constitutes the entire agreement between the Parties and supersedes all prior '
        'contemporaneous agreements, representations, and understandings. No supplement, modification, '
        'or amendment shall be binding unless executed in writing by all Parties.', s['body']))

    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.black))
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        f"<b>Client&apos;s Signature</b> {client_name}     Date {_pxml(_agreement_today())}", s['sign']))
    story.append(Paragraph(f'Print Name {client_name}', s['sign_sub']))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        f"<b>Service Provider Signature</b> RateGuard     Date {_pxml(_agreement_today())}", s['sign']))
    story.append(Paragraph(f'Print Name RateGuard', s['sign_sub']))

    return story


# =============================================================================
# 4. SUPPLY AGREEMENT
# =============================================================================
def supply_agreement(styles, calc):
    s = styles
    story = []

    story.append(Paragraph("SUPPLY AGREEMENT", s['title']))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.black))
    story.append(Spacer(1, 10))

    made = _pxml(_agreement_today())
    buyer_name = _pxml(calc.get("company_name") or "Buyer")
    supplier_addr = "Istanbul, Turkey"
    pay = _pxml(_money_line(calc))
    end_disp = _pxml(_end_pretty(calc) or (calc.get("end_date") or "—"))

    story.append(Paragraph(
        f'<b>I. The Parties.</b> This Supply Agreement ("Agreement") made {made}, '
        f'is by and between:', s['body']))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        f'<u>Supplier:</u> RateGuard, with a mailing address of {supplier_addr} ("Supplier"), and',
        s['indent']))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        f'<u>Buyer:</u> {buyer_name}, with a mailing address as per company records ("Buyer").',
        s['indent']))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        'Supplier and Buyer are each referred to herein as a "Party" and, collectively, as the "Parties."',
        s['body']))
    story.append(Paragraph(
        'NOW, THEREFORE, FOR AND IN CONSIDERATION of the mutual promises and agreements contained herein, '
        'the Buyer engages the Supplier to provide goods and/or services under the following terms and conditions:',
        s['body']))

    story.append(Paragraph("II. Term.", s['section']))
    story.append(Paragraph(
        f'This Agreement shall commence on {made}, and terminate: (check one)', s['body']))
    story.append(Paragraph(f'{cb()} - At-Will. Written notice of at least thirty (30) days.', s['checkbox']))
    story.append(Paragraph(f'[X] - End Date. On {end_disp}.', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Other: {bl(30)}.', s['checkbox']))

    story.append(Paragraph("III. Scope of Supply.", s['section']))
    story.append(Paragraph(
        'The Supplier agrees to supply the following goods and/or services:', s['body']))
    story.append(Paragraph(f'{bl(70)}', s['body']))
    story.append(Paragraph(f'{bl(70)}', s['body']))
    story.append(Paragraph(f'{bl(70)}', s['body']))
    story.append(Paragraph('Hereinafter known as the "Supply".', s['body']))
    story.append(Paragraph(
        'The Supplier shall, while providing the Supply, comply with the policies, standards, and '
        'regulations of the Buyer, including all applicable local, state, and federal laws.', s['body']))

    story.append(Paragraph("IV. Price.", s['section']))
    story.append(Paragraph('The Buyer agrees to pay the Supplier the following: (check one)', s['body']))
    story.append(Paragraph(f'{cb()} - Unit Price: per agreed unit', s['checkbox']))
    story.append(Paragraph(f'[X] - Lump Sum: {pay} for the entire Supply (renewal-adjusted total).', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Other: {bl(30)}.', s['checkbox']))
    story.append(Paragraph('Hereinafter known as the "Contract Price".', s['body']))

    story.append(Paragraph("V. Payment Terms.", s['section']))
    story.append(Paragraph('The Buyer shall pay the Contract Price as follows: (check one)', s['body']))
    story.append(Paragraph(f'{cb()} - Upfront / prior to delivery', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Upon delivery', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Within {bl(6)} days of invoice date', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Other: {bl(30)}.', s['checkbox']))

    story.append(Paragraph("VI. Delivery.", s['section']))
    story.append(Paragraph(
        f'Delivery address: As agreed in writing between the Parties.', s['body']))
    story.append(Paragraph(f'Estimated completion / delivery by end of term: {end_disp}', s['body']))
    story.append(Paragraph('Delivery method: (check one)', s['body']))
    story.append(Paragraph(f'{cb()} - Delivered by Supplier (shipping included)', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Collected by Buyer', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Third-party carrier: {bl(25)}', s['checkbox']))

    story.append(Paragraph("VII. Inspection and Acceptance.", s['section']))
    story.append(Paragraph(
        f'The Buyer shall inspect all delivered goods within {bl(6)} business days of receipt. '
        'If any goods fail to conform to the agreed specifications or quality standards, the Buyer '
        'shall notify the Supplier in writing, and the Supplier shall remedy the non-conformance '
        'within a reasonable time.', s['body']))

    story.append(Paragraph("VIII. Warranty.", s['section']))
    story.append(Paragraph('The Supplier offers the following warranty: (check one)', s['body']))
    story.append(Paragraph(f'{cb()} - {bl(6)}-month warranty from date of delivery', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Manufacturer\'s warranty applies', s['checkbox']))
    story.append(Paragraph(f'{cb()} - No warranty provided', s['checkbox']))
    story.append(Paragraph(f'{cb()} - Other: {bl(30)}.', s['checkbox']))

    story.append(Paragraph("IX. Confidentiality.", s['section']))
    story.append(Paragraph(
        'Both Parties agree to keep all trade secrets and confidential business information '
        '("Confidential Information") learned under this Agreement strictly confidential and shall '
        'not disclose such information to any third party, both during and after the term of this Agreement.',
        s['body']))

    story.append(Paragraph("X. Force Majeure.", s['section']))
    story.append(Paragraph(
        'Neither Party shall be liable for delays or failures in performance resulting from causes '
        'beyond their reasonable control, including natural disasters, war, pandemic, or government '
        'actions. The affected Party shall notify the other Party in writing without delay.', s['body']))

    story.append(Paragraph("XI. Default.", s['section']))
    story.append(Paragraph(
        'In the event of default under this Agreement, the defaulting Party shall reimburse the '
        'non-defaulting Party for all costs and expenses reasonably incurred, including attorney\'s fees. '
        'The prevailing Party in any dispute shall be entitled to recover reasonable legal costs.', s['body']))

    story.append(Paragraph("XII. Governing Law.", s['section']))
    story.append(Paragraph(
        'This Agreement shall be governed by and construed in accordance with the laws of the '
        'Republic of Turkey.', s['body']))

    story.append(Paragraph("XIII. Additional Terms & Conditions.", s['section']))
    story.append(Paragraph(f'{bl(70)}', s['body']))
    story.append(Paragraph(f'{bl(70)}', s['body']))

    story.append(Paragraph("XIV. Entire Agreement.", s['section']))
    story.append(Paragraph(
        'This Agreement constitutes the entire agreement between the Parties and supersedes all prior '
        'agreements, representations, and understandings. No amendment shall be binding unless executed '
        'in writing by both Parties.', s['body']))

    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.black))
    story.append(Spacer(1, 10))

    story.append(Paragraph(
        f"<b>Buyer&apos;s Signature</b> {buyer_name}     Date {_pxml(_agreement_today())}", s['sign']))
    story.append(Paragraph(f'Print Name {buyer_name}', s['sign_sub']))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        f"<b>Supplier&apos;s Signature</b> RateGuard     Date {_pxml(_agreement_today())}", s['sign']))
    story.append(Paragraph(f'Print Name RateGuard', s['sign_sub']))

    return story


# =============================================================================
# MAIN
# =============================================================================
if __name__ == "__main__":
    import os
    os.makedirs("/mnt/user-data/outputs", exist_ok=True)

    build_doc("/mnt/user-data/outputs/lease_agreement.pdf", lease_agreement)
    build_doc("/mnt/user-data/outputs/maintenance_agreement.pdf", maintenance_agreement)
    build_doc("/mnt/user-data/outputs/service_contract.pdf", service_contract)
    build_doc("/mnt/user-data/outputs/supply_agreement.pdf", supply_agreement)

    print("\nAll contracts created successfully.")
