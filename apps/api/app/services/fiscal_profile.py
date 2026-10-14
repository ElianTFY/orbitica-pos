"""Validate explicit fiscal inputs without substituting invented business data."""
import re
from app.core.exceptions import BadRequestException


def identification_type(value):
    return {"FISICA": "01", "JURIDICA": "02", "DIMEX": "03", "NITE": "04"}.get(value, value)


def validate_emitter_profile(org):
    required = ("legal_name", "identification_type", "identification_number", "email",
                "economic_activity_code", "province_code", "canton_code", "district_code", "address_detail")
    if any(not str(getattr(org, field, "") or "").strip() for field in required):
        raise BadRequestException("Completa los datos fiscales del emisor en Configuración antes de vender o emitir")
    patterns = {"01": r"\d{9}", "02": r"\d{10}", "03": r"\d{11,12}", "04": r"\d{10}"}
    pattern = patterns.get(identification_type(org.identification_type))
    if not pattern or not re.fullmatch(pattern, org.identification_number):
        raise BadRequestException("La identificación del emisor no corresponde a su tipo; ingresa solo dígitos")
    if not re.fullmatch(r"\d{6}", org.economic_activity_code):
        raise BadRequestException("La actividad económica del emisor debe contener 6 dígitos")
    if (not re.fullmatch(r"[1-7]", org.province_code)
            or not re.fullmatch(r"(?!00)\d{2}", org.canton_code)
            or not re.fullmatch(r"(?!00)\d{2}", org.district_code)):
        raise BadRequestException("Revisa provincia, cantón y distrito del emisor")
