import base64
import json
from typing import Dict, Any, Optional
import httpx

HACIENDA_URLS = {
    "STAGING": {
        "token_url": "https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token",
        "client_id": "api-stag",
        "recepcion_url": "https://api-sandbox.comprobanteselectronicos.go.cr/recepcion/v1/recepcion"
    },
    "PRODUCTION": {
        "token_url": "https://idp.comprobanteselectronicos.go.cr/auth/realms/rut/protocol/openid-connect/token",
        "client_id": "api-prod",
        "recepcion_url": "https://api.comprobanteselectronicos.go.cr/recepcion/v1/recepcion"
    }
}

class HaciendaAPIClient:
    def __init__(self, environment: str = "STAGING"):
        self.env = environment.upper() if environment.upper() in HACIENDA_URLS else "STAGING"
        self.config = HACIENDA_URLS[self.env]

    async def get_access_token(self, username: str, password: str) -> Dict[str, Any]:
        data = {
            "client_id": self.config["client_id"],
            "grant_type": "password",
            "username": username,
            "password": password
        }
        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(self.config["token_url"], data=data, headers=headers)
            if response.status_code != 200:
                raise ValueError(f"Error al obtener token de Hacienda ({response.status_code}): {response.text}")
            return response.json()

    async def send_invoice(
        self,
        token: str,
        clave: str,
        fecha: str,
        emisor_id: str,
        emisor_tipo: str,
        signed_xml: str,
        receptor_id: Optional[str] = None,
        receptor_tipo: Optional[str] = None
    ) -> Dict[str, Any]:
        xml_b64 = base64.b64encode(signed_xml.encode("utf-8")).decode("utf-8")

        payload: Dict[str, Any] = {
            "clave": clave,
            "fecha": fecha,
            "emisor": {
                "tipoIdentificacion": emisor_tipo,
                "numeroIdentificacion": emisor_id
            },
            "comprobanteXml": xml_b64
        }

        if receptor_id and receptor_tipo:
            payload["receptor"] = {
                "tipoIdentificacion": receptor_tipo,
                "numeroIdentificacion": receptor_id
            }

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                self.config["recepcion_url"],
                json=payload,
                headers=headers
            )
            # Hacienda returns 202 Accepted on success
            if response.status_code not in (200, 202):
                raise ValueError(f"Hacienda rechazó la recepción ({response.status_code}): {response.text}")
            
            return {
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "location": response.headers.get("Location")
            }

    async def query_invoice_status(self, token: str, clave: str) -> Dict[str, Any]:
        url = f"{self.config['recepcion_url']}/{clave}"
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json"
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                raise ValueError(f"Error consultando estado en Hacienda ({response.status_code}): {response.text}")
            
            data = response.json()
            # If Hacienda returned a base64 XML response
            hacienda_xml = None
            if "respuesta-xml" in data and data["respuesta-xml"]:
                try:
                    hacienda_xml = base64.b64decode(data["respuesta-xml"]).decode("utf-8")
                except Exception:
                    hacienda_xml = None

            return {
                "clave": data.get("clave"),
                "fecha": data.get("fecha"),
                "ind_estado": data.get("ind-estado"),  # 'aceptado', 'rechazado', 'procesando'
                "respuesta_xml_raw": data.get("respuesta-xml"),
                "respuesta_xml_decoded": hacienda_xml
            }
