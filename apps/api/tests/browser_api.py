"""Disposable browser-test entrypoint. Never imported by the application.

Run uvicorn tests.browser_api:app on loopback with ENVIRONMENT=test and
E2E_ALLOW_DISPOSABLE_DB=1. Mail is captured locally, never delivered externally.
Business endpoints and database operations use the real application unchanged.
"""
import os
import re

from app.core.config import settings

if settings.ENVIRONMENT != "test" or os.environ.get("E2E_ALLOW_DISPOSABLE_DB") != "1":
    raise RuntimeError("Browser fixtures require an explicitly disposable test environment")

from fastapi import HTTPException
from app.main import app
from app.adapters.email_adapter import get_email_adapter, ConsoleEmailAdapter


@app.get("/__e2e__/mail-code/{email}", include_in_schema=False)
async def captured_mail_code(email: str):
    adapter = get_email_adapter()
    if not isinstance(adapter, ConsoleEmailAdapter):
        raise RuntimeError("E2E must not send external mail")
    for message in reversed(adapter.sent_emails):
        if message["to"] == email:
            match = re.search(r"\b\d{6}\b", message.get("text") or "")
            if match:
                return {"code": match.group(), "delivery": "test_memory_only"}
    raise HTTPException(404, "No test email captured")


@app.get("/__e2e__/recovery-link/{email}", include_in_schema=False)
async def captured_recovery_link(email: str):
    adapter = get_email_adapter()
    if not isinstance(adapter, ConsoleEmailAdapter):
        raise RuntimeError("E2E must not send external mail")
    for message in reversed(adapter.sent_emails):
        if message["to"] == email and "Recuperación" in message["subject"]:
            match = re.search(r"https?://\S+", message.get("text") or "")
            if match:
                return {"url": match.group(), "delivery": "test_memory_only"}
    raise HTTPException(404, "No recovery email captured")
