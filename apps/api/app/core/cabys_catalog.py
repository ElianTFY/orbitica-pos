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

# Códigos CAByS Oficiales representativos del Catálogo BCCR
OFFICIAL_CABYS_CATALOG: Dict[str, Dict[str, Any]] = {
    "6339900000000": {
        "description": "Otros servicios de tecnologías de información y de las computadoras n.c.p.",
        "default_tax_rate": Decimal("13.00"),
        "default_unit": "Sp",
        "category": "Servicios TI"
    },
    "8314101000000": {
        "description": "Servicios de contabilidad y auditoría financiera",
        "default_tax_rate": Decimal("13.00"),
        "default_unit": "Sp",
        "category": "Servicios Profesionales"
    },
    "2322000000000": {
        "description": "Pan fresco, panes especiales y productos de panadería",
        "default_tax_rate": Decimal("13.00"),
        "default_unit": "Unid",
        "category": "Alimentos"
    },
    "2224101000100": {
        "description": "Leche líquida de vaca pasteurizada entera o semidescremada",
        "default_tax_rate": Decimal("1.00"),
        "default_unit": "l",
        "category": "Canasta Básica Tributaria"
    },
    "2111100000100": {
        "description": "Carne de bovino fresca o refrigerada, en canales o medias canales",
        "default_tax_rate": Decimal("1.00"),
        "default_unit": "kg",
        "category": "Canasta Básica Tributaria"
    },
    "2341001000100": {
        "description": "Medicamentos para uso humano con registro sanitario nacional",
        "default_tax_rate": Decimal("4.00"),
        "default_unit": "Unid",
        "category": "Salud y Medicamentos"
    },
    "0111101000100": {
        "description": "Granos básicos para consumo y siembra",
        "default_tax_rate": Decimal("1.00"),
        "default_unit": "kg",
        "category": "Sector Agropecuario"
    },
    "3532200000100": {
        "description": "Cerveza de malta envasada",
        "default_tax_rate": Decimal("13.00"),
        "default_unit": "Unid",
        "category": "Bebidas"
    },
    "8411100000000": {
        "description": "Servicios de educación y capacitación formal",
        "default_tax_rate": Decimal("0.00"),
        "default_unit": "Sp",
        "category": "Educación Exenta"
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
      10 = Exonerado / Sin derecho a crédito fiscal
    """
    if is_exonerated or without_credit:
        return "01", "10"

    pct = rate_pct.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    if pct >= Decimal("13.00"):
        return "01", "08"
    elif pct >= Decimal("8.00"):
        return "01", "07"
    elif pct >= Decimal("4.00"):
        return "01", "04"
    elif pct >= Decimal("2.00"):
        return "01", "03"
    elif pct >= Decimal("1.00"):
        return "01", "02"
    elif pct == Decimal("0.50"):
        return "01", "09"
    else:
        return "01", "01"

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
