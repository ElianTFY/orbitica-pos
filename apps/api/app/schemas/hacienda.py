from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator

class HaciendaCredentialsInput(BaseModel):
    environment: Literal["STAGING", "PRODUCTION"] = "STAGING"
    atv_username: str = Field(..., min_length=3, max_length=255, description="Usuario ATV de Hacienda (cpf-...)")
    atv_password: Optional[str] = Field(None, min_length=1, max_length=255, description="Omitir para conservar la contraseña guardada")
    pin: Optional[str] = Field(None, pattern=r"^\d{4}$", description="Omitir para conservarlo si no cambia el certificado")
    p12_base64: Optional[str] = Field(None, description="Certificado .p12 codificado en Base64")

    @field_validator("p12_base64")
    @classmethod
    def limit_certificate_size(cls, value: Optional[str]) -> Optional[str]:
        if value and len(value) > 2_000_000:
            raise ValueError("El certificado supera el tamaño máximo permitido")
        return value

class HaciendaConnectionTestInput(BaseModel):
    environment: Literal["STAGING", "PRODUCTION"] = "STAGING"
    atv_username: Optional[str] = Field(None, min_length=3, max_length=255)
    atv_password: Optional[str] = Field(None, min_length=1, max_length=255)

    @model_validator(mode="after")
    def require_pair_or_stored_credentials(self):
        if (self.atv_username is None) != (self.atv_password is None):
            raise ValueError("Envía usuario y contraseña juntos, o ninguno para probar las credenciales guardadas")
        return self

class HaciendaCredentialsResponse(BaseModel):
    environment: str
    atv_username: str
    has_certificate: bool
    is_active: bool
    status_message: str
    certificate_expires_at: Optional[datetime] = None
    connection_tested_at: Optional[datetime] = None
    connection_test_success: Optional[bool] = None

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
