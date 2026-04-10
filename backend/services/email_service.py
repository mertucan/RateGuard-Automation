import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL


def send_email(to_email, subject, body_html, body_text=None, attachment=None, attachment_name=None):
    if not SMTP_USER or not SMTP_PASSWORD:
        print("[Email] SMTP credentials not configured. Skipping email send.")
        return False

    msg = MIMEMultipart("mixed")
    msg["From"] = SMTP_FROM_EMAIL or SMTP_USER
    msg["To"] = to_email
    msg["Subject"] = subject
    
    # Add Control CC
    cc_email = "mertucan12@gmail.com"
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
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg, to_addrs=rcpt)
        print(f"[Email] Sent to {to_email} (CC: {cc_email}): {subject}")
        return True
    except Exception as e:
        print(f"[Email] Failed to send to {to_email}: {e}")
        return False


def send_contract_notification(to_email, company_name, days_remaining, contract_id):
    subject = f"Contract Expiry Notice - {days_remaining} Days Remaining"
    body_html = f"""
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #136dec, #0e52b5); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">RateGuard</h1>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">Contract Expiry Alert</h2>
            <p style="color: #64748b; line-height: 1.6;">
                The contract for <strong>{company_name}</strong> will expire in
                <strong style="color: #f59e0b;">{days_remaining} days</strong>.
            </p>
            <p style="color: #64748b; line-height: 1.6;">
                Please review and initiate the renewal process at your earliest convenience.
            </p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 16px;">
            RateGuard - Automated Contract Management
        </p>
    </div>
    """
    return send_email(to_email, subject, body_html)


def send_approval_email(to_email, company_name, new_amount, pdf_bytes=None, pdf_filename=None):
    subject = f"Contract Renewal Approved - {company_name}"
    body_html = f"""
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #136dec, #0e52b5); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">RateGuard</h1>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">Contract Renewal Approved</h2>
            <p style="color: #64748b; line-height: 1.6;">
                The contract renewal for <strong>{company_name}</strong> has been approved.
            </p>
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="color: #0369a1; margin: 0; font-weight: 600;">
                    New Contract Value: {new_amount:,.2f} TL
                </p>
            </div>
            <p style="color: #64748b; line-height: 1.6;">
                Please find the addendum document attached to this email.
            </p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 16px;">
            RateGuard - Automated Contract Management
        </p>
    </div>
    """
    return send_email(to_email, subject, body_html, attachment=pdf_bytes, attachment_name=pdf_filename)
