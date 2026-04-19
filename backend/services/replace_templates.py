import re
import os
from datetime import date

with open('backend/services/contract_templates.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Add import datetime
if 'from datetime import date' not in code:
    code = 'from datetime import date\n' + code

# Replace defs
code = code.replace("def maintenance_agreement(styles):", "def maintenance_agreement(styles, calc):")
code = code.replace("def service_contract(styles):", "def service_contract(styles, calc):")
code = code.replace("def supply_agreement(styles):", "def supply_agreement(styles, calc):")

# Simple regex replacements for the signatures
import re

code = re.sub(
    r"story\.append\(Paragraph\(\n\s*f\"<b>Client's Signature</b> \{bl\(\d+\)\}     Date \{bl\(\d+\)\}\", s\['sign'\]\)\)\n\s*story\.append\(Paragraph\(f'Print Name \{bl\(\d+\)\}', s\['sign_sub'\]\)\)\n\s*story\.append\(Spacer\(1, 10\)\)\n\s*story\.append\(Paragraph\(\n\s*f\"<b>.*?Signature</b> \{bl\(\d+\)\}     Date \{bl\(\d+\)\}\", s\['sign'\]\)\)\n\s*story\.append\(Paragraph\(f'Print Name \{bl\(\d+\)\}', s\['sign_sub'\]\)\)",
    r"""
    client_name = calc.get('company_name', 'Client')
    story.append(Paragraph(f"<b>Client's Signature</b> {client_name}     Date {date.today().strftime('%d %b, %Y')}", s['sign']))
    story.append(Paragraph(f'Print Name {client_name}', s['sign_sub']))
    story.append(Spacer(1, 10))
    story.append(Paragraph(f"<b>Service Provider Signature</b> RateGuard     Date {date.today().strftime('%d %b, %Y')}", s['sign']))
    story.append(Paragraph(f'Print Name RateGuard', s['sign_sub']))""",
    code
)

code = re.sub(
    r"story\.append\(Paragraph\(\n\s*f\"<b>Buyer's Signature</b> \{bl\(\d+\)\}     Date \{bl\(\d+\)\}\", s\['sign'\]\)\)\n\s*story\.append\(Paragraph\(f'Print Name \{bl\(\d+\)\}', s\['sign_sub'\]\)\)\n\s*story\.append\(Spacer\(1, 10\)\)\n\s*story\.append\(Paragraph\(\n\s*f\"<b>.*?Signature</b> \{bl\(\d+\)\}     Date \{bl\(\d+\)\}\", s\['sign'\]\)\)\n\s*story\.append\(Paragraph\(f'Print Name \{bl\(\d+\)\}', s\['sign_sub'\]\)\)",
    r"""
    client_name = calc.get('company_name', 'Client')
    story.append(Paragraph(f"<b>Buyer's Signature</b> {client_name}     Date {date.today().strftime('%d %b, %Y')}", s['sign']))
    story.append(Paragraph(f'Print Name {client_name}', s['sign_sub']))
    story.append(Spacer(1, 10))
    story.append(Paragraph(f"<b>Supplier's Signature</b> RateGuard     Date {date.today().strftime('%d %b, %Y')}", s['sign']))
    story.append(Paragraph(f'Print Name RateGuard', s['sign_sub']))""",
    code
)

with open('backend/services/contract_templates.py', 'w', encoding='utf-8') as f:
    f.write(code)
