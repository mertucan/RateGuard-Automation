from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request

from services.auth_middleware import login_required
from services.supabase_client import supabase

internal_chat_bp = Blueprint("internal_chat", __name__)


def _user_is_super_admin(user):
    return user.get("role") == "super_admin"


def _conversation_for_user(conversation_id, user):
    result = (
        supabase.table("internal_chat_conversations")
        .select("*")
        .eq("id", conversation_id)
        .limit(1)
        .execute()
    )
    conversation = result.data[0] if result.data else None
    if not conversation:
        return None, (jsonify({"error": "Conversation not found"}), 404)

    if _user_is_super_admin(user):
        return conversation, None

    participant = (
        supabase.table("internal_chat_participants")
        .select("id")
        .eq("conversation_id", conversation_id)
        .eq("user_id", user.get("id"))
        .limit(1)
        .execute()
    )
    if not participant.data:
        return None, (jsonify({"error": "Insufficient permissions"}), 403)
    return conversation, None


def _fetch_users_by_ids(user_ids):
    if not user_ids:
        return []
    return (
        supabase.table("users")
        .select("id, full_name, email, role, company_id, companies!users_company_id_fkey(id, company_name)")
        .in_("id", user_ids)
        .execute()
    ).data or []


def _decorate_conversations(conversations, current_user):
    if not conversations:
        return []

    conversation_ids = [c["id"] for c in conversations]
    participants = (
        supabase.table("internal_chat_participants")
        .select("conversation_id, user_id")
        .in_("conversation_id", conversation_ids)
        .execute()
    ).data or []
    user_ids = sorted({p["user_id"] for p in participants if p.get("user_id")})
    users = {u["id"]: u for u in _fetch_users_by_ids(user_ids)}

    messages = (
        supabase.table("internal_chat_messages")
        .select("id, conversation_id, sender_user_id, message_text, created_at")
        .in_("conversation_id", conversation_ids)
        .order("created_at", desc=True)
        .execute()
    ).data or []

    last_by_conversation = {}
    for message in messages:
        cid = message.get("conversation_id")
        if cid and cid not in last_by_conversation:
            last_by_conversation[cid] = message

    participants_by_conversation = {}
    for participant in participants:
        cid = participant.get("conversation_id")
        user = users.get(participant.get("user_id"))
        if not cid or not user:
            continue
        participants_by_conversation.setdefault(cid, []).append(user)

    decorated = []
    for conversation in conversations:
        cid = conversation["id"]
        conv_participants = participants_by_conversation.get(cid, [])
        display_title = conversation.get("title")
        if not display_title:
            others = [
                u.get("full_name") or u.get("email")
                for u in conv_participants
                if u.get("id") != current_user.get("id")
            ]
            display_title = ", ".join(others[:3]) or "Internal chat"

        decorated.append(
            {
                **conversation,
                "display_title": display_title,
                "participants": conv_participants,
                "last_message": last_by_conversation.get(cid),
            }
        )
    return decorated


@internal_chat_bp.route("/api/internal-chat/users", methods=["GET"])
@login_required
def list_chat_users():
    user = g.current_user
    try:
        query = supabase.table("users").select(
            "id, full_name, email, role, company_id, companies!users_company_id_fkey(id, company_name)"
        )
        if not _user_is_super_admin(user):
            if not user.get("company_id"):
                return jsonify([])
            query = query.eq("company_id", user.get("company_id"))
        result = query.order("full_name").execute()
        users = [u for u in (result.data or []) if u.get("id") != user.get("id")]
        return jsonify(users)
    except Exception as exc:
        print(f"[internal-chat] list users error: {exc}")
        return jsonify({"error": str(exc)}), 500


@internal_chat_bp.route("/api/internal-chat/conversations", methods=["GET"])
@login_required
def list_conversations():
    user = g.current_user
    try:
        if _user_is_super_admin(user):
            conversations = (
                supabase.table("internal_chat_conversations")
                .select("*, companies!internal_chat_conversations_company_id_fkey(id, company_name)")
                .order("updated_at", desc=True)
                .execute()
            ).data or []
        else:
            memberships = (
                supabase.table("internal_chat_participants")
                .select("conversation_id")
                .eq("user_id", user.get("id"))
                .execute()
            ).data or []
            ids = [m["conversation_id"] for m in memberships if m.get("conversation_id")]
            if not ids:
                return jsonify([])
            conversations = (
                supabase.table("internal_chat_conversations")
                .select("*, companies!internal_chat_conversations_company_id_fkey(id, company_name)")
                .in_("id", ids)
                .order("updated_at", desc=True)
                .execute()
            ).data or []
        return jsonify(_decorate_conversations(conversations, user))
    except Exception as exc:
        print(f"[internal-chat] list conversations error: {exc}")
        return jsonify({"error": str(exc)}), 500


@internal_chat_bp.route("/api/internal-chat/conversations", methods=["POST"])
@login_required
def create_conversation():
    user = g.current_user
    body = request.get_json() or {}
    participant_ids = [pid for pid in body.get("participant_ids", []) if pid]
    title = (body.get("title") or "").strip() or None

    if _user_is_super_admin(user):
        return jsonify({"error": "Super admins can read all chats, but cannot create company chats."}), 403
    if not user.get("company_id"):
        return jsonify({"error": "You must belong to a company to start a chat."}), 400
    if not participant_ids:
        return jsonify({"error": "At least one participant is required."}), 400

    participant_ids = sorted(set(participant_ids + [user["id"]]))
    try:
        users = _fetch_users_by_ids(participant_ids)
        if len(users) != len(participant_ids):
            return jsonify({"error": "One or more participants were not found."}), 404
        if any(str(u.get("company_id")) != str(user.get("company_id")) for u in users):
            return jsonify({"error": "Chats can only include users from your company."}), 403

        conversation_payload = {
            "company_id": user.get("company_id"),
            "title": title,
            "is_group": len(participant_ids) > 2,
            "created_by_user_id": user.get("id"),
        }
        created = (
            supabase.table("internal_chat_conversations")
            .insert(conversation_payload)
            .execute()
        )
        conversation = created.data[0]
        participant_rows = [
            {"conversation_id": conversation["id"], "user_id": participant_id}
            for participant_id in participant_ids
        ]
        supabase.table("internal_chat_participants").insert(participant_rows).execute()
        return jsonify(_decorate_conversations([conversation], user)[0]), 201
    except Exception as exc:
        print(f"[internal-chat] create conversation error: {exc}")
        return jsonify({"error": str(exc)}), 500


@internal_chat_bp.route("/api/internal-chat/conversations/<conversation_id>/messages", methods=["GET"])
@login_required
def list_messages(conversation_id):
    user = g.current_user
    _, error = _conversation_for_user(conversation_id, user)
    if error:
        return error
    try:
        messages = (
            supabase.table("internal_chat_messages")
            .select("*, sender:users!internal_chat_messages_sender_user_id_fkey(id, full_name, email, role)")
            .eq("conversation_id", conversation_id)
            .order("created_at", desc=False)
            .execute()
        ).data or []
        if not _user_is_super_admin(user):
            supabase.table("internal_chat_participants").update(
                {"last_read_at": datetime.now(timezone.utc).isoformat()}
            ).eq("conversation_id", conversation_id).eq("user_id", user.get("id")).execute()
        return jsonify(messages)
    except Exception as exc:
        print(f"[internal-chat] list messages error: {exc}")
        return jsonify({"error": str(exc)}), 500


@internal_chat_bp.route("/api/internal-chat/conversations/<conversation_id>/messages", methods=["POST"])
@login_required
def send_message(conversation_id):
    user = g.current_user
    if _user_is_super_admin(user):
        return jsonify({"error": "Super admins can read all chats, but cannot post into company chats."}), 403

    _, error = _conversation_for_user(conversation_id, user)
    if error:
        return error

    body = request.get_json() or {}
    message_text = (body.get("message_text") or "").strip()
    if not message_text:
        return jsonify({"error": "Message cannot be empty."}), 400

    try:
        created = (
            supabase.table("internal_chat_messages")
            .insert(
                {
                    "conversation_id": conversation_id,
                    "sender_user_id": user.get("id"),
                    "message_text": message_text,
                }
            )
            .execute()
        )
        now = datetime.now(timezone.utc).isoformat()
        supabase.table("internal_chat_conversations").update({"updated_at": now}).eq(
            "id", conversation_id
        ).execute()
        supabase.table("internal_chat_participants").update({"last_read_at": now}).eq(
            "conversation_id", conversation_id
        ).eq("user_id", user.get("id")).execute()
        return jsonify(created.data[0]), 201
    except Exception as exc:
        print(f"[internal-chat] send message error: {exc}")
        return jsonify({"error": str(exc)}), 500
