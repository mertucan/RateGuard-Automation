import smtplib
import re
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config import SMTP_FROM_EMAIL, SMTP_HOST, SMTP_PASSWORD, SMTP_PORT, SMTP_USER


def send_email(
    to_email, subject, body_html, body_text=None, attachment=None, attachment_name=None
):
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

    # Add Control CC
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
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg, to_addrs=rcpt)
        print(f"[Email] Sent to {to_email} (CC: {cc_email}): {subject}")
        return True
    except Exception as e:
        print(f"[Email] Failed to send to {to_email}: {e}")
        return False


def send_contract_created_email(to_email, tenant_name, company_name, contract_id, previous_amount, end_date):
    subject = f"New Contract Created — {company_name}"
    formatted_amount = f"{previous_amount:,.2f} TL" if previous_amount is not None else "—"
    end_date_str = end_date if end_date else "N/A"
    body_html = f"""
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #136dec, #0e52b5); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">RateGuard</h1>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">New Contract Created</h2>
            <p style="color: #64748b; line-height: 1.6;">
                A new contract has been created by <strong>{tenant_name}</strong> for <strong>{company_name}</strong>.
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0 0 8px 0; color: #334155; font-size: 14px;">
                    <strong>Previous Amount:</strong> {formatted_amount}
                </p>
                <p style="margin: 0; color: #334155; font-size: 14px;">
                    <strong>End Date:</strong> {end_date_str}
                </p>
            </div>
            <p style="color: #64748b; line-height: 1.6;">
                The contract is currently in <strong>Active</strong> state. You will be notified when it requires review.
            </p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
                Contract reference: {contract_id}
            </p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 16px;">
            RateGuard - Automated Contract Management
        </p>
    </div>
    """
    return send_email(to_email, subject, body_html)


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


def send_approval_email(
    to_email, company_name, new_amount, pdf_bytes=None, pdf_filename=None
):
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
    return send_email(
        to_email, subject, body_html, attachment=pdf_bytes, attachment_name=pdf_filename
    )


def send_client_review_email(
    to_email, company_name, tenant_name, contract_id, new_amount,
    custom_subject=None, custom_body=None, sender_name=None, sender_email=None
):
    subject = custom_subject if custom_subject else f"Contract Renewal for Review — {company_name}"
    formatted_amount = f"{new_amount:,.2f} TL" if new_amount is not None else "—"
    
    if custom_body:
        custom_body_html = custom_body.replace('\n', '<br>')
    else:
        custom_body_html = f"""
            <p style="color: #64748b; line-height: 1.6; margin: 0;">
                <strong>{tenant_name}</strong> has prepared a contract renewal for
                <strong>{company_name}</strong> and it is now awaiting your approval.
            </p>
        """

    sender_info_html = ""
    if sender_name:
        sender_info_html = f"""
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                <p style="color: #475569; margin: 0; font-size: 14px;"><strong>Sent by:</strong> {sender_name} ({tenant_name})</p>
                {f'<p style="color: #64748b; margin: 4px 0 0 0; font-size: 12px;">{sender_email}</p>' if sender_email else ''}
            </div>
        """

    body_html = f"""
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #136dec, #0e52b5); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">RateGuard</h1>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">Contract Renewal Ready for Your Review</h2>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; color: #334155; font-size: 14px;">
                    <strong>From:</strong> {tenant_name} <br>
                    <strong>To:</strong> {company_name}
                </p>
            </div>
            
            <div style="color: #334155; line-height: 1.6; font-size: 15px; margin-bottom: 24px;">
                {custom_body_html}
            </div>

            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="color: #0369a1; margin: 0; font-weight: 600;">
                    Proposed New Contract Value: {formatted_amount}
                </p>
            </div>
            
            <p style="color: #64748b; line-height: 1.6;">
                Please log in to the RateGuard portal to review the details and either
                <strong style="color: #16a34a;">accept</strong> or
                <strong style="color: #dc2626;">reject</strong> the proposed renewal.
            </p>
            
            {sender_info_html}
            
            <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
                Contract reference: {contract_id}
            </p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 16px;">
            RateGuard - Automated Contract Management
        </p>
    </div>
    """
    return send_email(to_email, subject, body_html)


def send_mutual_approval_email(
    to_email,
    client_company,
    tenant_company,
    new_amount,
    pdf_bytes=None,
    pdf_filename=None,
):
    subject = f"Contract Approved — {client_company} & {tenant_company}"
    formatted_amount = f"{new_amount:,.2f} TL" if new_amount is not None else "—"
    body_html = f"""
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #136dec, #0e52b5); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">RateGuard</h1>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">Contract Officially Approved ✓</h2>
            <p style="color: #64748b; line-height: 1.6;">
                The contract renewal between <strong>{tenant_company}</strong> and
                <strong>{client_company}</strong> has been officially approved by both parties.
            </p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="color: #15803d; margin: 0; font-weight: 600; font-size: 16px;">
                    New Contract Value: {formatted_amount}
                </p>
            </div>
            <p style="color: #64748b; line-height: 1.6;">
                The signed addendum document is attached to this email for your records.
            </p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 16px;">
            RateGuard - Automated Contract Management
        </p>
    </div>
    """
    return send_email(
        to_email, subject, body_html, attachment=pdf_bytes, attachment_name=pdf_filename
    )


def send_finance_ready_notification(
    to_email, sales_name, finance_name, client_company_name,
    contract_id, previous_amount, new_amount, end_date, inflation_rule
):
    subject = f"Sözleşme Hazır — {client_company_name} için Sales Aksiyonu Gerekiyor"
    prev_fmt = f"{previous_amount:,.2f} TL" if previous_amount is not None else "—"
    new_fmt = f"{new_amount:,.2f} TL" if new_amount is not None else "Henüz hesaplanmadı"
    body_html = f"""
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #136dec, #0e52b5); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">RateGuard</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Finance → Sales Bildirimi</p>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">Sözleşme Hazırlığı Tamamlandı</h2>
            <p style="color: #64748b; line-height: 1.6;">
                Merhaba <strong>{sales_name}</strong>,
            </p>
            <p style="color: #64748b; line-height: 1.6;">
                Finance departmanından <strong>{finance_name}</strong>, <strong>{client_company_name}</strong> şirketi ile olan sözleşme yenileme hazırlığını tamamladı. Artık sıra sende!
            </p>
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="color: #0369a1; margin: 0 0 8px; font-size: 14px;"><strong>Sözleşme Detayları:</strong></p>
                <p style="margin: 4px 0; color: #334155; font-size: 14px;">🏢 <strong>Şirket:</strong> {client_company_name}</p>
                <p style="margin: 4px 0; color: #334155; font-size: 14px;">💰 <strong>Mevcut Tutar:</strong> {prev_fmt}</p>
                <p style="margin: 4px 0; color: #334155; font-size: 14px;">📈 <strong>Önerilen Yeni Tutar:</strong> {new_fmt}</p>
                <p style="margin: 4px 0; color: #334155; font-size: 14px;">📅 <strong>Bitiş Tarihi:</strong> {end_date}</p>
                <p style="margin: 4px 0; color: #334155; font-size: 14px;">📊 <strong>Enflasyon Kuralı:</strong> {inflation_rule}</p>
            </div>
            <p style="color: #64748b; line-height: 1.6;">
                Lütfen RateGuard portalına giriş yaparak sözleşmeyi incele ve karşı şirkete göndermek için gerekli adımları tamamla.
            </p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
                Sözleşme referansı: {contract_id}
            </p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 16px;">
            RateGuard — Otomatik Sözleşme Yönetimi
        </p>
    </div>
    """
    return send_email(to_email, subject, body_html)


def send_application_notification_email(
    to_email, applicant_name, applicant_email, company_name, department, message, application_id
):
    dept_label = {"sales": "Sales", "finance": "Finance"}.get(department, department.capitalize())
    subject = f"Yeni Başvuru — {company_name} {dept_label} Departmanına"
    msg_html = f'<p style="color: #334155; font-size: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin: 0;">{message}</p>' if message else '<p style="color: #94a3b8; font-size: 14px;">Başvuru mesajı girilmedi.</p>'
    body_html = f"""
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #136dec, #0e52b5); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">RateGuard</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Yeni Departman Başvurusu</p>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">Yeni Başvuru Alındı</h2>
            <p style="color: #64748b; line-height: 1.6;">
                <strong>{company_name}</strong> firmasının <strong>{dept_label}</strong> departmanına yeni bir başvuru yapıldı.
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0 0 8px; color: #334155; font-size: 14px;">👤 <strong>Başvuran:</strong> {applicant_name}</p>
                <p style="margin: 4px 0; color: #334155; font-size: 14px;">✉️ <strong>E-posta:</strong> {applicant_email}</p>
                <p style="margin: 4px 0; color: #334155; font-size: 14px;">🏢 <strong>Şirket:</strong> {company_name}</p>
                <p style="margin: 4px 0; color: #334155; font-size: 14px;">📁 <strong>Departman:</strong> {dept_label}</p>
            </div>
            <p style="color: #475569; font-size: 14px; margin-bottom: 8px;"><strong>Başvuru Mesajı:</strong></p>
            {msg_html}
            <p style="color: #64748b; line-height: 1.6; margin-top: 16px;">
                RateGuard portalına giriş yaparak başvuruyu onaylayabilir veya reddedebilirsiniz.
            </p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
                Başvuru referansı: {application_id}
            </p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 16px;">
            RateGuard — Otomatik Sözleşme Yönetimi
        </p>
    </div>
    """
    return send_email(to_email, subject, body_html)


def send_user_removed_email(to_email, user_name, company_name, role):
    subject = f"Account Update — {company_name}"
    body_html = f"""
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #136dec, #0e52b5); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 20px;">RateGuard</h1>
        </div>
        <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">Team Member Removal Notification</h2>
            <p style="color: #64748b; line-height: 1.6;">
                Dear <strong>{user_name}</strong>,
            </p>
            <p style="color: #64748b; line-height: 1.6;">
                This email is to notify you that you have been removed from the <strong>{company_name}</strong> team, where you previously held the role of <strong>{role}</strong>.
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0; color: #334155; font-size: 14px;">
                    Your account has not been deleted. Your role has been reverted to <strong>Client</strong>, and you can still log in to access your personal dashboard.
                </p>
            </div>
            <p style="color: #64748b; line-height: 1.6;">
                If you believe this is an error, please contact your company administrator.
            </p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 16px;">
            RateGuard - Automated Contract Management
        </p>
    </div>
    """
    return send_email(to_email, subject, body_html)
