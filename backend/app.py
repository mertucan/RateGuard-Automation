from flask import Flask, jsonify
from flask_cors import CORS

from routes.companies import companies_bp
from routes.contracts import contracts_bp
from routes.financial_logs import financial_logs_bp
from routes.market_data import market_data_bp
from routes.calculations import calculations_bp
from routes.email import email_bp
from routes.users import users_bp
from routes.notifications import notifications_bp
from routes.communications import communications_bp
from routes.renewals import renewals_bp
from routes.audit_logs import audit_logs_bp
from routes.applications import applications_bp
from routes.automation import automation_bp
from services.scheduler import start_scheduler


def create_app():
    app = Flask(__name__)
    CORS(app)

    app.register_blueprint(companies_bp)
    app.register_blueprint(contracts_bp)
    app.register_blueprint(financial_logs_bp)
    app.register_blueprint(market_data_bp)
    app.register_blueprint(calculations_bp)
    app.register_blueprint(email_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(communications_bp)
    app.register_blueprint(renewals_bp)
    app.register_blueprint(audit_logs_bp)
    app.register_blueprint(applications_bp)
    app.register_blueprint(automation_bp)
    start_scheduler()

    @app.route("/api/health")
    def health():
        return {"status": "ok"}

    @app.route("/api/debug")
    def debug():
        """Supabase veri tabanı bağlantısını ve tabloları test eder."""
        from services.supabase_client import supabase
        results = {}
        for table in ["companies", "contracts", "financial_logs", "users", "notifications", "communications", "renewals"]:
            try:
                res = supabase.table(table).select("*").limit(5).execute()
                results[table] = {"count": len(res.data), "sample": res.data}
            except Exception as e:
                results[table] = {"error": str(e)}
        return jsonify(results)

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)
