import re
import random
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, Optional
import xml.etree.ElementTree as ET
from app.models.sale import Sale
from app.models.organization import Organization
from app.models.branch import Branch
from app.models.customer import Customer

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
        b_clean = branch_code.zfill(3)[-3:]
        t_clean = terminal_code.zfill(5)[-5:]
        d_clean = doc_type.zfill(2)[-2:]
        s_clean = str(sequential_number).zfill(10)[-10:]
        return f"{b_clean}{t_clean}{d_clean}{s_clean}"

    @staticmethod
    def generate_numeric_key(
        issuer_id_number: str,
        consecutive: str,
        date: Optional[datetime] = None,
        situation: str = "1",
        security_code: Optional[str] = None
    ) -> str:
        dt = date or datetime.now(timezone.utc)
        day = dt.strftime("%d")
        month = dt.strftime("%m")
        year = dt.strftime("%y")

        clean_id = re.sub(r"\D", "", issuer_id_number or "3101888999").zfill(12)[-12:]
        sec_code = security_code or str(random.randint(10000000, 99999999))
        sec_clean = str(sec_code).zfill(8)[-8:]

        return f"506{day}{month}{year}{clean_id}{consecutive}{situation}{sec_clean}"

    @staticmethod
    def generate_hacienda_xml_v43(
        sale: Sale,
        org: Organization,
        branch: Optional[Branch] = None,
        customer: Optional[Customer] = None
    ) -> str:
        is_factura = customer is not None and customer.identification_number is not None
        root_tag = "FacturaElectronica" if is_factura else "TiqueteElectronico"
        ns = "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.3/" + ("facturaElectronica" if is_factura else "tiqueteElectronico")

        root = ET.Element(root_tag, xmlns=ns)

        seq_match = re.search(r"\d+", sale.sale_number or "1")
        seq_num = int(seq_match.group()) if seq_match else 1
        consecutivo = HaciendaService.generate_consecutive(
            branch_code="001",
            terminal_code="00001",
            doc_type="01" if is_factura else "04",
            sequential_number=seq_num
        )
        clave = HaciendaService.generate_numeric_key(
            issuer_id_number=org.identification_number or "3101888999",
            consecutive=consecutivo,
            date=sale.created_at
        )

        ET.SubElement(root, "Clave").text = clave
        ET.SubElement(root, "CodigoActividad").text = "521101"
        ET.SubElement(root, "NumeroConsecutivo").text = consecutivo
        ET.SubElement(root, "FechaEmision").text = (sale.created_at or datetime.now(timezone.utc)).strftime("%Y-%m-%dT%H:%M:%S-06:00")

        # Emisor
        emisor = ET.SubElement(root, "Emisor")
        ET.SubElement(emisor, "Nombre").text = org.legal_name or org.trade_name
        ident_emisor = ET.SubElement(emisor, "Identificacion")
        ET.SubElement(ident_emisor, "Tipo").text = "02" if org.identification_type == "JURIDICA" else "01"
        ET.SubElement(ident_emisor, "Numero").text = re.sub(r"\D", "", org.identification_number or "3101888999")
        if org.trade_name:
            ET.SubElement(emisor, "NombreComercial").text = org.trade_name
        if org.email:
            ET.SubElement(emisor, "CorreoElectronico").text = org.email

        # Receptor
        if is_factura and customer:
            receptor = ET.SubElement(root, "Receptor")
            ET.SubElement(receptor, "Nombre").text = customer.name
            ident_rec = ET.SubElement(receptor, "Identificacion")
            t_code = "02" if customer.identification_type == "JURIDICA" else ("03" if customer.identification_type == "DIMEX" else "01")
            ET.SubElement(ident_rec, "Tipo").text = t_code
            ET.SubElement(ident_rec, "Numero").text = re.sub(r"\D", "", customer.identification_number or "")
            if customer.email:
                ET.SubElement(receptor, "CorreoElectronico").text = customer.email

        ET.SubElement(root, "CondicionVenta").text = "01"
        ET.SubElement(root, "MedioPago").text = "01"

        # DetalleServicio
        detalle = ET.SubElement(root, "DetalleServicio")
        line_num = 1
        for item in sale.items:
            line = ET.SubElement(detalle, "LineaDetalle")
            ET.SubElement(line, "NumeroLinea").text = str(line_num)
            ET.SubElement(line, "CodigoComercial").text = item.product_sku or "PROD"
            ET.SubElement(line, "Cantidad").text = str(item.quantity)
            ET.SubElement(line, "UnidadMedida").text = "Unid"
            ET.SubElement(line, "Detalle").text = item.product_name
            ET.SubElement(line, "PrecioUnitario").text = round_crc(item.unit_price)
            ET.SubElement(line, "MontoTotal").text = round_crc(item.line_total)

            if item.tax_amount > 0:
                imp = ET.SubElement(line, "Impuesto")
                ET.SubElement(imp, "Codigo").text = "01"
                ET.SubElement(imp, "CodigoTarifa").text = "08" if item.tax_rate == Decimal("0.13") else "01"
                ET.SubElement(imp, "Tarifa").text = str(item.tax_rate * 100)
                ET.SubElement(imp, "Monto").text = round_crc(item.tax_amount)

            ET.SubElement(line, "MontoTotalLinea").text = round_crc(item.line_total + item.tax_amount)
            line_num += 1

        # ResumenFactura
        resumen = ET.SubElement(root, "ResumenFactura")
        ET.SubElement(resumen, "CodigoTipoMoneda").text = "CRC"
        ET.SubElement(resumen, "TotalServGravados").text = "0.00"
        ET.SubElement(resumen, "TotalServExentos").text = "0.00"
        ET.SubElement(resumen, "TotalMercanciasGravadas").text = round_crc(sale.subtotal_amount)
        ET.SubElement(resumen, "TotalMercanciasExentas").text = "0.00"
        ET.SubElement(resumen, "TotalGravado").text = round_crc(sale.subtotal_amount)
        ET.SubElement(resumen, "TotalExento").text = "0.00"
        ET.SubElement(resumen, "TotalVenta").text = round_crc(sale.subtotal_amount)
        ET.SubElement(resumen, "TotalDescuentos").text = round_crc(sale.discount_amount)
        ET.SubElement(resumen, "TotalVentaNeta").text = round_crc(sale.subtotal_amount - sale.discount_amount)
        ET.SubElement(resumen, "TotalImpuesto").text = round_crc(sale.tax_amount)
        ET.SubElement(resumen, "TotalComprobante").text = round_crc(sale.total_amount)

        return ET.tostring(root, encoding="utf-8", xml_declaration=True).decode("utf-8")

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
                "quantity": float(it.quantity),
                "unit_price": float(it.unit_price),
                "tax_rate_percent": float(it.tax_rate * 100),
                "tax_amount": float(it.tax_amount),
                "total": float(it.line_total + it.tax_amount)
            })

        payments_payload = []
        for p in sale.payments:
            payments_payload.append({
                "method": p.payment_method,
                "amount": float(p.amount),
                "reference": p.reference_number
            })

        is_factura = customer is not None and customer.identification_number is not None
        seq_match = re.search(r"\d+", sale.sale_number or "1")
        seq_num = int(seq_match.group()) if seq_match else 1
        consecutive = HaciendaService.generate_consecutive(
            branch_code="001",
            terminal_code="00001",
            doc_type="01" if is_factura else "04",
            sequential_number=seq_num
        )
        numeric_key = HaciendaService.generate_numeric_key(
            issuer_id_number=org.identification_number or "3101888999",
            consecutive=consecutive,
            date=sale.created_at
        )

        display_name = org.trade_name or org.legal_name

        return {
            "sale_id": str(sale.id),
            "sale_number": sale.sale_number,
            "created_at": sale.created_at.strftime("%Y-%m-%d %H:%M:%S") if sale.created_at else "",
            "store": {
                "name": display_name,
                "legal_name": org.legal_name,
                "legal_id": org.identification_number or "3101888999",
                "legal_id_type": org.identification_type or "JURIDICA",
                "phone": org.phone or "2222-0000",
                "email": org.email or "info@sanjoseexpress.cr",
                "address": branch.address if branch else "San José, Costa Rica",
                "branch_name": branch.name if branch else "Sucursal Central"
            },
            "customer": {
                "name": customer.name if customer else "CLIENTE CONTADO",
                "identification": customer.identification_number if customer else None,
                "email": customer.email if customer else None
            },
            "hacienda": {
                "doc_type": "01 Factura Electrónica" if is_factura else "04 Tiquete Electrónico",
                "consecutive": consecutive,
                "numeric_key": numeric_key,
                "resolution": "Autorizada mediante resolución Nº DGT-R-48-2016",
                "qr_url": f"https://tribunet.hacienda.go.cr/docs/{numeric_key}"
            },
            "items": items_payload,
            "totals": {
                "subtotal": float(sale.subtotal_amount),
                "discount": float(sale.discount_amount),
                "tax": float(sale.tax_amount),
                "total": float(sale.total_amount),
                "currency": "CRC"
            },
            "payments": payments_payload,
            "footer_message": f"¡Gracias por su compra en {display_name}!"
        }
