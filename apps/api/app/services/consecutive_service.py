import uuid
import secrets
from datetime import datetime, timezone, timedelta
from typing import Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.consecutive_sequence import ConsecutiveSequence

# Costa Rica Standard Time is strictly UTC-6 (No DST)
CR_TIMEZONE = timezone(timedelta(hours=-6))

class ConsecutiveService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_next_consecutive_atomic(
        self,
        organization_id: uuid.UUID,
        branch_code: str,
        terminal_number: str,
        doc_type: str,
        environment: str = "STAGING"
    ) -> int:
        """
        Retrieves the next consecutive integer atomically using SELECT ... FOR UPDATE.
        Guarantees zero collisions and zero gaps in concurrent sales.
        """
        clean_branch = str(branch_code).zfill(3)[:3]
        clean_terminal = str(terminal_number).zfill(5)[:5]
        clean_doc_type = str(doc_type).zfill(2)[:2]

        # Lock the sequence row with FOR UPDATE
        stmt = (
            select(ConsecutiveSequence)
            .where(
                ConsecutiveSequence.organization_id == organization_id,
                ConsecutiveSequence.branch_code == clean_branch,
                ConsecutiveSequence.terminal_number == clean_terminal,
                ConsecutiveSequence.doc_type == clean_doc_type,
                ConsecutiveSequence.environment == environment,
            )
            .with_for_update()
        )
        res = await self.db.execute(stmt)
        seq = res.scalar_one_or_none()

        if not seq:
            # First document for this terminal and doc type
            seq = ConsecutiveSequence(
                organization_id=organization_id,
                branch_code=clean_branch,
                terminal_number=clean_terminal,
                doc_type=clean_doc_type,
                environment=environment,
                current_value=1,
            )
            self.db.add(seq)
            await self.db.flush()
            return 1
        else:
            seq.current_value += 1
            await self.db.flush()
            return seq.current_value

    @staticmethod
    def build_consecutivo_20(
        branch_code: str,
        terminal_number: str,
        doc_type: str,
        consecutive_int: int
    ) -> str:
        """
        Builds exact 20-digit consecutive according to Hacienda v4.4:
        [Sucursal: 3][Terminal: 5][TipoDocumento: 2][Consecutivo: 10]
        """
        b = str(branch_code).zfill(3)[:3]
        t = str(terminal_number).zfill(5)[:5]
        d = str(doc_type).zfill(2)[:2]
        c = f"{consecutive_int:010d}"[:10]
        return f"{b}{t}{d}{c}"

    @staticmethod
    def build_clave_50(
        emitter_tax_id: str,
        consecutivo_20: str,
        doc_date: datetime,
        situation: str = "1",
        security_code: str = None
    ) -> Tuple[str, str]:
        """
        Builds exact 50-digit numeric key (Clave Numérica) according to Hacienda v4.4:
        [Pais: 506 (3)]
        [Dia: 2][Mes: 2][Ano: 2] (Costa Rica Local Time UTC-6)
        [Cedula Emisor: 12 (zero-padded on left)]
        [Consecutivo: 20]
        [Situacion: 1 (1=Normal, 2=Contingencia, 3=Sin internet)]
        [CodigoSeguridad: 8 (Numeric)]
        """
        if doc_date.tzinfo is None:
            cr_time = doc_date.replace(tzinfo=timezone.utc).astimezone(CR_TIMEZONE)
        else:
            cr_time = doc_date.astimezone(CR_TIMEZONE)

        day = f"{cr_time.day:02d}"
        month = f"{cr_time.month:02d}"
        year = f"{cr_time.year % 100:02d}"

        # 12-digit zero-padded emitter identification
        clean_tax_id = "".join(c for c in str(emitter_tax_id) if c.isdigit()).zfill(12)[:12]

        # 8-digit random numeric security code
        if not security_code:
            sec_code = "".join(secrets.choice("0123456789") for _ in range(8))
        else:
            sec_code = str(security_code).zfill(8)[:8]

        clave_50 = f"506{day}{month}{year}{clean_tax_id}{consecutivo_20}{situation}{sec_code}"
        if len(clave_50) != 50:
            raise ValueError(f"Error generando clave de 50 dígitos: longitud obtenida {len(clave_50)}")

        return clave_50, sec_code
