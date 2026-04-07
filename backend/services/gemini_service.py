import json
from google import genai
from google.genai import types
from config import GEMINI_API_KEY

client = None
GEMINI_MODEL = "gemini-2.5-flash-lite"
FALLBACK_MODEL = "gemini-2.0-flash-lite"

if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)
    print(f"[RateGuard] Gemini API hazır. Model: {GEMINI_MODEL} | Yedek: {FALLBACK_MODEL}")
else:
    print("[RateGuard] UYARI: GEMINI_API_KEY bulunamadı!")


def generate_email_draft(calc_data: dict) -> dict:
    """
    Sözleşme hesaplama verileri ve müşterinin iletişim tonunu kullanarak
    Gemini ile profesyonel bir e-posta taslağı oluşturur.

    Returns: {"subject": str, "body": str}
    """
    if not client:
        raise RuntimeError("Gemini API yapılandırılmamış. GEMINI_API_KEY eksik.")

    tone = calc_data.get("language", "profesyonel")
    company_name = calc_data.get("company_name", "")
    previous_amount = calc_data.get("previous_amount", 0)
    new_amount = calc_data.get("new_amount", 0)
    applied_adjustment = calc_data.get("applied_adjustment", 0)
    inflation_rule = calc_data.get("inflation_base_rule", "TUFE")
    end_date = calc_data.get("end_date", "")
    capped = calc_data.get("capped", False)
    max_limit = calc_data.get("max_increase_limit")
    tufe_rate = calc_data.get("tufe_rate", 0)
    ufe_rate = calc_data.get("ufe_rate", 0)
    usd_rate = calc_data.get("usd_rate", 0)
    eur_rate = calc_data.get("eur_rate", 0)
    difference = calc_data.get("difference", 0)

    tone_instruction = _get_tone_instruction(tone)

    system_prompt = f"""Sen RateGuard adlı sözleşme yönetim ve fiyat güncelleme platformunun profesyonel iş yazışma asistanısın.

E-posta taslağını Türkçe yaz.

İLETİŞİM TONU:
{tone_instruction}

KURALLAR:
- Yanıtı SADECE iki anahtarlı bir JSON nesnesi olarak döndür: "subject" ve "body"
- "body" kısmında satır sonları için \\n kullan
- Markdown, kod blokları veya ekstra biçimlendirme KULLANMA
- JSON dışında herhangi bir açıklama YAZMA
- Konu kısa ve profesyonel olsun
- E-postayı "RateGuard Ekibi" olarak imzala"""

    user_prompt = f"""Aşağıdaki verilere dayanarak, müşteriye hizmet sözleşmesinin yenilenmesi hakkında bilgilendirme e-postası oluştur.

E-posta şunları içermeli:
1. Sözleşmenin yenileme zamanının geldiğini bildirmeli
2. Fiyat ayarlamasını piyasa verileriyle şeffaf şekilde sunmalı
3. Ekteki ek sözleşme PDF'ini incelemeye davet etmeli
4. Sıcak bir kapanış içermeli

SÖZLEŞME VERİLERİ:
- Müşteri Şirketi: {company_name}
- Mevcut Sözleşme Tutarı: {previous_amount:,.2f} TL
- Yeni Teklif Edilen Tutar: {new_amount:,.2f} TL
- Fiyat Farkı: +{difference:,.2f} TL
- Uygulanan Artış: %{applied_adjustment:.1f}
- Kullanılan Endeks: {inflation_rule}
- TÜFE Oranı: %{tufe_rate:.2f}
- ÜFE Oranı: %{ufe_rate:.2f}
- USD/TL Kuru: {usd_rate:.4f}
- EUR/TL Kuru: {eur_rate:.4f}
- Sözleşme Bitiş Tarihi: {end_date}
- Tavan Artış Uygulandı: {"Evet (%" + str(max_limit) + " ile sınırlandırıldı)" if capped else "Hayır"}"""

    contents = [types.Content(
        role="user",
        parts=[types.Part(text=user_prompt)]
    )]

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
                print(f"[RateGuard] Kota dolu ({model_name}), yedek model deneniyor...")
                continue
            print(f"[RateGuard] API Hatası ({model_name}): {e}")
            continue

    if not reply:
        raise RuntimeError("Gemini API kotası doldu. Lütfen birkaç dakika bekleyip tekrar deneyin.")

    return _parse_response(reply)


def _get_tone_instruction(tone: str) -> str:
    tones = {
        "resmi": (
            "RESMİ ton kullan. Kurumsal ve ciddi bir dil ile yaz. "
            "'Sayın' hitabı, 'arz ederiz' gibi resmi kapanışlar kullan. "
            "Kısa ve kesin cümleler tercih et."
        ),
        "samimi": (
            "SAMİMİ ton kullan. Sıcak, yakın ve dostça bir dil ile yaz. "
            "Müşteriyle iyi bir ilişki hissettir. 'Merhaba' ile başla, "
            "'iyi dileklerimizle' gibi samimi kapanışlar kullan."
        ),
        "profesyonel": (
            "PROFESYONEL ton kullan. İş dünyasına uygun, dengeli ve güven veren bir dil ile yaz. "
            "Net, açık ve saygılı ol. Gereksiz abartıdan kaçın."
        ),
        "notr": (
            "NÖTR ton kullan. Tarafsız, sade ve bilgilendirici bir dil ile yaz. "
            "Duygusal ifadelerden kaçın, sadece gerçekleri ve verileri sun."
        ),
        "cozumcu": (
            "ÇÖZÜMCÜ ton kullan. Müşterinin endişelerini önceden anlayan, "
            "fiyat artışının nedenlerini empatiyle açıklayan ve çözüm odaklı bir dil kullan. "
            "'Birlikte değerlendirmek isteriz' gibi işbirlikçi ifadeler ekle."
        ),
    }
    return tones.get(tone, tones["profesyonel"])


def _parse_response(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        first_newline = cleaned.index("\n")
        cleaned = cleaned[first_newline + 1:]
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
            "subject": "Hizmet Sözleşmesi Yenileme",
            "body": cleaned,
        }
