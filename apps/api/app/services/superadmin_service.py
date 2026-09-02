import uuid
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.organization import Organization
from app.models.user import User
from app.models.branch import Branch
from app.models.support import SupportTicket
from app.core.exceptions import NotFoundException
from app.services.audit_service import AuditService

class SuperadminService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_all_organizations(self) -> List[Organization]:
        stmt = select(Organization).order_by(Organization.created_at.desc())
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def toggle_organization_status(self, org_id: uuid.UUID, is_active: bool, actor_id: uuid.UUID) -> Organization:
        stmt = select(Organization).where(Organization.id == org_id)
        res = await self.db.execute(stmt)
        org = res.scalar_one_or_none()
        if not org:
            raise NotFoundException("Organización no encontrada")

        org.is_active = is_active
        await AuditService.log_action(
            db=self.db,
            action="SUPERADMIN_TOGGLE_ORG_STATUS",
            resource="Organization",
            actor_id=actor_id,
            resource_id=str(org_id),
            payload_after={"is_active": is_active}
        )
        await self.db.commit()
        await self.db.refresh(org)
        return org

    async def get_platform_stats(self) -> Dict[str, Any]:
        org_count = (await self.db.execute(select(func.count(Organization.id)))).scalar_one()
        user_count = (await self.db.execute(select(func.count(User.id)))).scalar_one()
        branch_count = (await self.db.execute(select(func.count(Branch.id)))).scalar_one()
        return {
            "total_organizations": org_count,
            "total_users": user_count,
            "total_branches": branch_count
        }

    async def search_platform(self, query: str) -> Dict[str, Any]:
        clean_q = f"%{query.strip().lower()}%"
        
        org_stmt = select(Organization).where(
            func.lower(Organization.trade_name).like(clean_q) |
            func.lower(Organization.legal_name).like(clean_q) |
            Organization.identification_number.like(clean_q)
        ).limit(10)
        orgs = (await self.db.execute(org_stmt)).scalars().all()

        ticket_stmt = select(SupportTicket).where(
            func.lower(SupportTicket.subject).like(clean_q) |
            func.lower(SupportTicket.ticket_number).like(clean_q)
        ).limit(10)
        tickets = (await self.db.execute(ticket_stmt)).scalars().all()

        return {
            "companies": [
                {
                    "id": str(o.id),
                    "trade_name": o.trade_name,
                    "legal_name": o.legal_name,
                    "identification_number": o.identification_number,
                    "is_active": o.is_active,
                }
                for o in orgs
            ],
            "tickets": [
                {
                    "id": str(t.id),
                    "ticket_number": t.ticket_number,
                    "subject": t.subject,
                    "status": t.status,
                    "priority": t.priority,
                }
                for t in tickets
            ]
        }
