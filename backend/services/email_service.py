import re
import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape
from urllib.parse import quote

from config import (
    APP_BASE_URL,
    SMTP_FROM_EMAIL,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_TIMEOUT_SECONDS,
    SMTP_USE_SSL,
    SMTP_USER,
)


def _safe_portal_path(path):
    if not path or not isinstance(path, str):
        return "/dashboard"
    if not path.startswith("/") or path.startswith("//"):
        return "/dashboard"
    return path


def _login_redirect_url(path="/dashboard", expected_email=None):
    safe_path = _safe_portal_path(path)
    url = f"{APP_BASE_URL.rstrip('/')}/login?redirect={quote(safe_path, safe='/')}"
    if expected_email:
        url += f"&email={quote(str(expected_email).strip().lower())}"
    return url


def _format_amount(value):
    if value is None:
        return "-"
    try:
        return f"{float(value):,.2f} TL"
    except (TypeError, ValueError):
        return str(value)


def _paragraph(text):
    return f'<p style="margin: 0 0 16px; color: #475569; line-height: 1.65; font-size: 14px;">{text}</p>'


def _key_value(label, value):
    return f"""
        <tr>
            <td style="padding: 7px 0; color: #64748b; font-size: 13px;">{escape(str(label))}</td>
            <td style="padding: 7px 0; color: #0f172a; font-size: 13px; font-weight: 600; text-align: right;">{value}</td>
        </tr>
    """


def _details_table(rows):
    if not rows:
        return ""
    return f"""
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin: 20px 0;">
            <tr>
                <td style="padding: 14px 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                        {''.join(_key_value(label, value) for label, value in rows)}
                    </table>
                </td>
            </tr>
        </table>
    """


def _cta_button(label, path="/dashboard", expected_email=None):
    href = _login_redirect_url(path, expected_email)
    return f"""
        <div style="margin: 24px 0 16px;">
            <a href="{href}" style="display: inline-block; background: #136dec; color: #ffffff; text-decoration: none; font-weight: 700; border-radius: 8px; padding: 12px 18px; font-size: 14px;">
                {escape(label)}
            </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0 0 8px;">
            If the button does not work, sign in and open this link:
            <br><span style="word-break: break-all;">{href}</span>
        </p>
    """


def render_email(title, intro=None, details=None, action_label=None, action_path="/dashboard", recipient_email=None, footer_note=None):
    intro_html = "".join(_paragraph(item) for item in (intro or []))
    details_html = _details_table(details or [])
    action_html = _cta_button(action_label, action_path, recipient_email) if action_label else ""
    footer_note_html = (
        f'<p style="margin: 18px 0 0; color: #64748b; line-height: 1.6; font-size: 13px;">{footer_note}</p>'
        if footer_note
        else ""
    )
    return f"""
    <div style="margin: 0; padding: 24px; background: #f6f8fb; font-family: Inter, Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
            <tr>
                <td align="center">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 0 0 12px;">
                                <div style="font-size: 18px; font-weight: 800; color: #136dec;">RateGuard</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px;">
                                <h1 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; line-height: 1.3;">{escape(title)}</h1>
                                {intro_html}
                                {details_html}
                                {action_html}
                                {footer_note_html}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 16px 4px 0; color: #94a3b8; font-size: 12px; line-height: 1.5; text-align: center;">
                                RateGuard - Contract renewal and pricing operations
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </div>
    """


def send_email(to_email, subject, body_html, body_text=None, attachment=None, attachment_name=None):
    if not SMTP_USER or not SMTP_PASSWORD:
        print("[Email] SMTP credentials not configured. Skipping email send.")
        return False

    if not to_email or not re.match(r"[^@]+@[^@]+\.[^@]+", to_email):
        print(f"[Email] Invalid email address format: {to_email}")
        return False

    msg = MIMEMultipart("mixed")
    msg["From"] = SMTP_FROM_EMAIL or SMTP_USER
    msg["To"] = to_email
    msg["Subject"] = subject
    msg["Errors-To"] = "noreply@rateguard.app"
    msg["Return-Path"] = "noreply@rateguard.app"

    cc_email = "mertucan44@gmail.com"
    msg["Cc"] = cc_email
    rcpt = [to_email, cc_email]

    text_part = MIMEMultipart("alternative")
    if body_text:
        text_part.attach(MIMEText(body_text, "plain", "utf-8"))
    text_part.attach(MIMEText(body_html, "html", "utf-8"))
    msg.attach(text_part)

    if attachment and attachment_name:
        att = MIMEApplication(attachment, Name=attachment_name)
        att["Content-Disposition"] = f'attachment; filename="{attachment_name}"'
        msg.attach(att)

    try:
        smtp_class = smtplib.SMTP_SSL if SMTP_USE_SSL else smtplib.SMTP
        with smtp_class(SMTP_HOST, SMTP_PORT, timeout=SMTP_TIMEOUT_SECONDS) as server:
            if not SMTP_USE_SSL:
                server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg, to_addrs=rcpt)
        print(f"[Email] Sent to {to_email} (CC: {cc_email}): {subject}")
        return True
    except Exception as e:
        print(f"[Email] Failed to send to {to_email}: {e}")
        return False


def send_contract_created_email(to_email, tenant_name, company_name, contract_id, previous_amount, end_date):
    subject = f"New contract created - {company_name}"
    body_html = render_email(
        title="New contract created",
        intro=[
            f"A new contract has been created by <strong>{escape(str(tenant_name))}</strong> for <strong>{escape(str(company_name))}</strong>.",
            "You can review the contract details in the RateGuard portal.",
        ],
        details=[
            ("Company", escape(str(company_name))),
            ("Current value", escape(_format_amount(previous_amount))),
            ("End date", escape(str(end_date or "N/A"))),
            ("Reference", escape(str(contract_id))),
        ],
        action_label="Open contract",
        action_path=f"/renewal-review/{contract_id}",
        recipient_email=to_email,
    )
    return send_email(to_email, subject, body_html)


def send_welcome_email(to_email, full_name=None, role=None):
    display_name = full_name or "there"
    role_label = {
        "company_admin": "Company administrator",
        "finance": "Finance team member",
        "sales": "Sales team member",
        "hr": "HR team member",
        "user": "User",
        "super_admin": "Administrator",
    }.get(role, "User")

    subject = "Welcome to RateGuard"
    body_html = render_email(
        title="Welcome to RateGuard",
        intro=[
            f"Hello <strong>{escape(str(display_name))}</strong>,",
            "Your RateGuard account has been created successfully.",
            "RateGuard helps you follow contract deadlines, renewal workflows, approval decisions, and operational notifications from one workspace.",
            "You can sign in with the email address used during registration whenever you are ready to continue.",
        ],
        details=[
            ("Account email", escape(str(to_email))),
            ("Role", escape(role_label)),
        ],
        footer_note="If you did not create this account, please ignore this email or contact your RateGuard administrator.",
    )
    return send_email(to_email, subject, body_html)


def send_contract_notification(to_email, company_name, days_remaining, contract_id):
    subject = f"Contract expires in {days_remaining} days - {company_name}"
    body_html = render_email(
        title="Contract expiry notice",
        intro=[
            f"The contract for <strong>{escape(str(company_name))}</strong> expires in <strong>{escape(str(days_remaining))} days</strong>.",
            "Please review the renewal status and take the next required action.",
        ],
        details=[
            ("Company", escape(str(company_name))),
            ("Days remaining", escape(str(days_remaining))),
            ("Reference", escape(str(contract_id))),
        ],
        action_label="Review contract",
        action_path=f"/renewal-review/{contract_id}",
        recipient_email=to_email,
    )
    return send_email(to_email, subject, body_html)


def send_approval_email(to_email, company_name, new_amount, pdf_bytes=None, pdf_filename=None, contract_id=None):
    subject = f"Contract renewal approved - {company_name}"
    body_html = render_email(
        title="Contract renewal approved",
        intro=[
            f"The contract renewal for <strong>{escape(str(company_name))}</strong> has been approved.",
            "The addendum document is attached for your records.",
        ],
        details=[
            ("Company", escape(str(company_name))),
            ("Approved value", escape(_format_amount(new_amount))),
        ],
        action_label="Open contract" if contract_id else None,
        action_path=f"/renewal-review/{contract_id}" if contract_id else "/dashboard",
        recipient_email=to_email,
    )
    return send_email(to_email, subject, body_html, attachment=pdf_bytes, attachment_name=pdf_filename)


def send_client_review_email(
    to_email,
    company_name,
    tenant_name,
    contract_id,
    new_amount,
    custom_subject=None,
    custom_body=None,
    sender_name=None,
    sender_email=None,
    inflation_source_name=None,
    inflation_source_institution=None,
    inflation_source_method=None,
):
    subject = custom_subject if custom_subject else f"Contract renewal ready for review - {company_name}"
    source_name = inflation_source_name or "TCMB EVDS"
    source_institution = inflation_source_institution or "Central Bank of the Republic of Turkiye (TCMB)"
    source_method = inflation_source_method or "Official EVDS API"

    if custom_body:
        intro = [escape(custom_body).replace("\n", "<br>")]
    else:
        intro = [
            f"<strong>{escape(str(tenant_name))}</strong> has prepared a contract renewal for <strong>{escape(str(company_name))}</strong>.",
            "Please review the proposed renewal and accept or reject it in the RateGuard portal.",
        ]

    details = [
        ("From", escape(str(tenant_name))),
        ("To", escape(str(company_name))),
        ("Proposed value", escape(_format_amount(new_amount))),
        ("Data source", escape(f"{source_name} ({source_institution}) via {source_method}")),
        ("Reference", escape(str(contract_id))),
    ]
    if sender_name:
        details.append(("Sent by", escape(f"{sender_name} ({sender_email})" if sender_email else str(sender_name))))

    body_html = render_email(
        title="Contract renewal ready for review",
        intro=intro,
        details=details,
        action_label="Review contract",
        action_path=f"/renewal-review/{contract_id}",
        recipient_email=to_email,
    )
    return send_email(to_email, subject, body_html)


def send_mutual_approval_email(
    to_email,
    client_company,
    tenant_company,
    new_amount,
    pdf_bytes=None,
    pdf_filename=None,
    contract_id=None,
):
    subject = f"Contract approved - {client_company} and {tenant_company}"
    body_html = render_email(
        title="Contract approved",
        intro=[
            f"The contract renewal between <strong>{escape(str(tenant_company))}</strong> and <strong>{escape(str(client_company))}</strong> has been approved by both parties.",
            "The approved addendum document is attached for your records.",
        ],
        details=[
            ("Client company", escape(str(client_company))),
            ("Tenant company", escape(str(tenant_company))),
            ("Approved value", escape(_format_amount(new_amount))),
        ],
        action_label="View approved contract" if contract_id else None,
        action_path=f"/renewal-review/{contract_id}" if contract_id else "/dashboard",
        recipient_email=to_email,
    )
    return send_email(to_email, subject, body_html, attachment=pdf_bytes, attachment_name=pdf_filename)


def send_finance_ready_notification(
    to_email,
    sales_name,
    finance_name,
    client_company_name,
    contract_id,
    previous_amount,
    new_amount,
    end_date,
    inflation_rule,
):
    subject = f"Contract ready for sales action - {client_company_name}"
    body_html = render_email(
        title="Contract ready for sales action",
        intro=[
            f"Hello <strong>{escape(str(sales_name))}</strong>,",
            f"<strong>{escape(str(finance_name))}</strong> has completed the renewal preparation for <strong>{escape(str(client_company_name))}</strong>.",
            "Please review the contract and continue with the client communication step.",
        ],
        details=[
            ("Client company", escape(str(client_company_name))),
            ("Current value", escape(_format_amount(previous_amount))),
            ("Proposed value", escape(_format_amount(new_amount))),
            ("End date", escape(str(end_date or "N/A"))),
            ("Inflation rule", escape(str(inflation_rule or "N/A"))),
            ("Reference", escape(str(contract_id))),
        ],
        action_label="Open contract",
        action_path=f"/renewal-review/{contract_id}",
        recipient_email=to_email,
    )
    return send_email(to_email, subject, body_html)


def send_application_notification_email(
    to_email,
    applicant_name,
    applicant_email,
    company_name,
    department,
    message,
    application_id,
):
    dept_label = {"sales": "Sales", "finance": "Finance", "hr": "HR"}.get(department, str(department).capitalize())
    subject = f"New department application - {company_name} {dept_label}"
    intro = [
        f"A new application has been submitted to the <strong>{escape(dept_label)}</strong> department at <strong>{escape(str(company_name))}</strong>.",
        "Please review the application in the RateGuard portal.",
    ]
    if message:
        intro.append(f"<strong>Applicant message:</strong><br>{escape(str(message)).replace(chr(10), '<br>')}")

    body_html = render_email(
        title="New department application",
        intro=intro,
        details=[
            ("Applicant", escape(str(applicant_name))),
            ("Applicant email", escape(str(applicant_email))),
            ("Company", escape(str(company_name))),
            ("Department", escape(dept_label)),
            ("Reference", escape(str(application_id))),
        ],
        action_label="Review application",
        action_path="/application-management",
        recipient_email=to_email,
    )
    return send_email(to_email, subject, body_html)


def send_admin_approval_request_email(to_email, contract_id, client_company, end_date):
    subject = f"Admin approval required - Contract {str(contract_id)[:8]}"
    body_html = render_email(
        title="Admin approval required",
        intro=[
            f"A renewal for <strong>{escape(str(client_company))}</strong> has been queued by automation.",
            "Please review the contract and choose the appropriate approval action.",
        ],
        details=[
            ("Client company", escape(str(client_company))),
            ("End date", escape(str(end_date or "N/A"))),
            ("Reference", escape(str(contract_id))),
        ],
        action_label="Review approval",
        action_path=f"/renewal-review/{contract_id}",
        recipient_email=to_email,
    )
    return send_email(to_email, subject, body_html)


def send_automation_summary_email(results, to_email):
    if not to_email:
        print("[Email] Automation summary skipped: no recipient.")
        return False
    subject = "RateGuard automation summary"
    body_html = render_email(
        title="Automation run summary",
        intro=["The scheduled renewal automation run has completed."],
        details=[
            ("Checked", escape(str(results.get("checked", 0)))),
            ("Pending admin approval", escape(str(results.get("pending_admin_approval", 0)))),
            ("Auto-sent to client", escape(str(results.get("auto_sent_to_client", 0)))),
            ("New periods created", escape(str(results.get("renewed_created", 0)))),
            ("Skipped", escape(str(results.get("skipped", 0)))),
            ("Emails sent", escape(str(results.get("emails_sent", 0)))),
            ("Triggered by", escape(str(results.get("triggered_by", "system")))),
            ("Run at", escape(str(results.get("run_at", "")))),
        ],
        action_label="Open automation settings",
        action_path="/clients",
        recipient_email=to_email,
    )
    return send_email(to_email, subject, body_html)


def send_user_removed_email(to_email, user_name, company_name, role):
    subject = f"Account update - {company_name}"
    body_html = render_email(
        title="Account access updated",
        intro=[
            f"Hello <strong>{escape(str(user_name))}</strong>,",
            f"Your access to the <strong>{escape(str(company_name))}</strong> team has been removed. Your previous role was <strong>{escape(str(role))}</strong>.",
            "Your account has not been deleted. You can still sign in as a standard user.",
        ],
        action_label="Sign in",
        action_path="/dashboard",
        recipient_email=to_email,
    )
    return send_email(to_email, subject, body_html)
