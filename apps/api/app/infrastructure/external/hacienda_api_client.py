"""Compatibility adapter over the single validated Hacienda transport."""
import base64
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional
from app.services.hacienda_client import HaciendaAPIClient as HaciendaTransport

CR_TIMEZONE = timezone(timedelta(hours=-6))


class HaciendaAPIClient:
    async def get_oauth_token(self, username: str, password: str, environment: str = "STAGING") -> str:
        result = await HaciendaTransport(environment).get_access_token(username, password)
        return result["access_token"]

    async def send_document(
        self, token: str, numeric_key: str, emission_date: datetime,
        emitter_tax_id_type: str, emitter_tax_id: str, signed_xml_b64: str,
        receiver_tax_id_type: Optional[str] = None, receiver_tax_id: Optional[str] = None,
        environment: str = "STAGING",
    ) -> Dict[str, Any]:
        if emission_date.tzinfo is None:
            emission_date = emission_date.replace(tzinfo=timezone.utc)
        result = await HaciendaTransport(environment).send_invoice(
            token=token, clave=numeric_key,
            fecha=emission_date.astimezone(CR_TIMEZONE).isoformat(),
            emisor_id=emitter_tax_id, emisor_tipo=emitter_tax_id_type,
            signed_xml=base64.b64decode(signed_xml_b64, validate=True).decode("utf-8"),
            receptor_id=receiver_tax_id, receptor_tipo=receiver_tax_id_type,
        )
        if not result["success"]:
            raise ValueError("Hacienda no recibió el comprobante; revisa su estado antes de reintentar")
        return {"http_status": result["status_code"], "status": "PROCESSING", "location": result.get("location")}

    async def query_document_status(self, token: str, numeric_key: str, environment: str = "STAGING") -> Dict[str, Any]:
        result = await HaciendaTransport(environment).query_invoice_status(token, numeric_key)
        indicator = str(result.get("ind_estado") or "").lower()
        if indicator not in {"aceptado", "rechazado", "recibido", "procesando", "no_encontrado"}:
            raise ValueError("Estado de Hacienda no reconocido; se conservará el estado pendiente")
        return {
            "ind_estado": indicator,
            "status": {"aceptado": "ACCEPTED", "rechazado": "REJECTED"}.get(indicator, "PROCESSING"),
            "numeric_key": numeric_key, "response_date": result.get("fecha"),
            "response_xml": result.get("respuesta_xml_decoded"),
            "raw_response": {"detalle-mensaje": result.get("detail_message")},
        }
