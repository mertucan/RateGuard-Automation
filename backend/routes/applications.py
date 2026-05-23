from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request
from services.auth_middleware import login_required, role_required
from services.supabase_client import supabase

applications_bp = Blueprint("applications", __name__)


@applications_bp.route("/api/applications", methods=["GET"])
@login_required
def list_applications():
    user = g.current_user
    role = user.get("role")

    try:
        query = supabase.table("applications").select(
            "*, applicant:users!applications_applicant_user_id_fkey(id, full_name, email),"
            " company:companies!applications_target_company_id_fkey(id, company_name)"
        )

        if role == "user":
            query = query.eq("applicant_user_id", user["id"])
        elif role in ("company_admin", "finance", "sales", "hr"):
            if not user.get("company_id"):
                return jsonify([])
            query = query.eq("target_company_id", user["company_id"])
        # super_admin sees all

        result = query.order("created_at", desc=True).execute()
        return jsonify(result.data or [])
    except Exception as e:
        print(f"[applications] list error: {e}")
        return jsonify({"error": str(e)}), 500


@applications_bp.route("/api/applications", methods=["POST"])
@role_required("user")
def create_application():
    user = g.current_user
    body = request.get_json() or {}

    if user.get("company_id"):
        return jsonify({"error": "Assigned company users cannot submit department applications"}), 403

    target_company_id = body.get("target_company_id")
    target_department = body.get("target_department")
    message = (body.get("message") or "").strip()

    if not target_company_id or not target_department:
        return jsonify({"error": "target_company_id and target_department are required"}), 400
    if target_department not in ("sales", "finance", "hr"):
        return jsonify({"error": "Department must be 'sales', 'finance' or 'hr'"}), 400

    try:
        # Prevent duplicate pending application
        existing = (
            supabase.table("applications")
            .select("id")
            .eq("applicant_user_id", user["id"])
            .eq("target_company_id", target_company_id)
            .eq("target_department", target_department)
            .eq("status", "pending")
            .limit(1)
            .execute()
        )
        if existing.data:
            return jsonify({"error": "You already have a pending application to this department."}), 409

        company_res = (
            supabase.table("companies")
            .select("id, company_name, authorized_email")
            .eq("id", target_company_id)
            .limit(1)
            .execute()
        )
        if not company_res.data:
            return jsonify({"error": "Company not found"}), 404

        company = company_res.data[0]

        data = {
            "applicant_user_id": user["id"],
            "target_company_id": target_company_id,
            "target_department": target_department,
            "message": message or None,
            "status": "pending",
        }
        result = supabase.table("applications").insert(data).execute()
        application = result.data[0]

        # Send notification email to company admin, company HR users, and control CC.
        try:
            admin_res = (
                supabase.table("users")
                .select("email, full_name")
                .eq("company_id", target_company_id)
                .eq("role", "company_admin")
                .limit(1)
                .execute()
            )
            admin_email = admin_res.data[0]["email"] if admin_res.data else "mertucan44@gmail.com"
            hr_res = (
                supabase.table("users")
                .select("email")
                .eq("company_id", target_company_id)
                .eq("role", "hr")
                .execute()
            )
            hr_emails = [
                row.get("email")
                for row in (hr_res.data or [])
                if row.get("email") and row.get("email") != admin_email
            ]

            from services.email_service import send_application_notification_email, send_application_submitted_email
            send_application_notification_email(
                to_email=admin_email,
                applicant_name=user["full_name"],
                applicant_email=user["email"],
                company_name=company["company_name"],
                department=target_department,
                message=message,
                application_id=application["id"],
                cc_emails=hr_emails,
            )
            send_application_submitted_email(
                to_email=user["email"],
                applicant_name=user["full_name"],
                company_name=company["company_name"],
                department=target_department,
                message=message,
            )
            from services.notification_service import notify_company_users

            notify_company_users(
                target_company_id,
                "New department application",
                f"{user['full_name']} applied to join the {target_department} department.",
                roles=("company_admin", "hr"),
                action_url="/application-management",
                category="application",
                notification_type="info",
                event_key=f"application-submitted:{application['id']}",
                metadata={"application_id": application["id"], "department": target_department},
            )
        except Exception as email_err:
            print(f"[applications] Notification/email error: {email_err}")

        return jsonify(application), 201
    except Exception as e:
        print(f"[applications] create error: {e}")
        return jsonify({"error": str(e)}), 500


@applications_bp.route("/api/applications/<app_id>", methods=["PUT"])
@role_required("company_admin", "super_admin", "hr")
def review_application(app_id):
    user = g.current_user
    body = request.get_json() or {}
    status = body.get("status")
    reviewer_message = (body.get("reviewer_message") or "").strip()

    if status not in ("approved", "rejected"):
        return jsonify({"error": "Status must be 'approved' or 'rejected'"}), 400
    if len(reviewer_message) > 1200:
        return jsonify({"error": "Reviewer message must be 1200 characters or fewer"}), 400

    try:
        app_res = (
            supabase.table("applications")
            .select(
                "*, applicant:users!applications_applicant_user_id_fkey(id, full_name, email),"
                " company:companies!applications_target_company_id_fkey(id, company_name)"
            )
            .eq("id", app_id)
            .limit(1)
            .execute()
        )
        if not app_res.data:
            return jsonify({"error": "Application not found"}), 404

        application = app_res.data[0]

        if user.get("role") in ("company_admin", "hr") and str(user.get("company_id")) != str(application.get("target_company_id")):
            return jsonify({"error": "You can only manage applications for your company"}), 403

        update_data = {
            "status": status,
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "reviewed_by_user_id": user["id"],
        }

        if status == "approved":
            supabase.table("users").update({
                "company_id": application["target_company_id"],
                "role": application["target_department"],
            }).eq("id", application["applicant_user_id"]).execute()

        result = supabase.table("applications").update(update_data).eq("id", app_id).execute()
        if status == "approved":
            supabase.table("applications").delete().eq(
                "applicant_user_id",
                application["applicant_user_id"],
            ).neq("id", app_id).execute()
        try:
            from services.notification_service import notify_user

            notify_user(
                application.get("applicant_user_id"),
                f"Application {status}",
                reviewer_message
                or f"Your application to the {application.get('target_department')} department has been {status}.",
                company_id=application.get("target_company_id"),
                action_url="/dashboard" if status == "approved" else "/applications",
                category="application",
                notification_type="success" if status == "approved" else "warning",
                event_key=f"application-reviewed:{app_id}:{status}",
                metadata={"application_id": app_id, "status": status},
            )
        except Exception as notification_err:
            print(f"[applications] Notification error: {notification_err}")
        try:
            from services.email_service import send_application_reviewed_email

            applicant = application.get("applicant") or {}
            company = application.get("company") or {}
            if applicant.get("email"):
                send_application_reviewed_email(
                    to_email=applicant.get("email"),
                    applicant_name=applicant.get("full_name"),
                    company_name=company.get("company_name") or "the company",
                    department=application.get("target_department"),
                    status=status,
                    reviewer_message=reviewer_message,
                )
        except Exception as email_err:
            print(f"[applications] Review email error: {email_err}")
        return jsonify(result.data[0])
    except Exception as e:
        print(f"[applications] review error: {e}")
        return jsonify({"error": str(e)}), 500
