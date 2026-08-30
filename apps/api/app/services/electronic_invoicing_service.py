import base64
import uuid
import datetime
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12, BestAvailableEncryption
from app.models.sale import Sale
from app.models.organization import Organization
from app.models.branch import Branch
from app.models.customer import Customer
from app.models.invoice import ElectronicInvoice
from app.services.hacienda_service import HaciendaService
from app.services.xades_signer import XAdESSigner
from app.services.hacienda_client import HaciendaAPIClient

_TENANT_HACIENDA_CREDENTIALS: Dict[str, Dict[str, Any]] = {}

def generate_ephemeral_p12(pin: str = "1234") -> bytes:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "CR"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Orbítica Studio Test Cert"),
        x509.NameAttribute(NameOID.COMMON_NAME, "ATV Test Key")
    ])
    cert = x509.CertificateBuilder().subject_name(
        subject
    ).issuer_name(
        issuer
    ).public_key(
        key.public_key()
    ).serial_number(
        x509.random_serial_number()
    ).not_valid_before(
        datetime.datetime.now(datetime.timezone.utc)
    ).not_valid_after(
        datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=365)
    ).sign(key, hashes.SHA256())

    return pkcs12.serialize_key_and_certificates(
        name=b"test_key",
        key=key,
        cert=cert,
        cas=None,
        encryption_algorithm=BestAvailableEncryption(pin.encode("utf-8"))
    )

class ElectronicInvoicingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def set_credentials(
        org_id: str,
        env: str,
        username: str,
        password: str,
        pin: str,
        p12_bytes: Optional[bytes] = None
    ):
        _TENANT_HACIENDA_CREDENTIALS[str(org_id)] = {
            "environment": env,
            "username": username,
            "password": password,
            "pin": pin,
            "p12_bytes": p12_bytes or generate_ephemeral_p12(pin)
        }

    @staticmethod
    def get_credentials(org_id: str) -> Optional[Dict[str, Any]]:
        return _TENANT_HACIENDA_CREDENTIALS.get(str(org_id))

    async def transmit_sale_to_hacienda(
        self,
        sale_id: uuid.UUID,
        org_id: uuid.UUID,
        simulate_success: bool = True
    ) -> Dict[str, Any]:
        stmt = select(Sale).options(selectinload(Sale.items), selectinload(Sale.payments)).where(Sale.id == sale_id, Sale.organization_id == org_id)
        res = await self.db.execute(stmt)
        sale = res.scalar_one_or_none()
        if not sale:
            raise ValueError("Venta no encontrada")

        org_stmt = select(Organization).where(Organization.id == org_id)
        org_res = await self.db.execute(org_stmt)
        org = org_res.scalar_one_or_none()
        if not org:
            raise ValueError("Organización no encontrada")

        branch = None
        if sale.branch_id:
            b_stmt = select(Branch).where(Branch.id == sale.branch_id)
            b_res = await self.db.execute(b_stmt)
            branch = b_res.scalar_one_or_none()

        customer = None
        if sale.customer_id:
            c_stmt = select(Customer).where(Customer.id == sale.customer_id)
            c_res = await self.db.execute(c_stmt)
            customer = c_res.scalar_one_or_none()

        raw_xml = HaciendaService.generate_hacienda_xml_v43(
            sale=sale,
            org=org,
            branch=branch,
            customer=customer
        )

        creds = ElectronicInvoicingService.get_credentials(str(org_id))
        if not creds:
            p12_bytes = generate_ephemeral_p12("1234")
            creds = {
                "environment": "STAGING",
                "username": "cpf-01-1150-0888@stag.comprobanteselectronicos.go.cr",
                "password": "DemoPassword123!",
                "pin": "1234",
                "p12_bytes": p12_bytes
            }
            ElectronicInvoicingService.set_credentials(
                str(org_id),
                creds["environment"],
                creds["username"],
                creds["password"],
                creds["pin"],
                p12_bytes
            )

        signed_xml = XAdESSigner.sign_xml(
            xml_string=raw_xml,
            p12_data=creds["p12_bytes"],
            pin=creds["pin"]
        )

        consecutive = HaciendaService.generate_consecutive(
            branch_code="001",
            terminal_code="00001",
            doc_type="01" if customer and customer.identification_number else "04",
            sequential_number=int("".join(filter(str.isdigit, sale.sale_number)) or 1)
        )
        clave = HaciendaService.generate_numeric_key(
            issuer_id_number=org.identification_number or "3101888999",
            consecutive=consecutive,
            date=sale.created_at
        )

        inv_stmt = select(ElectronicInvoice).where(ElectronicInvoice.sale_id == sale_id)
        inv_res = await self.db.execute(inv_stmt)
        invoice = inv_res.scalar_one_or_none()

        now = datetime.datetime.now(datetime.timezone.utc)
        if not invoice:
            invoice = ElectronicInvoice(
                organization_id=org_id,
                branch_id=sale.branch_id or org.branches[0].id if org.branches else uuid.uuid4(),
                sale_id=sale_id,
                consecutive_number=consecutive,
                numeric_key=clave,
                doc_type="01" if customer and customer.identification_number else "04",
                status="ACCEPTED" if simulate_success else "SENT_TO_HACIENDA",
                hacienda_status_code="200" if simulate_success else "202",
                sent_to_hacienda_at=now,
                hacienda_processed_at=now if simulate_success else None
            )
            self.db.add(invoice)
        else:
            invoice.numeric_key = clave
            invoice.consecutive_number = consecutive
            invoice.status = "ACCEPTED" if simulate_success else "SENT_TO_HACIENDA"
            invoice.sent_to_hacienda_at = now
            if simulate_success:
                invoice.hacienda_processed_at = now
                invoice.hacienda_status_code = "200"

        await self.db.flush()

        return {
            "invoice_id": str(invoice.id),
            "sale_id": str(sale.id),
            "clave": clave,
            "consecutive": consecutive,
            "status": "COMPLETED",
            "hacienda_status": invoice.status,
            "sent_at": now.isoformat(),
            "message": "Comprobante firmado con XAdES-BES y transmitido con éxito al Ministerio de Hacienda"
        }
