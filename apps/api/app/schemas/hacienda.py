from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator

class HaciendaCredentialsInput(BaseModel):
    environment: Literal["STAGING", "PRODUCTION"] = "STAGING"
    atv_username: str = Field(..., min_length=3, max_length=255, description="Usuario ATV de Hacienda (cpf-...)")
    atv_password: str = Field(..., min_length=1, max_length=255, description="Contraseña del usuario ATV")
    pin: str = Field(..., pattern=r"^\d{4}$", description="PIN de 4 dígitos de la llave criptográfica")
    p12_base64: Optional[str] = Field(None, description="Certificado .p12 codificado en Base64")

    @field_validator("p12_base64")
    @classmethod
    def limit_certificate_size(cls, value: Optional[str]) -> Optional[str]:
        if value and len(value) > 2_000_000:
            raise ValueError("El certificado supera el tamaño máximo permitido")
        return value

class HaciendaConnectionTestInput(BaseModel):
    environment: Literal["STAGING", "PRODUCTION"] = "STAGING"
    atv_username: str = Field(..., min_length=3, max_length=255)
    atv_password: str = Field(..., min_length=1, max_length=255)

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
