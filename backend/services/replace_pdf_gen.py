import re
import os

with open('backend/services/pdf_generator.py', 'r', encoding='utf-8') as f:
    code = f.read()

# Find where generate_addendum_pdf starts
start_idx = code.find('def generate_addendum_pdf(calc):')

new_func = """def generate_addendum_pdf(calc):
    \"\"\"
    Generate PDF based on contract_type from template.
    \"\"\"
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2.5 * cm, rightMargin=2.5 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm,
    )

    from services.contract_templates import get_styles, lease_agreement, maintenance_agreement, service_contract, supply_agreement
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
"""

# We just replace everything from start_idx to the end of file with new_func
if start_idx != -1:
    code = code[:start_idx] + new_func
    with open('backend/services/pdf_generator.py', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Success")
else:
    print("Function not found")
