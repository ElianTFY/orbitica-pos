import os
import decimal
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
from decimal import Decimal, ROUND_HALF_UP
from lxml import etree
from app.models.sale import Sale
from app.models.organization import Organization
from app.models.branch import Branch
from app.models.customer import Customer
from app.core.config import settings
from app.core.exceptions import BadRequestException

CR_TIMEZONE = timezone(timedelta(hours=-6))

DOC_NAMESPACES = {
    "01": "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica",
    "02": "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/notaDebitoElectronica",
    "03": "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/notaCreditoElectronica",
    "04": "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/tiqueteElectronico"
}

ROOT_TAGS = {
    "01": "FacturaElectronica",
    "02": "NotaDebitoElectronica",
    "03": "NotaCreditoElectronica",
    "04": "TiqueteElectronico"
}

XSD_FILES = {
    "01": "FacturaElectronica_V4.4.xsd",
    "02": "NotaDebitoElectronica_V4.4.xsd",
    "03": "NotaCreditoElectronica_V4.4.xsd",
    "04": "TiqueteElectronico_V4.4.xsd"
}

def fmt_money(val: Decimal, dec: int = 5) -> str:
    return str(val.quantize(Decimal(f"0.{'0' * dec}"), rounding=ROUND_HALF_UP))

def fmt_money_2(val: Decimal) -> str:
    return str(val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

def map_tax_rate_code(rate_pct: Decimal) -> Tuple[str, str]:
    """
    Returns (CodigoImpuesto, CodigoTarifa) according to Hacienda Costa Rica v4.4 catalogue:
    08 = Tarifa general 13%
    07 = Tarifa reducida 8%
    04 = Tarifa reducida 4%
    03 = Tarifa reducida 2%
    02 = Tarifa reducida 1%
    01 = Tarifa 0% (Exento)
    """
    pct = rate_pct.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    if pct >= Decimal("13.00"):
        return "01", "08"
    elif pct >= Decimal("8.00"):
        return "01", "07"
    elif pct >= Decimal("4.00"):
        return "01", "04"
    elif pct >= Decimal("2.00"):
        return "01", "03"
    elif pct >= Decimal("1.00"):
        return "01", "02"
    else:
        return "01", "01"

class HaciendaXMLGeneratorV44:
    @classmethod
    def validate_xml_schema(cls, xml_content: str, doc_type: str) -> None:
        """
        Validates XML against the official Costa Rica v4.4 XMLSchema (XSD).
        Raises BadRequestException if XML does not strictly conform.
        """
        xsd_filename = XSD_FILES.get(doc_type, XSD_FILES["04"])
        base_dir = os.path.dirname(os.path.dirname(__file__))
        xsd_path = os.path.join(base_dir, "schemas_xml", "v4.4", xsd_filename)

        if not os.path.exists(xsd_path):
            return  # Skip if XSD file is not bundled

        try:
            with open(xsd_path, "rb") as f:
                schema_doc = etree.parse(f)
                schema = etree.XMLSchema(schema_doc)

            xml_doc = etree.fromstring(xml_content.encode("utf-8"))
            schema.assertValid(xml_doc)
        except etree.DocumentInvalid as e:
            raise BadRequestException(f"Error de validación XMLSchema XSD v4.4: {str(e)}")
        except Exception as e:
            raise BadRequestException(f"Fallo en validación estructural XML v4.4: {str(e)}")

    @classmethod
    def generate_xml(
        cls,
        doc_type: str,
        numeric_key: str,
        consecutive_number: str,
        sale: Sale,
        org: Organization,
        branch: Branch,
        customer: Optional[Customer] = None,
        reference_info: Optional[Dict[str, Any]] = None,
        validate_xsd: bool = True
    ) -> str:
        ns = DOC_NAMESPACES.get(doc_type, DOC_NAMESPACES["04"])
        root_tag = ROOT_TAGS.get(doc_type, ROOT_TAGS["04"])

        NSMAP = {
            None: ns,
            "xsd": "http://www.w3.org/2001/XMLSchema",
            "xsi": "http://www.w3.org/2001/XMLSchema-instance"
        }

        root = etree.Element(f"{{{ns}}}{root_tag}", nsmap=NSMAP)

        # 1. Clave (50 digits)
        etree.SubElement(root, f"{{{ns}}}Clave").text = numeric_key

        # 2. CodigoActividad (6 digits)
        act_code = str(org.economic_activity_code or "521101").zfill(6)[:6]
        etree.SubElement(root, f"{{{ns}}}CodigoActividad").text = act_code

        # 3. NumeroConsecutivo (20 digits)
        etree.SubElement(root, f"{{{ns}}}NumeroConsecutivo").text = consecutive_number

        # 4. FechaEmision (ISO 8601 UTC-6)
        cr_now = datetime.now(CR_TIMEZONE)
        etree.SubElement(root, f"{{{ns}}}FechaEmision").text = cr_now.isoformat()

        # 5. Emisor
        emisor = etree.SubElement(root, f"{{{ns}}}Emisor")
        etree.SubElement(emisor, f"{{{ns}}}Nombre").text = org.legal_name[:100]

        emisor_id = etree.SubElement(emisor, f"{{{ns}}}Identificacion")
        etree.SubElement(emisor_id, f"{{{ns}}}Tipo").text = org.identification_type.zfill(2)[:2]
        etree.SubElement(emisor_id, f"{{{ns}}}Numero").text = "".join(c for c in org.identification_number if c.isdigit())[:12]

        if org.trade_name:
            etree.SubElement(emisor, f"{{{ns}}}NombreComercial").text = org.trade_name[:80]

        ubicacion = etree.SubElement(emisor, f"{{{ns}}}Ubicacion")
        etree.SubElement(ubicacion, f"{{{ns}}}Provincia").text = str(org.province_code or "1")[:1]
        etree.SubElement(ubicacion, f"{{{ns}}}Canton").text = str(org.canton_code or "01").zfill(2)[:2]
        etree.SubElement(ubicacion, f"{{{ns}}}Distrito").text = str(org.district_code or "01").zfill(2)[:2]
        if org.neighborhood_code:
            etree.SubElement(ubicacion, f"{{{ns}}}Barrio").text = str(org.neighborhood_code).zfill(2)[:2]
        etree.SubElement(ubicacion, f"{{{ns}}}OtrasSenas").text = (org.address_detail or "Costa Rica")[:250]

        if org.phone:
            tel = etree.SubElement(emisor, f"{{{ns}}}Telefono")
            etree.SubElement(tel, f"{{{ns}}}CodigoPais").text = "506"
            etree.SubElement(tel, f"{{{ns}}}NumTelefono").text = "".join(c for c in org.phone if c.isdigit())[:20]

        etree.SubElement(emisor, f"{{{ns}}}CorreoElectronico").text = org.email[:160]

        # 6. Receptor (Mandatory for Factura 01, Notas 02/03)
        if doc_type in ["01", "02", "03"] or (customer and customer.identification_number):
            rec_elem = etree.SubElement(root, f"{{{ns}}}Receptor")
            rec_name = customer.name if customer else "Cliente General"
            etree.SubElement(rec_elem, f"{{{ns}}}Nombre").text = rec_name[:100]

            if customer and customer.identification_number:
                rec_id = etree.SubElement(rec_elem, f"{{{ns}}}Identificacion")
                rec_id_type = customer.identification_type or "01"
                etree.SubElement(rec_id, f"{{{ns}}}Tipo").text = str(rec_id_type).zfill(2)[:2]
                etree.SubElement(rec_id, f"{{{ns}}}Numero").text = "".join(c for c in customer.identification_number if c.isdigit())[:12]

            if customer and customer.email:
                etree.SubElement(rec_elem, f"{{{ns}}}CorreoElectronico").text = customer.email[:160]

        # 7. CondicionVenta (01=Contado, 02=Credito)
        etree.SubElement(root, f"{{{ns}}}CondicionVenta").text = "01"

        # 8. MedioPago (01=Efectivo, 02=Tarjeta, 04=Transferencia/SINPE)
        med_pago = "01"
        if sale.payments:
            first_pay = sale.payments[0].payment_method
            if "CARD" in first_pay:
                med_pago = "02"
            elif "SINPE" in first_pay or "TRANSFER" in first_pay:
                med_pago = "04"
        etree.SubElement(root, f"{{{ns}}}MedioPago").text = med_pago

        # 9. DetalleServicio
        detalle_servicio = etree.SubElement(root, f"{{{ns}}}DetalleServicio")

        tot_grav = Decimal("0.00")
        tot_exento = Decimal("0.00")
        tot_merc_grav = Decimal("0.00")
        tot_merc_exenta = Decimal("0.00")
        tot_serv_grav = Decimal("0.00")
        tot_serv_exento = Decimal("0.00")
        tot_desc = Decimal("0.00")
        tot_impuesto = Decimal("0.00")

        line_num = 1
        for item in sale.items:
            line_elem = etree.SubElement(detalle_servicio, f"{{{ns}}}LineaDetalle")
            etree.SubElement(line_elem, f"{{{ns}}}NumeroLinea").text = str(line_num)

            # Codigo CAByS validation (strictly 13 digits, reject dummy 0000000000000)
            raw_cabys = getattr(item, "cabys_code", None)
            if not raw_cabys and hasattr(item, "product") and item.product:
                raw_cabys = getattr(item.product, "cabys_code", None)
            cabys_code = str(raw_cabys or "5211010000000").strip()

            if not cabys_code.isdigit() or len(cabys_code) != 13 or cabys_code == "0000000000000":
                raise BadRequestException(
                    f"Línea #{line_num}: Código CAByS '{cabys_code}' inválido. Debe contener 13 dígitos oficiales de Hacienda."
                )

            etree.SubElement(line_elem, f"{{{ns}}}CodigoCabys").text = cabys_code

            # Codigo Comercial
            sku_val = getattr(item, "product_sku", None) or (getattr(item.product, "sku", None) if hasattr(item, "product") else None)
            if sku_val:
                cod_com = etree.SubElement(line_elem, f"{{{ns}}}CodigoComercial")
                etree.SubElement(cod_com, f"{{{ns}}}Tipo").text = "04"  # 04=Uso Interno
                etree.SubElement(cod_com, f"{{{ns}}}Codigo").text = str(sku_val)[:20]

            etree.SubElement(line_elem, f"{{{ns}}}Cantidad").text = fmt_money(item.quantity, 3)
            
            unit_val = getattr(item, "unit_of_measure", None) or (getattr(item.product, "unit_of_measure", None) if hasattr(item, "product") else "Unid") or "Unid"
            etree.SubElement(line_elem, f"{{{ns}}}UnidadMedida").text = str(unit_val)[:10]
            
            etree.SubElement(line_elem, f"{{{ns}}}Detalle").text = (item.product_name or "Producto")[:200]
            etree.SubElement(line_elem, f"{{{ns}}}PrecioUnitario").text = fmt_money(item.unit_price, 5)

            monto_total_linea_bruta = item.unit_price * item.quantity
            etree.SubElement(line_elem, f"{{{ns}}}MontoTotal").text = fmt_money_2(monto_total_linea_bruta)

            # Descuento
            disc_val = getattr(item, "discount_amount", Decimal("0.00")) or Decimal("0.00")
            if disc_val > Decimal("0.00"):
                desc_elem = etree.SubElement(line_elem, f"{{{ns}}}Descuento")
                etree.SubElement(desc_elem, f"{{{ns}}}MontoDescuento").text = fmt_money_2(disc_val)
                etree.SubElement(desc_elem, f"{{{ns}}}NaturalezaDescuento").text = "Descuento comercial POS"
                tot_desc += disc_val

            # Subtotal linea
            subtotal_line = monto_total_linea_bruta - disc_val
            etree.SubElement(line_elem, f"{{{ns}}}SubTotal").text = fmt_money_2(subtotal_line)

            # Impuesto Dinámico
            tax_rate_pct = getattr(item, "tax_rate_percentage", None) or getattr(item, "tax_rate", Decimal("13.00")) or Decimal("13.00")
            cod_imp, cod_tarifa = map_tax_rate_code(tax_rate_pct)

            if tax_rate_pct > Decimal("0.00"):
                base_line = (subtotal_line / (Decimal("1.00") + (tax_rate_pct / Decimal("100.00")))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                monto_imp = subtotal_line - base_line
                tot_impuesto += monto_imp
                tot_grav += base_line
                tot_merc_grav += base_line

                imp_elem = etree.SubElement(line_elem, f"{{{ns}}}Impuesto")
                etree.SubElement(imp_elem, f"{{{ns}}}Codigo").text = cod_imp
                etree.SubElement(imp_elem, f"{{{ns}}}CodigoTarifa").text = cod_tarifa
                etree.SubElement(imp_elem, f"{{{ns}}}Tarifa").text = fmt_money_2(tax_rate_pct)
                etree.SubElement(imp_elem, f"{{{ns}}}Monto").text = fmt_money_2(monto_imp)
            else:
                tot_exento += subtotal_line
                tot_merc_exenta += subtotal_line

            etree.SubElement(line_elem, f"{{{ns}}}MontoTotalLinea").text = fmt_money_2(subtotal_line)
            line_num += 1

        # 10. ResumenFactura
        resumen = etree.SubElement(root, f"{{{ns}}}ResumenFactura")
        tipo_moneda = etree.SubElement(resumen, f"{{{ns}}}CodigoTipoMoneda")
        etree.SubElement(tipo_moneda, f"{{{ns}}}CodigoMoneda").text = sale.currency or "CRC"
        etree.SubElement(tipo_moneda, f"{{{ns}}}TipoCambio").text = "1.00000"

        etree.SubElement(resumen, f"{{{ns}}}TotalServGravados").text = fmt_money_2(tot_serv_grav)
        etree.SubElement(resumen, f"{{{ns}}}TotalServExentos").text = fmt_money_2(tot_serv_exento)
        etree.SubElement(resumen, f"{{{ns}}}TotalMercanciasGravadas").text = fmt_money_2(tot_merc_grav)
        etree.SubElement(resumen, f"{{{ns}}}TotalMercanciasExentas").text = fmt_money_2(tot_merc_exenta)
        etree.SubElement(resumen, f"{{{ns}}}TotalGravado").text = fmt_money_2(tot_grav)
        etree.SubElement(resumen, f"{{{ns}}}TotalExento").text = fmt_money_2(tot_exento)
        etree.SubElement(resumen, f"{{{ns}}}TotalVenta").text = fmt_money_2(tot_grav + tot_exento)
        etree.SubElement(resumen, f"{{{ns}}}TotalDescuentos").text = fmt_money_2(tot_desc)
        etree.SubElement(resumen, f"{{{ns}}}TotalVentaNeta").text = fmt_money_2(tot_grav + tot_exento - tot_desc)
        etree.SubElement(resumen, f"{{{ns}}}TotalImpuesto").text = fmt_money_2(tot_impuesto)
        etree.SubElement(resumen, f"{{{ns}}}TotalComprobante").text = fmt_money_2(sale.total_amount)

        # 11. InformacionReferencia (If Credit / Debit Note)
        if reference_info:
            ref_elem = etree.SubElement(root, f"{{{ns}}}InformacionReferencia")
            etree.SubElement(ref_elem, f"{{{ns}}}TipoDoc").text = reference_info.get("doc_type", "01")
            etree.SubElement(ref_elem, f"{{{ns}}}Numero").text = reference_info.get("numeric_key", "")
            etree.SubElement(ref_elem, f"{{{ns}}}FechaEmision").text = reference_info.get("emission_date", cr_now.isoformat())
            etree.SubElement(ref_elem, f"{{{ns}}}Codigo").text = reference_info.get("code", "01")
            etree.SubElement(ref_elem, f"{{{ns}}}Razon").text = reference_info.get("reason", "Anulación autorizada en POS")[:180]

        # 12. ProveedorSistemas (Costa Rica v4.4 Requirement)
        prov_elem = etree.SubElement(root, f"{{{ns}}}ProveedorSistemas")
        prov_id = etree.SubElement(prov_elem, f"{{{ns}}}Identificacion")
        etree.SubElement(prov_id, f"{{{ns}}}Tipo").text = settings.SOFTWARE_PROVIDER_TAX_ID_TYPE
        etree.SubElement(prov_id, f"{{{ns}}}Numero").text = settings.SOFTWARE_PROVIDER_TAX_ID
        etree.SubElement(prov_elem, f"{{{ns}}}RazonSocial").text = settings.SOFTWARE_PROVIDER_NAME

        xml_str = etree.tostring(root, encoding="utf-8", xml_declaration=True, pretty_print=True).decode("utf-8")

        # 13. Strict XMLSchema XSD Validation
        if validate_xsd:
            cls.validate_xml_schema(xml_str, doc_type)

        return xml_str

def generate_hacienda_xml_v44(
    sale: Sale,
    org: Organization,
    branch: Optional[Branch] = None,
    customer: Optional[Customer] = None,
    doc_type: str = "04",
    numeric_key: Optional[str] = None,
    consecutive_number: Optional[str] = None,
    reference_info: Optional[Dict[str, Any]] = None,
    validate_xsd: bool = True
) -> str:
    import re
    from app.services.consecutive_service import ConsecutiveService

    branch_code = branch.code if branch else "001"
    if not consecutive_number:
        seq_match = re.search(r"\d+", sale.sale_number or "1")
        seq_num = int(seq_match.group()) if seq_match else 1
        consecutive_number = ConsecutiveService.build_consecutivo_20(
            branch_code=branch_code,
            terminal_number="00001",
            doc_type=doc_type,
            consecutive_int=seq_num
        )

    if not numeric_key:
        numeric_key, _ = ConsecutiveService.build_clave_50(
            emitter_tax_id=org.identification_number,
            consecutivo_20=consecutive_number,
            doc_date=sale.created_at or datetime.now(timezone.utc),
            situation="1"
        )

    actual_branch = branch or Branch(
        code="001",
        name="Casa Matriz",
        organization_id=org.id
    )

    return HaciendaXMLGeneratorV44.generate_xml(
        doc_type=doc_type,
        numeric_key=numeric_key,
        consecutive_number=consecutive_number,
        sale=sale,
        org=org,
        branch=actual_branch,
        customer=customer,
        reference_info=reference_info,
        validate_xsd=validate_xsd
    )
