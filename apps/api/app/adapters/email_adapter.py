import logging
import smtplib
from abc import ABC, abstractmethod
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from app.core.config import settings

logger = logging.getLogger("email_adapter")

class BaseEmailAdapter(ABC):
    @abstractmethod
    async def send_email(self, to_email: str, subject: str, html_content: str, text_content: Optional[str] = None) -> bool:
        pass

class ConsoleEmailAdapter(BaseEmailAdapter):
    """Fallback adapter for development and testing: logs email without network requests."""
    async def send_email(self, to_email: str, subject: str, html_content: str, text_content: Optional[str] = None) -> bool:
        logger.info(f"[EMAIL MOCK] To: {to_email} | Subject: {subject}")
        logger.debug(f"[EMAIL MOCK BODY]\n{text_content or html_content}")
        return True

class SmtpEmailAdapter(BaseEmailAdapter):
    """Production SMTP email adapter."""
    def __init__(self, host: str, port: int, user: Optional[str] = None, password: Optional[str] = None, use_tls: bool = True):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.use_tls = use_tls

    async def send_email(self, to_email: str, subject: str, html_content: str, text_content: Optional[str] = None) -> bool:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.user or "no-reply@orbiticapos.com"
            msg["To"] = to_email

            if text_content:
                msg.attach(MIMEText(text_content, "plain", "utf-8"))
            msg.attach(MIMEText(html_content, "html", "utf-8"))

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
    return ConsoleEmailAdapter()
