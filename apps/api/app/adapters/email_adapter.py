import logging
import smtplib
from abc import ABC, abstractmethod
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from typing import Optional, List, Dict, Any
from app.core.config import settings

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

            with smtplib.SMTP(self.host, self.port, timeout=10) as server:
                if self.use_tls:
                    server.starttls()
                if self.user and self.password:
                    server.login(self.user, self.password)
                server.sendmail(msg["From"], [to_email], msg.as_string())
            logger.info(f"Correo enviado exitosamente a {to_email}")
            return True
        except Exception as e:
            logger.error(f"Error al enviar correo SMTP a {to_email}: {e}")
            return False

_GLOBAL_CONSOLE_ADAPTER = ConsoleEmailAdapter()

def get_email_adapter() -> BaseEmailAdapter:
    smtp_host = getattr(settings, "SMTP_HOST", None)
    if smtp_host and settings.ENVIRONMENT == "production":
        return SmtpEmailAdapter(
            host=smtp_host,
            port=getattr(settings, "SMTP_PORT", 587),
            user=getattr(settings, "SMTP_USER", None),
            password=getattr(settings, "SMTP_PASSWORD", None),
            use_tls=getattr(settings, "SMTP_TLS", True)
        )
    return _GLOBAL_CONSOLE_ADAPTER
