import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.organization import Organization
from app.models.audit_log import AuditLog
from app.models.user import User
from app.services.audit_service import AuditService

@pytest.mark.asyncio
async def test_support_ticket_lifecycle_and_internal_notes(
    client: AsyncClient,
    sample_organization: Organization,
    superadmin_token: str
):
    # 1. Login with owner
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "owner@elsol.cr",
        "password": "OwnerPassword123!"
    })
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Client creates support ticket
    create_res = await client.post("/api/v1/support/tickets", json={
        "subject": "Duda sobre configuración de impresora térmica",
        "description": "Necesitamos ayuda configurando la impresora POS para tiquetes.",
        "category": "HARDWARE",
        "priority": "HIGH"
    }, headers=headers)
    assert create_res.status_code == 201
    ticket_id = create_res.json()["data"]["id"]

    # 3. Superadmin adds internal confidential note
    admin_headers = {"Authorization": f"Bearer {superadmin_token}"}
    admin_msg_res = await client.post(
        f"/api/v1/support/tickets/{ticket_id}/messages",
        json={"message": "Nota interna: Cliente piloto familiar, priorizar atención técnica.", "is_internal_note": True},
        headers=admin_headers
    )
    assert admin_msg_res.status_code == 200

    # 4. Client retrieves ticket detail -> Internal note MUST be excluded!
    client_view = await client.get(f"/api/v1/support/tickets/{ticket_id}", headers=headers)
    assert client_view.status_code == 200
    client_msgs = client_view.json()["data"]["messages"]
    assert len(client_msgs) == 1
    assert client_msgs[0]["is_internal_note"] is False

    # 5. Superadmin retrieves ticket detail -> Internal note MUST be included!
    admin_view = await client.get(f"/api/v1/support/tickets/{ticket_id}", headers=admin_headers)
    assert admin_view.status_code == 200
    admin_msgs = admin_view.json()["data"]["messages"]
    assert len(admin_msgs) == 2
    assert any(m["is_internal_note"] is True for m in admin_msgs)

@pytest.mark.asyncio
async def test_delegated_access_grant(client: AsyncClient, sample_organization: Organization):
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "owner@elsol.cr",
        "password": "OwnerPassword123!"
    })
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    grant_res = await client.post("/api/v1/support/delegated-access", json={
        "reason": "Autorización temporal para soporte de facturación electrónica",
        "duration_minutes": 60,
        "permission_level": "FULL"
    }, headers=headers)
    assert grant_res.status_code == 200
    assert "delegated_token" in grant_res.json()["data"]

@pytest.mark.asyncio
async def test_forensic_audit_chain_verification_and_tampering_detection(
    client: AsyncClient,
    db_session: AsyncSession,
    sample_organization: Organization
):
    # Perform actions that write audit logs
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "owner@elsol.cr",
        "password": "OwnerPassword123!"
    })
    token = login_res.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Action 2: Support ticket creation (writes audit log)
    await client.post("/api/v1/support/tickets", json={
        "subject": "Ticket para prueba de auditoría encadenada",
        "description": "Verificando hash SHA-256 encadenado.",
        "category": "OTHER",
        "priority": "LOW"
    }, headers=headers)

    # 1. Verify audit chain validity
    is_valid, count, err = await AuditService.verify_audit_chain(db_session)
    assert is_valid is True
    assert count >= 2
    assert err is None

    # 2. Tamper with an audit record in the database
    first_log_res = await db_session.execute(select(AuditLog).order_by(AuditLog.created_at.asc()).limit(1))
    first_log = first_log_res.scalar_one()
    
    original_action = first_log.action
    first_log.action = "TAMPERED_MALICIOUS_ACTION"
    await db_session.commit()

    # 3. Chain verification MUST fail and detect the tampering!
    is_tampered_valid, count, err = await AuditService.verify_audit_chain(db_session)
    assert is_tampered_valid is False
    assert "Firma de evento alterada" in err or "Ruptura de cadena" in err

    # Restore original action for clean teardown
    first_log.action = original_action
    await db_session.commit()
