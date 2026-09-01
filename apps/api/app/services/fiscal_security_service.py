import base64
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509 import Certificate
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.fiscal_credential import FiscalCredential
from app.core.config import settings

def get_fernet_cipher() -> Fernet:
    # Ensure 32-byte url-safe base64 key
    key = settings.ENCRYPTION_MASTER_KEY
    if len(key) < 32:
        key = key.ljust(32, "0")
    key_b64 = base64.urlsafe_b64encode(key.encode("utf-8")[:32])
    return Fernet(key_b64)

class FiscalSecurityService:
    @staticmethod
    def encrypt_data(plain_text: str) -> str:
        if not plain_text:
            return ""
        cipher = get_fernet_cipher()
        return cipher.encrypt(plain_text.encode("utf-8")).decode("utf-8")

    @staticmethod
    def decrypt_data(encrypted_text: str) -> str:
        if not encrypted_text:
            return ""
        cipher = get_fernet_cipher()
        return cipher.decrypt(encrypted_text.encode("utf-8")).decode("utf-8")

    @staticmethod
    def extract_p12_metadata(p12_bytes: bytes, pin: str) -> Tuple[Optional[datetime], str, str]:
        """
        Parses PKCS#12 certificate and extracts expiration date, issuer, and subject.
        """
        try:
            private_key, cert, additional_certs = pkcs12.load_key_and_certificates(
                p12_bytes,
                pin.encode("utf-8")
            )
            if not cert:
                raise ValueError("No se encontró certificado en el archivo .p12")

            exp_date = cert.not_valid_after_utc if hasattr(cert, "not_valid_after_utc") else cert.not_valid_after.replace(tzinfo=timezone.utc)
            issuer = cert.issuer.rfc4514_string()
            subject = cert.subject.rfc4514_string()
            return exp_date, issuer, subject
        except Exception as e:
            raise ValueError(f"Error al procesar certificado criptográfico .p12 o PIN inválido: {str(e)}")

    @classmethod
    async def save_fiscal_credentials(
        cls,
        db: AsyncSession,
        organization_id: uuid.UUID,
        environment: str,
        p12_bytes: Optional[bytes],
        pin: str,
        atv_username: str,
        atv_password: str
    ) -> FiscalCredential:
        stmt = select(FiscalCredential).where(
            FiscalCredential.organization_id == organization_id,
            FiscalCredential.environment == environment
        )
        res = await db.execute(stmt)
        cred = res.scalar_one_or_none()

        exp_date = None
        issuer = None
        subject = None
        enc_p12 = None

        if p12_bytes:
            exp_date, issuer, subject = cls.extract_p12_metadata(p12_bytes, pin)
            p12_b64 = base64.b64encode(p12_bytes).decode("utf-8")
            enc_p12 = cls.encrypt_data(p12_b64)

        enc_pin = cls.encrypt_data(pin)
        enc_user = cls.encrypt_data(atv_username)
        enc_pass = cls.encrypt_data(atv_password)

        if not cred:
            cred = FiscalCredential(
                organization_id=organization_id,
                environment=environment,
                encrypted_p12=enc_p12,
                encrypted_pin=enc_pin,
                encrypted_atv_username=enc_user,
                encrypted_atv_password=enc_pass,
                certificate_expiration=exp_date,
                certificate_issuer=issuer,
                certificate_subject=subject,
                is_active=True
            )
            db.add(cred)
        else:
            if enc_p12:
                cred.encrypted_p12 = enc_p12
                cred.certificate_expiration = exp_date
                cred.certificate_issuer = issuer
                cred.certificate_subject = subject
            cred.encrypted_pin = enc_pin
            cred.encrypted_atv_username = enc_user
            cred.encrypted_atv_password = enc_pass
            cred.is_active = True

        await db.commit()
        await db.refresh(cred)
        return cred

    @classmethod
    async def get_decrypted_credentials(
        cls,
        db: AsyncSession,
        organization_id: uuid.UUID,
        environment: str
    ) -> Optional[Dict[str, Any]]:
        stmt = select(FiscalCredential).where(
            FiscalCredential.organization_id == organization_id,
            FiscalCredential.environment == environment,
            FiscalCredential.is_active == True
        )
        res = await db.execute(stmt)
        cred = res.scalar_one_or_none()
        if not cred:
            return None

        p12_bytes = None
        if cred.encrypted_p12:
            p12_b64 = cls.decrypt_data(cred.encrypted_p12)
            p12_bytes = base64.b64decode(p12_b64)

        pin = cls.decrypt_data(cred.encrypted_pin) if cred.encrypted_pin else ""
        username = cls.decrypt_data(cred.encrypted_atv_username) if cred.encrypted_atv_username else ""
        password = cls.decrypt_data(cred.encrypted_atv_password) if cred.encrypted_atv_password else ""

        return {
            "p12_bytes": p12_bytes,
            "pin": pin,
            "username": username,
            "password": password,
            "expiration": cred.certificate_expiration,
            "issuer": cred.certificate_issuer,
            "subject": cred.certificate_subject,
            "environment": cred.environment
        }
