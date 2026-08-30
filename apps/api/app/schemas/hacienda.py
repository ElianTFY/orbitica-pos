from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class HaciendaCredentialsInput(BaseModel):
    environment: str = Field(default="STAGING", description="STAGING o PRODUCTION")
    atv_username: str = Field(..., description="Usuario ATV de Hacienda (cpf-...)")
    atv_password: str = Field(..., description="Contraseña del usuario ATV")
    pin: str = Field(..., min_length=4, max_length=4, description="PIN de 4 dígitos de la llave criptográfica")
    p12_base64: Optional[str] = Field(None, description="Certificado .p12 codificado en Base64")

class HaciendaCredentialsResponse(BaseModel):
    environment: str
    atv_username: str
    has_certificate: bool
    is_active: bool
    status_message: str

class HaciendaTestConnectionResponse(BaseModel):
    success: bool
    environment: str
    message: str
    token_type: Optional[str] = None
    expires_in: Optional[int] = None

class HaciendaTransmitRequest(BaseModel):
    sale_id: str

class HaciendaTransmitResponse(BaseModel):
    invoice_id: str
    sale_id: str
    clave: str
    consecutive: str
    status: str
    hacienda_status: str
    sent_at: str
    message: str

class HaciendaStatusQueryResponse(BaseModel):
    clave: str
    status: str
    ind_estado: Optional[str] = None
    mensaje_hacienda: Optional[str] = None
    respuesta_xml: Optional[str] = None
