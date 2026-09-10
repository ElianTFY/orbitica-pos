import asyncio
import time
from decimal import Decimal
from typing import Any

import httpx

from app.core.cabys_catalog import OFFICIAL_CABYS_CATALOG, validate_cabys_and_rate
from app.core.exceptions import BadRequestException, ServiceUnavailableException


class CabysService:
    """Consulta y valida CAByS con la fuente pública oficial de Hacienda."""

    API_URL = "https://api.hacienda.go.cr/fe/cabys"
    CACHE_TTL_SECONDS = 30 * 24 * 60 * 60
    _cache: dict[str, tuple[float, dict[str, Any]]] = {
        code: (
            time.monotonic(),
            {
                "codigo": code,
                "descripcion": info["description"],
                "impuesto": float(info["default_tax_rate"]),
                "estado": "",
            },
        )
        for code, info in OFFICIAL_CABYS_CATALOG.items()
    }
    _request_lock = asyncio.Lock()
    _last_request_at = 0.0

    @classmethod
    async def _request(cls, params: dict[str, Any]) -> Any:
        async with cls._request_lock:
            elapsed = time.monotonic() - cls._last_request_at
            if elapsed < 0.15:
                await asyncio.sleep(0.15 - elapsed)
            try:
                async with httpx.AsyncClient(timeout=10.0, trust_env=False) as client:
                    response = await client.get(cls.API_URL, params=params)
                cls._last_request_at = time.monotonic()
            except (httpx.HTTPError, ImportError) as exc:
                raise ServiceUnavailableException(
                    "No fue posible verificar CAByS con Hacienda; intente nuevamente"
                ) from exc

        if response.status_code == 429:
            raise ServiceUnavailableException(
                "Hacienda limitó temporalmente las consultas CAByS; espere y reintente"
            )
        if response.status_code >= 500:
            raise ServiceUnavailableException(
                "El catálogo CAByS de Hacienda no está disponible temporalmente"
            )
        if response.status_code not in (200, 404):
            raise BadRequestException(
                f"Hacienda rechazó la consulta CAByS (HTTP {response.status_code})"
            )
        if response.status_code == 404:
            return []
        try:
            return response.json()
        except ValueError as exc:
            raise ServiceUnavailableException(
                "Hacienda devolvió una respuesta CAByS inválida; intente nuevamente"
            ) from exc

    @classmethod
    async def get_by_code(cls, code: str) -> dict[str, Any]:
        validate_cabys_and_rate(code, Decimal("13"), "Unid")
        cached = cls._cache.get(code)
        if cached and time.monotonic() - cached[0] < cls.CACHE_TTL_SECONDS:
            return cached[1]

        payload = await cls._request({"codigo": code})
        rows = payload if isinstance(payload, list) else payload.get("cabys", [])
        match = next((row for row in rows if str(row.get("codigo")) == code), None)
        if not match or match.get("estado") not in (None, "", "A"):
            raise BadRequestException(
                f"El código CAByS '{code}' no existe o no está activo en el catálogo oficial de Hacienda"
            )
        cls._cache[code] = (time.monotonic(), match)
        return match

    @classmethod
    async def validate_official(
        cls, code: str, configured_tax_rate: Decimal, unit_of_measure: str
    ) -> dict[str, Any]:
        validate_cabys_and_rate(code, configured_tax_rate, unit_of_measure)
        entry = await cls.get_by_code(code)
        official_rate = Decimal(str(entry.get("impuesto", "0"))).quantize(Decimal("0.01"))
        selected_rate = Decimal(str(configured_tax_rate)).quantize(Decimal("0.01"))
        if official_rate != selected_rate:
            raise BadRequestException(
                f"El CAByS {code} tiene tarifa base {official_rate}% en Hacienda, "
                f"pero se seleccionó {selected_rate}%"
            )
        return entry

    @classmethod
    async def search(cls, query: str, top: int = 10) -> list[dict[str, Any]]:
        clean_query = query.strip()
        if len(clean_query) < 3:
            raise BadRequestException("La búsqueda CAByS requiere al menos 3 caracteres")
        params = {"codigo": clean_query} if clean_query.isdigit() else {"descripcion": clean_query}
        payload = await cls._request(params)
        rows = payload.get("cabys", []) if isinstance(payload, dict) else payload
        results = []
        for row in rows:
            code = str(row.get("codigo", ""))
            if len(code) != 13 or not code.isdigit():
                continue
            cls._cache[code] = (time.monotonic(), row)
            results.append({
                "codigo": code,
                "descripcion": row.get("descripcion", ""),
                "impuesto": row.get("impuesto", 0),
            })
            if len(results) >= min(max(top, 1), 10):
                break
        return results
