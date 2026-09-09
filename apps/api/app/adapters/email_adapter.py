import logging
import asyncio
import base64
import smtplib
import httpx
from abc import ABC, abstractmethod
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from typing import Optional, List, Dict, Any
from app.core.config import settings
from app.core.exceptions import BadRequestException

logger = logging.getLogger("email_adapter")

class BaseEmailAdapter(ABC):
    @abstractmethod
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> bool:
        pass

class ConsoleEmailAdapter(BaseEmailAdapter):
    """Fallback adapter for development, testing, and offline modes: logs email without external network requests."""
    def __init__(self):
        self.sent_emails: List[Dict[str, Any]] = []

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> bool:
        att_names = [a.get("filename") for a in (attachments or [])]
        logger.info(f"[EMAIL FALLBACK] To: {to_email} | Subject: {subject} | Attachments: {att_names}")
        self.sent_emails.append({
            "to": to_email,
            "subject": subject,
            "html": html_content,
            "text": text_content,
            "attachments": attachments or []
        })
        return True

class SmtpEmailAdapter(BaseEmailAdapter):
    """Production SMTP email adapter with attachment support and fallback handling."""
    def __init__(self, host: str, port: int, user: Optional[str] = None, password: Optional[str] = None, use_tls: bool = True):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.use_tls = use_tls

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> bool:
        try:
            msg = MIMEMultipart("mixed")
            msg["Subject"] = subject
            msg["From"] = self.user or "facturacion@orbiticapos.com"
            msg["To"] = to_email

            alt_part = MIMEMultipart("alternative")
            if text_content:
                alt_part.attach(MIMEText(text_content, "plain", "utf-8"))
            alt_part.attach(MIMEText(html_content, "html", "utf-8"))
            msg.attach(alt_part)

            if attachments:
                for att in attachments:
                    fname = att.get("filename", "document.xml")
                    content_bytes = att.get("content", b"")
                    if isinstance(content_bytes, str):
                        content_bytes = content_bytes.encode("utf-8")
                    part = MIMEApplication(content_bytes, Name=fname)
                    part["Content-Disposition"] = f'attachment; filename="{fname}"'
                    msg.attach(part)

            def _send() -> None:
                with smtplib.SMTP(self.host, self.port, timeout=10) as server:
                    if self.use_tls:
                        server.starttls()
                    if self.user and self.password:
                        server.login(self.user, self.password)
                    server.sendmail(msg["From"], [to_email], msg.as_string())

            await asyncio.to_thread(_send)
            logger.info(f"Correo enviado exitosamente a {to_email}")
            return True
        except Exception as e:
            logger.error(f"Error al enviar correo SMTP a {to_email}: {e}")
            return False

class BrevoEmailAdapter(BaseEmailAdapter):
    """Transactional email over HTTPS, including signed XML attachments."""

    def __init__(self, api_key: str, sender_email: str, sender_name: str):
        self.api_key = api_key
        self.sender_email = sender_email
        self.sender_name = sender_name

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
    ) -> bool:
        payload = {
            "sender": {"email": self.sender_email, "name": self.sender_name},
            "to": [{"email": to_email}],
            "subject": subject,
            "htmlContent": html_content,
        }
        if text_content:
            payload["textContent"] = text_content
        if attachments:
            payload["attachment"] = []
            for attachment in attachments:
                content = attachment.get("content", b"")
                if isinstance(content, str):
                    content = content.encode("utf-8")
                payload["attachment"].append({
                    "name": attachment.get("filename", "document.xml"),
                    "content": base64.b64encode(content).decode("ascii"),
                })
        try:
            async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
                response = await client.post(
                    "https://api.brevo.com/v3/smtp/email",
                    headers={"api-key": self.api_key, "accept": "application/json"},
                    json=payload,
                )
            if response.status_code != 201:
                # Never log response bodies, OTPs, XML, credentials or recipients.
                logger.warning("Brevo rechazó el envío: HTTP %s", response.status_code)
                return False
            receipt = response.json()
            if not isinstance(receipt, dict) or not (receipt.get("messageId") or receipt.get("messageIds")):
                logger.warning("Brevo devolvió una respuesta sin confirmación de envío")
                return False
            return True
        except (httpx.HTTPError, ValueError):
            logger.warning("No se pudo confirmar el envío de correo por HTTPS")
            return False


_GLOBAL_CONSOLE_ADAPTER = ConsoleEmailAdapter()

def get_email_adapter() -> BaseEmailAdapter:
    if settings.ENVIRONMENT == "production":
        if not settings.email_provider_configured:
            raise BadRequestException(
                "BLOCKED_EXTERNAL_CONFIGURATION_EMAIL_PROVIDER: "
                "Configura el proveedor de correo antes de enviar códigos o comprobantes."
            )
        if settings.EMAIL_PROVIDER == "BREVO":
            return BrevoEmailAdapter(
                api_key=settings.BREVO_API_KEY,
                sender_email=str(settings.EMAIL_FROM_ADDRESS),
                sender_name=settings.EMAIL_FROM_NAME,
            )
        return SmtpEmailAdapter(
            host=settings.SMTP_HOST,
            port=getattr(settings, "SMTP_PORT", 587),
            user=getattr(settings, "SMTP_USER", None),
            password=getattr(settings, "SMTP_PASSWORD", None),
            use_tls=getattr(settings, "SMTP_TLS", True)
        )
    return _GLOBAL_CONSOLE_ADAPTER
