import base64
import httpx
from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from app.core.config import settings

# Endpoints oficiales ATV Ministerio de Hacienda Costa Rica
IDP_URLS = {
    "STAGING": "https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token",
    "PRODUCTION": "https://idp.comprobanteselectronicos.go.cr/auth/realms/rut/protocol/openid-connect/token"
}

CLIENT_IDS = {
    "STAGING": "api-stag",
    "PRODUCTION": "api-prod"
}

RECEPCION_URLS = {
    "STAGING": "https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1/recepcion",
    "PRODUCTION": "https://api.comprobanteselectronicos.go.cr/recepcion/v1/recepcion"
}

CR_TIMEZONE = timezone(timedelta(hours=-6))

class HaciendaAPIClient:
    def __init__(self, timeout: float = 30.0):
        self.timeout = timeout

    async def get_oauth_token(self, username: str, password: str, environment: str = "STAGING") -> str:
        env_key = environment.upper()
        token_url = IDP_URLS.get(env_key, IDP_URLS["STAGING"])
        client_id = CLIENT_IDS.get(env_key, CLIENT_IDS["STAGING"])

        payload = {
            "client_id": client_id,
            "grant_type": "password",
            "username": username.strip(),
            "password": password.strip()
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(
                token_url,
                data=payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            if resp.status_code != 200:
                raise ValueError(f"Error al obtener token de autenticación IdP Hacienda ({resp.status_code}): {resp.text}")

            data = resp.json()
            return data["access_token"]

    async def send_document(
        self,
        token: str,
        numeric_key: str,
        emission_date: datetime,
        emitter_tax_id_type: str,
        emitter_tax_id: str,
        signed_xml_b64: str,
        receiver_tax_id_type: Optional[str] = None,
        receiver_tax_id: Optional[str] = None,
        environment: str = "STAGING"
    ) -> Dict[str, Any]:
        """
        Sends signed XML to Hacienda /recepcion endpoint.
        Returns response metadata. HTTP 201 represents PROCESSING / RECEIVED.
        """
        env_key = environment.upper()
        recepcion_url = RECEPCION_URLS.get(env_key, RECEPCION_URLS["STAGING"])

        if emission_date.tzinfo is None:
            cr_time = emission_date.replace(tzinfo=timezone.utc).astimezone(CR_TIMEZONE)
        else:
            cr_time = emission_date.astimezone(CR_TIMEZONE)

        payload: Dict[str, Any] = {
            "clave": numeric_key,
            "fecha": cr_time.isoformat(),
            "emisor": {
                "tipoIdentificacion": emitter_tax_id_type.zfill(2)[:2],
                "numeroIdentificacion": "".join(c for c in emitter_tax_id if c.isdigit())
            },
            "comprobanteXml": signed_xml_b64
        }

        if receiver_tax_id and receiver_tax_id_type:
            payload["receptor"] = {
                "tipoIdentificacion": receiver_tax_id_type.zfill(2)[:2],
                "numeroIdentificacion": "".join(c for c in receiver_tax_id if c.isdigit())
            }

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(recepcion_url, json=payload, headers=headers)
            
            # HTTP 201 = Comprobante recibido y en procesamiento
            if resp.status_code == 201:
                return {
                    "http_status": 201,
                    "status": "PROCESSING",
                    "location": resp.headers.get("Location"),
                    "message": "Comprobante recibido satisfactoriamente por el Ministerio de Hacienda"
                }
            elif resp.status_code == 400:
                raise ValueError(f"Rechazo inmediato en recepción Hacienda (400): {resp.text}")
            elif resp.status_code == 401:
                raise ValueError("Token de autenticación de Hacienda expirado o no autorizado")
            else:
                raise ValueError(f"Error inesperado al enviar a Hacienda ({resp.status_code}): {resp.text}")

    async def query_document_status(
        self,
        token: str,
        numeric_key: str,
        environment: str = "STAGING"
    ) -> Dict[str, Any]:
        """
        Queries /recepcion/{clave} to verify final fiscal tax status:
        - aceptado
        - rechazado
        - procesando
        """
        env_key = environment.upper()
        base_url = RECEPCION_URLS.get(env_key, RECEPCION_URLS["STAGING"])
        query_url = f"{base_url}/{numeric_key}"

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(query_url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                ind_estado = data.get("ind-estado", "").lower()
                resp_xml_b64 = data.get("respuesta-xml")
                
                resp_xml_str = None
                if resp_xml_b64:
                    try:
                        resp_xml_str = base64.b64decode(resp_xml_b64).decode("utf-8")
                    except Exception:
                        pass

                return {
                    "ind_estado": ind_estado,
                    "status": "ACCEPTED" if ind_estado == "aceptado" else ("REJECTED" if ind_estado == "rechazado" else "PROCESSING"),
                    "numeric_key": numeric_key,
                    "response_date": data.get("fecha"),
                    "response_xml": resp_xml_str,
                    "raw_response": data
                }
            elif resp.status_code == 404:
                return {
                    "ind_estado": "no_encontrado",
                    "status": "PROCESSING",
                    "numeric_key": numeric_key,
                    "message": "Comprobante en cola de procesamiento en Hacienda"
                }
            elif resp.status_code == 401:
                raise ValueError("Token de autenticación de Hacienda expirado")
            else:
                raise ValueError(f"Error al consultar estado en Hacienda ({resp.status_code}): {resp.text}")
