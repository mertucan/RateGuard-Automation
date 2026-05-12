import json
import logging
from typing import Optional

from config import GEMINI_API_KEY
from google import genai
from google.genai import types

client = None
GEMINI_MODEL = "gemini-2.5-flash-lite"
FALLBACK_MODEL = "gemini-2.0-flash-lite"

if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)
    print(
        f"[RateGuard] Gemini API ready. Model: {GEMINI_MODEL} | Fallback: {FALLBACK_MODEL}"
    )
else:
    print("[RateGuard] WARNING: GEMINI_API_KEY not found!")


def generate_email_draft(calc_data: dict) -> dict:
    """
    Generates a professional email draft using Gemini, based on contract data and the client's communication tone.
    """
    if not client:
        raise RuntimeError("Gemini API is not configured. GEMINI_API_KEY is missing.")

    tone = calc_data.get("language", "professional")
    company_name = calc_data.get("company_name", "")
    previous_amount = calc_data.get("previous_amount", 0)
    new_amount = calc_data.get("new_amount", 0)
    applied_adjustment = calc_data.get("applied_adjustment", 0)
    inflation_rule = calc_data.get("inflation_base_rule", "CPI")
    end_date = calc_data.get("end_date", "")
    capped = calc_data.get("capped", False)
    max_limit = calc_data.get("max_increase_limit")
    tufe_rate = calc_data.get("tufe_rate", 0)
    ufe_rate = calc_data.get("ufe_rate", 0)
    usd_rate = calc_data.get("usd_rate", 0)
    eur_rate = calc_data.get("eur_rate", 0)
    difference = calc_data.get("difference", 0)
    source_name = calc_data.get("inflation_source_name", "TCMB EVDS")
    source_institution = calc_data.get("inflation_source_institution", "Central Bank of the Republic of Turkiye (TCMB)")
    source_method = calc_data.get("inflation_source_method", "Official EVDS API")

    tone_instruction = _get_tone_instruction(tone)

    system_prompt = f"""You are the professional business communication assistant of a contract management and pricing update platform called RateGuard.

Write the email draft in English.

COMMUNICATION TONE:
{tone_instruction}

RULES:
- ONLY return a JSON object with two keys: "subject" and "body"
- Use \\n for line breaks in the "body"
- DO NOT use Markdown, code blocks, or extra formatting
- DO NOT write any explanations outside the JSON
- Keep the subject short and professional
- Sign the email as "The RateGuard Team\""""

    user_prompt = f"""Based on the following data, create a notification email for the client regarding the renewal of their service contract.

The email should include:
1. Notification that the contract is up for renewal
2. A transparent presentation of the price adjustment based on market data
3. An invitation to review the attached addendum PDF
4. A warm closing

CONTRACT DATA:
- Client Company: {company_name}
- Current Contract Amount: {previous_amount:,.2f} TL
- Proposed New Amount: {new_amount:,.2f} TL
- Price Difference: +{difference:,.2f} TL
- Applied Increase: {applied_adjustment:.1f}%
- Used Index: {inflation_rule}
- Inflation Data Source: {source_name} ({source_institution}) via {source_method}
- CPI Rate (YoY): {tufe_rate:.2f}%
- PPI Rate (YoY): {ufe_rate:.2f}%
- USD/TL Rate: {usd_rate:.4f}
- EUR/TL Rate: {eur_rate:.4f}
- Contract End Date: {end_date}
- Max Cap Applied: {"Yes (capped at " + str(max_limit) + "%)" if capped else "No"}"""

    contents = [types.Content(role="user", parts=[types.Part(text=user_prompt)])]

    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        temperature=0.7,
        max_output_tokens=1000,
    )

    reply = None
    models_to_try = [GEMINI_MODEL, FALLBACK_MODEL]

    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=config,
            )
            reply = response.text
            break
        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                print(f"[RateGuard] Quota exhausted ({model_name}), trying fallback...")
                continue
            print(f"[RateGuard] API Error ({model_name}): {e}")
            continue

    if not reply:
        raise RuntimeError(
            "Gemini API quota exhausted. Please wait a few minutes and try again."
        )

    return _parse_response(reply)


def analyze_communication_tone(messages: list) -> str:
    """
    Analyze a list of communication message texts and detect the overall tone.
    Returns one of: formal, friendly, professional, neutral, solution-oriented
    """
    if not client:
        return "professional"

    combined = "\n---\n".join(messages[:20])

    prompt = f"""Analyze the following customer communication messages and determine the overall communication tone.

Messages:
{combined}

Return ONLY one of these exact words (nothing else): formal, friendly, professional, neutral, solution-oriented"""

    config = types.GenerateContentConfig(
        temperature=0.3,
        max_output_tokens=50,
    )
    contents = [types.Content(role="user", parts=[types.Part(text=prompt)])]

    models_to_try = [GEMINI_MODEL, FALLBACK_MODEL]
    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=config,
            )
            tone = response.text.strip().lower()
            valid_tones = {
                "formal",
                "friendly",
                "professional",
                "neutral",
                "solution-oriented",
            }
            if tone in valid_tones:
                return tone
            return "professional"
        except Exception as e:
            print(f"[Tone Analysis] Error ({model_name}): {e}")
            continue

    return "professional"


def _get_tone_instruction(tone: str) -> str:
    tones = {
        "formal": (
            "Use a FORMAL tone. Write in a corporate and serious language. "
            "Use formal greetings like 'Dear' and closings like 'Respectfully'. "
            "Prefer short and precise sentences."
        ),
        "friendly": (
            "Use a FRIENDLY tone. Write in a warm, close, and friendly language. "
            "Make the client feel a good relationship. Start with 'Hello' and use "
            "friendly closings like 'Best wishes'."
        ),
        "professional": (
            "Use a PROFESSIONAL tone. Write in a balanced and reassuring language suitable for the business world. "
            "Be clear, open, and respectful. Avoid unnecessary exaggeration."
        ),
        "neutral": (
            "Use a NEUTRAL tone. Write in an impartial, plain, and informative language. "
            "Avoid emotional expressions, just present the facts and data."
        ),
        "solution-oriented": (
            "Use a SOLUTION-ORIENTED tone. Use a language that anticipates the client's concerns, "
            "empathetically explains the reasons for the price increase, and focuses on solutions. "
            "Add collaborative expressions like 'We would like to evaluate together'."
        ),
    }
    return tones.get(tone, tones["professional"])


def _parse_response(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        first_newline = cleaned.find("\n")
        if first_newline != -1:
            cleaned = cleaned[first_newline + 1 :]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        result = json.loads(cleaned)
        return {
            "subject": result.get("subject", ""),
            "body": result.get("body", ""),
        }
    except json.JSONDecodeError:
        return {
            "subject": "Service Contract Renewal",
            "body": cleaned,
        }


def ratebot_respond(
    message: str, contract_id: Optional[str] = None, history: Optional[list] = None
) -> str:
    """
    RateBot: Contract analysis chatbot powered by Gemini.
    Optionally fetches contract data from Supabase when contract_id is provided.
    """
    if not client:
        raise RuntimeError("Gemini API is not configured. GEMINI_API_KEY is missing.")

    if history is None:
        history = []

    # Fetch contract context if contract_id is provided
    contract_context = ""
    if contract_id:
        try:
            from services.supabase_client import supabase

            result = (
                supabase.table("contracts")
                .select("*, companies!contracts_company_id_fkey(company_name)")
                .eq("id", contract_id)
                .limit(1)
                .execute()
            )
            if result.data:
                c = result.data[0]
                contract_context = f"""
ACTIVE CONTRACT CONTEXT:
- Contract ID: {c.get("id", "")}
- Client Company: {c.get("companies", {}).get("company_name", "N/A")}
- Previous Amount: {c.get("previous_amount", "N/A")} {c.get("currency", "TRY")}
- New Amount: {c.get("new_amount", "N/A")} {c.get("currency", "TRY")}
- Applied Adjustment: {c.get("applied_adjustment", "N/A")}%
- Inflation Rule: {c.get("inflation_base_rule", "N/A")}
- Max Increase Limit: {c.get("max_increase_limit", "N/A")}%
- End Date: {c.get("end_date", "N/A")}
- Status: {c.get("status", "N/A")}
- Contract Type: {c.get("contract_type", "N/A")}
"""
        except Exception as e:
            print(f"[ratebot] Contract fetch error: {e}")

    system_prompt = f"""You are RateBot, an expert AI contract analysis assistant for RateGuard — a professional contract management and pricing automation platform.

Your expertise covers:
- Contract renewal analysis and inflation-based pricing adjustments
- Turkish economic indicators (TUFE/CPI, UFE/PPI) and their impact on contracts
- Contract risk assessment and critical obligations
- Best practices in contract management

RESPONSE GUIDELINES:
- Always respond in English
- Be concise, professional, and actionable
- Use bullet points for lists
- When analyzing contracts, highlight key figures and dates
- If no contract context is provided, give general guidance
- Keep responses under 300 words unless detailed analysis is explicitly requested
- Format currency values clearly (e.g., 125,000 TRY)
{contract_context}"""

    # Build conversation history for Gemini
    contents = []
    for msg in history[-10:]:  # Keep last 10 messages for context
        role = "user" if msg.get("role") == "user" else "model"
        contents.append(
            types.Content(role=role, parts=[types.Part(text=msg.get("text", ""))])
        )

    # Add current message
    contents.append(types.Content(role="user", parts=[types.Part(text=message)]))

    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        temperature=0.4,
        max_output_tokens=600,
    )

    models_to_try = [GEMINI_MODEL, FALLBACK_MODEL]
    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=config,
            )
            return response.text.strip()
        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                print(f"[ratebot] Quota exhausted ({model_name}), trying fallback...")
                continue
            print(f"[ratebot] API Error ({model_name}): {e}")
            continue

    raise RuntimeError("Gemini API quota exhausted. Please try again in a few minutes.")
