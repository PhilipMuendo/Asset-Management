import logging
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class WelcomeEmail:
    to_email: str
    full_name: str
    temporary_password: str


class EmailClient:
    def send_welcome_email(self, message: WelcomeEmail) -> None:
        subject = "Welcome to CEA Asset Management"
        body = (
            f"Hello {message.full_name},\n\n"
            "Your Collective Energy Africa asset management account has been created.\n"
            f"Username: {message.to_email}\n"
            f"Temporary password: {message.temporary_password}\n\n"
            "You will be required to change this password after your first login.\n"
        )
        self._send(to_email=message.to_email, subject=subject, body=body)

    def _send(self, *, to_email: str, subject: str, body: str) -> None:
        if settings.email_transport == "console":
            logger.info("Email to %s | %s\n%s", to_email, subject, body)
            return

        if settings.email_transport != "smtp":
            raise RuntimeError("Unsupported EMAIL_TRANSPORT value")
        if not settings.smtp_host:
            raise RuntimeError("SMTP_HOST is required when EMAIL_TRANSPORT=smtp")

        email = EmailMessage()
        email["From"] = settings.smtp_from_email
        email["To"] = to_email
        email["Subject"] = subject
        email.set_content(body)

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as smtp:
            smtp.starttls()
            if settings.smtp_username and settings.smtp_password:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(email)

