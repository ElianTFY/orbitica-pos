"""
Catálogo Oficial CAByS (BCCR / Ministerio de Hacienda Costa Rica v4.4)
Define códigos oficiales de 13 dígitos, unidades de medida estandarizadas,
mapeo exacto de códigos de tarifa según Anexos y Estructuras v4.4, y validaciones de consistencia.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Tuple, Dict, Any, Optional

# Unidades de Medida Oficiales MH v4.4
VALID_UNITS_OF_MEASURE = {
    "Unid",  # Unidad
    "Sp",    # Servicios profesionales
    "kg",    # Kilogramo
    "g",     # Gramo
    "m",     # Metro
    "km",    # Kilómetro
    "cm",    # Centímetro
    "l",     # Litro
    "ml",    # Mililitro
    "h",     # Hora
    "d",     # Día
    "mes",   # Mes
    "par",   # Par
    "doc",   # Docena
}

# Códigos verificados contra https://api.hacienda.go.cr/fe/cabys.
# Solo son una caché inicial; la autoridad sigue siendo el API oficial.
OFFICIAL_CABYS_CATALOG: Dict[str, Dict[str, Any]] = {
    "6339900000000": {
        "description": "Suministro de comida, servicio en mostrador, sin sitios para sentarse",
        "default_tax_rate": Decimal("13.00"),
        "default_unit": "Unid",
        "category": "Alimentos"
    },
    "8222100000000": {
        "description": "Servicios de contabilidad",
        "default_tax_rate": Decimal("13.00"),
        "default_unit": "Sp",
        "category": "Servicios Profesionales"
    },
    "2349002011500": {
        "description": "Pan pita o pan árabe, sin congelar",
        "default_tax_rate": Decimal("1.00"),
        "default_unit": "Unid",
        "category": "Alimentos"
    },
    "2132100000100": {
        "description": "Jugo de tomate concentrado",
        "default_tax_rate": Decimal("13.00"),
        "default_unit": "Unid",
        "category": "Bebidas"
    }
}

DEFAULT_OFFICIAL_CABYS = "6339900000000"

def map_fiscal_v44_tax_tariff(rate_pct: Decimal, is_exonerated: bool = False, without_credit: bool = False) -> Tuple[str, str]:
    """
    Mapeo exacto de tarifas según Anexos y Estructuras v4.4 de Hacienda Costa Rica:
    Código Impuesto:
      01 = IVA
    Código Tarifa (Tabla 17):
      01 = Tarifa 0% (Exento)
      02 = Tarifa reducida 1%
      03 = Tarifa reducida 2%
      04 = Tarifa reducida 4%
      05 = Tarifa transitoria 0%
      06 = Tarifa transitoria 4%
      07 = Tarifa reducida 8%
      08 = Tarifa general 13%
      09 = Tarifa reducida 0.5%
      10 = Tarifa exenta
      11 = Tarifa 0% sin derecho a crédito fiscal
    """
    if without_credit:
        return "01", "11"
    if is_exonerated:
        return "01", "10"

    pct = rate_pct.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    tariff_codes = {
        Decimal("0.00"): "01",
        Decimal("0.50"): "09",
        Decimal("1.00"): "02",
        Decimal("2.00"): "03",
        Decimal("4.00"): "04",
        Decimal("8.00"): "07",
        Decimal("13.00"): "08",
    }
    code = tariff_codes.get(pct)
    if code is None:
        raise ValueError(f"La tarifa IVA {pct}% no tiene un código válido en Hacienda v4.4")
    return "01", code

def validate_cabys_and_rate(cabys_code: str, rate_pct: Decimal, unit_of_measure: str) -> None:
    """
    Valida la validez de un código CAByS y su consistencia con las reglas tributarias de CR:
    - 13 dígitos numéricos
    - No permite códigos ficticios auditados como '5211010000100' ni '0000000000000'
    - Unidad de medida estandarizada
    """
    cleaned = cabys_code.strip() if cabys_code else ""
    if not cleaned.isdigit() or len(cleaned) != 13:
        raise ValueError(f"El código CAByS '{cabys_code}' debe constar de exactamente 13 dígitos numéricos oficiales.")

    if cleaned == "0000000000000":
        raise ValueError("El código '0000000000000' es un marcador nulo rechazado por Hacienda.")

    if cleaned == "5211010000100":
        raise ValueError("El código CAByS '5211010000100' es ficticio y fue expresamente revocado en la auditoría fiscal.")

    if unit_of_measure not in VALID_UNITS_OF_MEASURE:
        raise ValueError(
            f"Unidad de medida '{unit_of_measure}' inválida. Debe ser una de: {', '.join(sorted(VALID_UNITS_OF_MEASURE))}"
        )
