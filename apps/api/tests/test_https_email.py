import base64
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest

from app.adapters import email_adapter
from app.adapters.email_adapter import BrevoEmailAdapter, get_email_adapter
from app.core.config import settings
from app.core.exceptions import BadRequestException
from app.services import auth_service


def use_transport(monkeypatch, handler):
    real_client = httpx.AsyncClient
    monkeypatch.setattr(
        email_adapter.httpx,
        'AsyncClient',
        lambda **kwargs: real_client(transport=httpx.MockTransport(handler), **kwargs),
    )


@pytest.mark.asyncio
async def test_brevo_sends_security_content_and_original_xml_over_https(monkeypatch):
    signed_xml = b'<FacturaElectronica><Firma>signed-content</Firma></FacturaElectronica>'
    response_xml = '<Respuesta>aceptado</Respuesta>'
    requests = []

    def handler(request):
        requests.append(request)
        assert str(request.url) == 'https://api.brevo.com/v3/smtp/email'
        assert request.headers['api-key'] == 'ci-only-brevo-key'
        data = json.loads(request.content)
        assert data['sender'] == {'email': 'sender@example.com', 'name': 'Orbítica POS'}
        assert data['to'] == [{'email': 'recipient@example.com'}]
        assert data['htmlContent'] == '<p>Código: 123456</p>'
        assert data['textContent'] == 'Código: 123456'
        assert [a['name'] for a in data['attachment']] == ['factura.xml', 'respuesta.xml']
        assert base64.b64decode(data['attachment'][0]['content']) == signed_xml
        assert base64.b64decode(data['attachment'][1]['content']).decode() == response_xml
        return httpx.Response(201, json={'messageId': '<ci-message>'})

    use_transport(monkeypatch, handler)
    adapter = BrevoEmailAdapter('ci-only-brevo-key', 'sender@example.com', 'Orbítica POS')
    assert await adapter.send_email(
        'recipient@example.com', 'Verificación', '<p>Código: 123456</p>', 'Código: 123456',
        attachments=[
            {'filename': 'factura.xml', 'content': signed_xml},
            {'filename': 'respuesta.xml', 'content': response_xml},
        ],
    )
    assert len(requests) == 1


@pytest.mark.asyncio
@pytest.mark.parametrize('status', [401, 429, 500, 302])
async def test_brevo_failure_does_not_report_success_or_log_sensitive_body(monkeypatch, caplog, status):
    def handler(request):
        return httpx.Response(status, json={'message': 'private-otp-and-provider-detail'})

    use_transport(monkeypatch, handler)
    adapter = BrevoEmailAdapter('private-provider-key', 'sender@example.com', 'POS')
    assert not await adapter.send_email('recipient@example.com', 'Código', '<p>654321</p>')
    assert 'private-otp-and-provider-detail' not in caplog.text
    assert 'private-provider-key' not in caplog.text
    assert '654321' not in caplog.text


@pytest.mark.asyncio
async def test_brevo_timeout_and_missing_receipt_are_failures(monkeypatch):
    adapter = BrevoEmailAdapter('ci-only-key', 'sender@example.com', 'POS')

    def timeout(request):
        raise httpx.ReadTimeout('private-provider-detail', request=request)

    use_transport(monkeypatch, timeout)
    assert not await adapter.send_email('recipient@example.com', 'Código', '<p>123456</p>')
    monkeypatch.undo()
    use_transport(monkeypatch, lambda request: httpx.Response(201, json={}))
    assert not await adapter.send_email('recipient@example.com', 'Código', '<p>123456</p>')


def test_production_uses_https_provider_and_never_console_fallback(monkeypatch):
    monkeypatch.setattr(settings, 'ENVIRONMENT', 'production')
    monkeypatch.setattr(settings, 'EMAIL_PROVIDER', 'BREVO')
    monkeypatch.setattr(settings, 'BREVO_API_KEY', 'ci-only-key')
    monkeypatch.setattr(settings, 'EMAIL_FROM_ADDRESS', 'sender@example.com')
    monkeypatch.setattr(settings, 'SMTP_HOST', None)
    assert settings.email_provider_configured
    assert isinstance(get_email_adapter(), BrevoEmailAdapter)
    monkeypatch.setattr(settings, 'BREVO_API_KEY', None)
    assert not settings.email_provider_configured
    with pytest.raises(BadRequestException, match='EMAIL_PROVIDER'):
        get_email_adapter()


@pytest.mark.asyncio
async def test_registration_rejects_email_delivery_failure(client, monkeypatch):
    adapter = SimpleNamespace(send_email=AsyncMock(return_value=False))
    monkeypatch.setattr(auth_service, 'get_email_adapter', lambda: adapter)
    response = await client.post('/api/v1/auth/register/start', json={'email': 'mail-failure@example.com'})
    assert response.status_code == 400
    assert 'EMAIL_DELIVERY_FAILED' in response.json()['error']['message']
    assert 'data' not in response.json()
    adapter.send_email.assert_awaited_once()
