from flask import Blueprint, jsonify, send_file
from services.calculation import calculate_renewal
from services.pdf_generator import generate_addendum_pdf
from services.pdf_naming import addendum_download_name

calculations_bp = Blueprint("calculations", __name__)


@calculations_bp.route("/api/contracts/<contract_id>/calculate", methods=["GET"])
def get_calculation(contract_id):
    try:
        result = calculate_renewal(contract_id)
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        print(f"[calculation] Error: {e}")
        return jsonify({"error": str(e)}), 500


@calculations_bp.route("/api/contracts/<contract_id>/pdf", methods=["GET"])
def download_pdf(contract_id):
    try:
        calc = calculate_renewal(contract_id)
        pdf_buf = generate_addendum_pdf(calc)

        filename = addendum_download_name(contract_id)

        return send_file(
            pdf_buf,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=filename,
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        print(f"[pdf] Error: {e}")
        return jsonify({"error": str(e)}), 500
