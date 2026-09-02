import re
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, Optional
from app.models.sale import Sale
from app.models.organization import Organization
from app.models.branch import Branch
from app.models.customer import Customer
from app.services.consecutive_service import ConsecutiveService
from app.services.hacienda_xml_generator_v44 import generate_hacienda_xml_v44

def round_crc(val: Decimal) -> str:
    return str(val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

class HaciendaService:
    @staticmethod
    def generate_consecutive(
        branch_code: str = "001",
        terminal_code: str = "00001",
        doc_type: str = "04",
        sequential_number: int = 1
    ) -> str:
        return ConsecutiveService.build_consecutivo_20(
            branch_code=branch_code,
            terminal_number=terminal_code,
            doc_type=doc_type,
            consecutive_int=sequential_number
        )

    @staticmethod
    def generate_numeric_key(
        issuer_id_number: str,
        consecutive: str,
        date: Optional[datetime] = None,
        situation: str = "1",
        security_code: Optional[str] = None
    ) -> str:
        clave, _ = ConsecutiveService.build_clave_50(
            emitter_tax_id=issuer_id_number,
            consecutivo_20=consecutive,
            doc_date=date or datetime.now(timezone.utc),
            situation=situation,
            security_code=security_code
        )
        return clave

    @staticmethod
    def generate_hacienda_xml(
        sale: Sale,
        org: Organization,
        branch: Optional[Branch] = None,
        customer: Optional[Customer] = None,
        doc_type: Optional[str] = None
    ) -> str:
        dtype = doc_type or ("01" if customer and customer.identification_number else "04")
        return generate_hacienda_xml_v44(
            sale=sale,
            org=org,
            branch=branch,
            customer=customer,
            doc_type=dtype
        )

    @staticmethod
    def generate_thermal_receipt_payload(
        sale: Sale,
        org: Organization,
        branch: Optional[Branch] = None,
        customer: Optional[Customer] = None
    ) -> Dict[str, Any]:
        items_payload = []
        for it in sale.items:
            items_payload.append({
                "name": it.product_name,
                "sku": it.product_sku,
                "cabys_code": getattr(it, "cabys_code", "5211010000100"),
                "quantity": float(it.quantity),
                "unit_price": float(it.unit_price),
                "tax_rate_percent": float(it.tax_rate),
                "tax_amount": float(it.tax_amount),
                "total": float(it.line_total)
            })

        payments_payload = []
        for p in sale.payments:
            payments_payload.append({
                "method": p.payment_method,
                "amount": float(p.amount),
                "change_returned": float(p.change_returned) if hasattr(p, "change_returned") else 0.0,
                "reference": p.reference_number
            })

        is_factura = customer is not None and customer.identification_number is not None
        doc_type = "01" if is_factura else "04"
        branch_code = branch.code if branch else "001"
        seq_match = re.search(r"\d+", sale.sale_number or "1")
        seq_num = int(seq_match.group()) if seq_match else 1
        
        consecutive = ConsecutiveService.build_consecutivo_20(
            branch_code=branch_code,
            terminal_number="00001",
            doc_type=doc_type,
            consecutive_int=seq_num
        )
        numeric_key, _ = ConsecutiveService.build_clave_50(
            emitter_tax_id=org.identification_number,
            consecutivo_20=consecutive,
            doc_date=sale.created_at or datetime.now(timezone.utc),
            situation="1"
        )

        display_name = org.trade_name or org.legal_name

        return {
            "sale_id": str(sale.id),
            "sale_number": sale.sale_number,
            "created_at": sale.created_at.strftime("%Y-%m-%d %H:%M:%S") if sale.created_at else "",
            "store": {
                "name": display_name,
                "legal_name": org.legal_name,
                "legal_id": org.identification_number,
                "legal_id_type": org.identification_type,
                "phone": org.phone or (branch.phone if branch else ""),
                "email": org.email,
                "address": branch.address if branch else (org.address_detail or "Costa Rica"),
                "branch_name": branch.name if branch else "Casa Matriz",
                "branch_code": branch_code
            },
            "customer": {
                "name": customer.name if customer else "CLIENTE CONTADO",
                "identification": customer.identification_number if customer else None,
                "identification_type": customer.identification_type if customer else None,
                "email": customer.email if customer else None
            },
            "hacienda": {
                "version": "v4.4",
                "doc_type": "01 Factura Electrónica" if is_factura else "04 Tiquete Electrónico",
                "consecutive": consecutive,
                "numeric_key": numeric_key,
                "resolution": "Autorizada mediante resolución de Comprobantes Electrónicos DGT",
                "qr_url": f"https://tribunet.hacienda.go.cr/docs/{numeric_key}"
            },
            "items": items_payload,
            "totals": {
                "subtotal": float(sale.subtotal_amount),
                "discount": float(sale.discount_amount),
                "tax": float(sale.tax_amount),
                "total": float(sale.total_amount),
                "currency": sale.currency or "CRC"
            },
            "payments": payments_payload,
            "footer_message": f"¡Gracias por su compra en {display_name}!"
        }
