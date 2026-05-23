import unittest

from flask import Flask

from services.observability import register_observability


class ObservabilityTest(unittest.TestCase):
    def create_client(self):
        app = Flask(__name__)
        app.config["TESTING"] = True
        register_observability(app)

        @app.route("/ok")
        def ok():
            return {"ok": True}

        @app.route("/boom")
        def boom():
            raise RuntimeError("boom")

        return app.test_client()

    def test_adds_request_id_header(self):
        client = self.create_client()
        response = client.get("/ok", headers={"X-Request-Id": "test-request"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("X-Request-Id"), "test-request")

    def test_unhandled_errors_are_json(self):
        client = self.create_client()
        response = client.get("/boom", headers={"X-Request-Id": "error-request"})
        self.assertEqual(response.status_code, 500)
        payload = response.get_json()
        self.assertEqual(payload["error"], "Internal server error")
        self.assertEqual(payload["request_id"], "error-request")


if __name__ == "__main__":
    unittest.main()
