import unittest
from unittest.mock import patch

from flask import Flask, g

from routes.audit_logs import build_change_details, log_audit, normalize_audit_details


class _InsertQuery:
    def __init__(self):
        self.payload = None

    def insert(self, payload):
        self.payload = payload
        return self

    def execute(self):
        return {"data": [self.payload]}


class _SupabaseStub:
    def __init__(self):
        self.query = _InsertQuery()

    def table(self, name):
        self.table_name = name
        return self.query


class AuditLogTest(unittest.TestCase):
    def create_app(self):
        app = Flask(__name__)
        app.config["TESTING"] = True
        return app

    def test_details_are_redacted_and_enriched_with_request_context(self):
        app = self.create_app()
        with app.test_request_context(
            "/api/example",
            headers={"X-Request-Id": "req-123", "X-Forwarded-For": "10.0.0.5, proxy"},
        ):
            g.request_id = "req-123"
            g.current_user = {
                "id": "user-1",
                "full_name": "Ada Lovelace",
                "email": "ada@example.com",
                "role": "company_admin",
                "company_id": "company-1",
            }

            details = normalize_audit_details(
                {"password": "secret", "nested": {"access_token": "abc"}, "field": "ok"},
                user_id="user-1",
                user_name="Ada Lovelace",
            )

        self.assertEqual(details["password"], "[redacted]")
        self.assertEqual(details["nested"]["access_token"], "[redacted]")
        self.assertEqual(details["field"], "ok")
        self.assertEqual(details["_context"]["request_id"], "req-123")
        self.assertEqual(details["_context"]["ip_address"], "10.0.0.5")
        self.assertEqual(details["_context"]["actor"]["role"], "company_admin")

    def test_change_details_only_include_changed_fields(self):
        details = build_change_details(
            {"status": "draft", "previous_amount": 100, "password_hash": "old"},
            {"status": "approved", "previous_amount": 100, "password_hash": "new"},
        )

        self.assertIn("status", details["changes"])
        self.assertNotIn("previous_amount", details["changes"])
        self.assertEqual(details["changes"]["password_hash"]["before"], "[redacted]")
        self.assertEqual(details["changes"]["password_hash"]["after"], "[redacted]")

    def test_log_audit_writes_normalized_payload(self):
        stub = _SupabaseStub()
        with patch("routes.audit_logs.supabase", stub):
            log_audit(
                user_id="user-1",
                user_name="Ada Lovelace",
                action="update",
                entity_type="contract",
                entity_id="contract-1",
                details={"token": "abc"},
            )

        self.assertEqual(stub.table_name, "audit_logs")
        self.assertEqual(stub.query.payload["entity_id"], "contract-1")
        self.assertEqual(stub.query.payload["details"]["token"], "[redacted]")


if __name__ == "__main__":
    unittest.main()
