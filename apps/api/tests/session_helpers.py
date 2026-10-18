"""Authenticated fixtures with real revocable sessions (no auth bypass)."""
import uuid
from datetime import datetime, timedelta, timezone
from app.models.user import UserSession
from app.security.tokens import create_access_token, generate_refresh_token, hash_token


async def token_for(db, user):
    family = uuid.uuid4()
    db.add(UserSession(user_id=user.id, family_id=family,
                       refresh_token_hash=hash_token(generate_refresh_token()),
                       expires_at=datetime.now(timezone.utc) + timedelta(hours=1)))
    await db.commit()
    return create_access_token(str(user.id), claims={
        "role": user.role, "org_id": str(user.organization_id) if user.organization_id else None,
        "session_family": str(family),
    })
