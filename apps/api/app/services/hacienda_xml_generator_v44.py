import os
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
from app.core.cabys_catalog import map_fiscal_v44_tax_tariff, DEFAULT_OFFICIAL_CABYS

CR_TIMEZONE = timezone(timedelta(hours=-6))

DOC_NAMESPACES = {
    "01": "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica",
    "02": "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/notaDebitoElectronica",
    "03": "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/notaCreditoElectronica",
    "04": "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/tiqueteElectronico",
    "05": "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/mensajeReceptor"
}

ROOT_TAGS = {
    "01": "FacturaElectronica",
    "02": "NotaDebitoElectronica",
    "03": "NotaCreditoElectronica",
    "04": "TiqueteElectronico",
    "05": "MensajeReceptor"
}

XSD_FILES = {
    "01": "FacturaElectronica_V4.4.xsd",
    "02": "NotaDebitoElectronica_V4.4.xsd",
    "03": "NotaCreditoElectronica_V4.4.xsd",
    "04": "TiqueteElectronico_V4.4.xsd",
    "05": "MensajeReceptor_V4.4.xsd"
}

_COMPILED_SCHEMAS: Dict[str, etree.XMLSchema] = {}

def fmt_money(val: Decimal, dec: int = 5) -> str:
    return str(val.quantize(Decimal(f"0.{'0' * dec}"), rounding=ROUND_HALF_UP))

def fmt_money_2(val: Decimal) -> str:
    return str(val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

def map_tax_rate_code(rate_pct: Decimal, is_exonerated: bool = False, without_credit: bool = False) -> Tuple[str, str]:
    return map_fiscal_v44_tax_tariff(rate_pct, is_exonerated=is_exonerated, without_credit=without_credit)

class DsigResolver(etree.Resolver):
    def __init__(self, schema_dir: str):
        super().__init__()
        self.schema_dir = schema_dir

    def resolve(self, url, pubid, context):
        if "xmldsig" in url:
            dsig_path = os.path.join(self.schema_dir, "xmldsig-core-schema.xsd")
            if os.path.exists(dsig_path):
                return self.resolve_filename(dsig_path, context)
        return None

class HaciendaXMLGeneratorV44:
    @classmethod
    def get_compiled_schema(cls, doc_type: str) -> Optional[etree.XMLSchema]:
        if doc_type in _COMPILED_SCHEMAS:
            return _COMPILED_SCHEMAS[doc_type]

        xsd_filename = XSD_FILES.get(doc_type, XSD_FILES["04"])
        base_dir = os.path.dirname(os.path.dirname(__file__))
        schema_dir = os.path.join(base_dir, "schemas_xml", "v4.4")
        xsd_path = os.path.join(schema_dir, xsd_filename)

        if not os.path.exists(xsd_path):
            return None

        parser = etree.XMLParser()
        parser.resolvers.add(DsigResolver(schema_dir))
        with open(xsd_path, "rb") as f:
            schema_doc = etree.parse(f, parser)
            schema = etree.XMLSchema(schema_doc)

        _COMPILED_SCHEMAS[doc_type] = schema
        return schema

    @classmethod
    def validate_xml_schema(cls, xml_content: str, doc_type: str) -> None:
        """
        Validates XML against the official Costa Rica v4.4 XMLSchema (XSD).
        Raises BadRequestException if XML does not strictly conform.
        """
        schema = cls.get_compiled_schema(doc_type)
        if not schema:
            return

        try:
            xml_doc = etree.fromstring(xml_content.encode("utf-8"))
            dsig_ns = "http://www.w3.org/2000/09/xmldsig#"
            if doc_type in ["01", "02", "03", "04", "05"] and xml_doc.find(f"{{{dsig_ns}}}Signature") is None:
                # Pre-signature structural validation: inject valid ds:Signature structure to satisfy XSD minOccurs=1
                sig_dummy = etree.Element(f"{{{dsig_ns}}}Signature", nsmap={"ds": dsig_ns})
                si = etree.SubElement(sig_dummy, f"{{{dsig_ns}}}SignedInfo")
                etree.SubElement(si, f"{{{dsig_ns}}}CanonicalizationMethod", Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315")
                etree.SubElement(si, f"{{{dsig_ns}}}SignatureMethod", Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256")
                ref = etree.SubElement(si, f"{{{dsig_ns}}}Reference", URI="")
                transforms = etree.SubElement(ref, f"{{{dsig_ns}}}Transforms")
                etree.SubElement(transforms, f"{{{dsig_ns}}}Transform", Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature")
                etree.SubElement(ref, f"{{{dsig_ns}}}DigestMethod", Algorithm="http://www.w3.org/2001/04/xmlenc#sha256")
                etree.SubElement(ref, f"{{{dsig_ns}}}DigestValue").text = "MA=="
                etree.SubElement(sig_dummy, f"{{{dsig_ns}}}SignatureValue").text = "MA=="
                xml_doc.append(sig_dummy)

            schema.assertValid(xml_doc)
        except etree.DocumentInvalid as e:
            raise BadRequestException(f"Error de validación XMLSchema XSD v4.4 ({XSD_FILES.get(doc_type)}): {str(e)}")
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
        other_charges: Optional[List[Dict[str, Any]]] = None,
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

        # 2. ProveedorSistemas (Mandatory in v4.4)
        prov_id = getattr(settings, "SOFTWARE_PROVIDER_TAX_ID", None) or "3101999888"
        etree.SubElement(root, f"{{{ns}}}ProveedorSistemas").text = "".join(c for c in prov_id if c.isdigit())[:20]

        # 3. CodigoActividadEmisor (6 digits)
        act_code = str(org.economic_activity_code or "620101").zfill(6)[:6]
        etree.SubElement(root, f"{{{ns}}}CodigoActividadEmisor").text = act_code

        # 4. CodigoActividadReceptor (Optional, only for Factura 01 and Notas 02/03)
        if doc_type in ["01", "02", "03"] and customer and getattr(customer, "economic_activity_code", None):
            etree.SubElement(root, f"{{{ns}}}CodigoActividadReceptor").text = str(customer.economic_activity_code).zfill(6)[:6]

        # 5. NumeroConsecutivo (20 digits)
        etree.SubElement(root, f"{{{ns}}}NumeroConsecutivo").text = consecutive_number

        # 6. FechaEmision (ISO 8601 UTC-6)
        cr_now = datetime.now(CR_TIMEZONE)
        etree.SubElement(root, f"{{{ns}}}FechaEmision").text = cr_now.isoformat()

        # 7. Emisor
        emisor = etree.SubElement(root, f"{{{ns}}}Emisor")
        etree.SubElement(emisor, f"{{{ns}}}Nombre").text = org.legal_name[:100]

        emisor_id = etree.SubElement(emisor, f"{{{ns}}}Identificacion")
        etree.SubElement(emisor_id, f"{{{ns}}}Tipo").text = str(org.identification_type or "01").zfill(2)[:2]
        clean_emisor_num = "".join(c for c in org.identification_number if c.isdigit())[:12]
        etree.SubElement(emisor_id, f"{{{ns}}}Numero").text = clean_emisor_num

        if org.trade_name:
            etree.SubElement(emisor, f"{{{ns}}}NombreComercial").text = org.trade_name[:80]

        ubicacion = etree.SubElement(emisor, f"{{{ns}}}Ubicacion")
        etree.SubElement(ubicacion, f"{{{ns}}}Provincia").text = str(org.province_code or "1")[:1]
        etree.SubElement(ubicacion, f"{{{ns}}}Canton").text = str(org.canton_code or "01").zfill(2)[:2]
        etree.SubElement(ubicacion, f"{{{ns}}}Distrito").text = str(org.district_code or "01").zfill(2)[:2]
        if org.neighborhood_code and len(str(org.neighborhood_code).strip()) >= 5:
            etree.SubElement(ubicacion, f"{{{ns}}}Barrio").text = str(org.neighborhood_code).strip()[:50]
        etree.SubElement(ubicacion, f"{{{ns}}}OtrasSenas").text = (org.address_detail or "San Jose, Costa Rica")[:250]

        if org.phone:
            tel = etree.SubElement(emisor, f"{{{ns}}}Telefono")
            etree.SubElement(tel, f"{{{ns}}}CodigoPais").text = "506"
            etree.SubElement(tel, f"{{{ns}}}NumTelefono").text = "".join(c for c in org.phone if c.isdigit())[:20]

        etree.SubElement(emisor, f"{{{ns}}}CorreoElectronico").text = org.email[:160]

        # 8. Receptor (Mandatory for Factura 01, Notas 02/03; Optional for Tiquete 04)
        if doc_type in ["01", "02", "03"] or (customer and customer.identification_number):
            rec_elem = etree.SubElement(root, f"{{{ns}}}Receptor")
            rec_name = customer.name if customer else "Cliente General"
            etree.SubElement(rec_elem, f"{{{ns}}}Nombre").text = rec_name[:100]

            rec_id_str = customer.identification_number if customer else "000000000"
            rec_id_type = customer.identification_type if customer else "01"

            rec_id = etree.SubElement(rec_elem, f"{{{ns}}}Identificacion")
            etree.SubElement(rec_id, f"{{{ns}}}Tipo").text = str(rec_id_type).zfill(2)[:2]
            clean_rec_num = "".join(c for c in rec_id_str if c.isdigit())[:12]
            etree.SubElement(rec_id, f"{{{ns}}}Numero").text = clean_rec_num if clean_rec_num else "000000000"

            if customer and customer.email:
                etree.SubElement(rec_elem, f"{{{ns}}}CorreoElectronico").text = customer.email[:160]

        # 9. CondicionVenta (01=Contado, 02=Crédito)
        cond_venta = getattr(sale, "payment_condition", "01") or "01"
        etree.SubElement(root, f"{{{ns}}}CondicionVenta").text = cond_venta

        # 10. PlazoCredito (Mandatory if CondicionVenta == "02")
        if cond_venta == "02":
            credit_days = getattr(sale, "credit_term_days", 30) or 30
            etree.SubElement(root, f"{{{ns}}}PlazoCredito").text = str(credit_days)[:5]

        # 11. DetalleServicio
        detalle_servicio = etree.SubElement(root, f"{{{ns}}}DetalleServicio")

        tot_grav = Decimal("0.00")
        tot_exento = Decimal("0.00")
        tot_merc_grav = Decimal("0.00")
        tot_merc_exenta = Decimal("0.00")
        tot_serv_grav = Decimal("0.00")
        tot_serv_exento = Decimal("0.00")
        tot_desc = Decimal("0.00")
        tot_impuesto = Decimal("0.00")

        # Track breakdowns per tax code and tariff for ResumenFactura
        tax_breakdowns: Dict[Tuple[str, str], Decimal] = {}

        line_num = 1
        for item in sale.items:
            line_elem = etree.SubElement(detalle_servicio, f"{{{ns}}}LineaDetalle")
            etree.SubElement(line_elem, f"{{{ns}}}NumeroLinea").text = str(line_num)

            # Codigo CABYS (Strict 13 digits)
            raw_cabys = getattr(item, "cabys_code", None)
            if not raw_cabys and hasattr(item, "product") and item.product:
                raw_cabys = getattr(item.product, "cabys_code", None)
            cabys_code = str(raw_cabys or DEFAULT_OFFICIAL_CABYS).strip()

            if not cabys_code.isdigit() or len(cabys_code) != 13 or cabys_code == "0000000000000":
                raise BadRequestException(
                    f"Línea #{line_num}: Código CAByS '{cabys_code}' inválido. Debe contener 13 dígitos oficiales de Hacienda."
                )

            etree.SubElement(line_elem, f"{{{ns}}}CodigoCABYS").text = cabys_code

            # Codigo Comercial (minOccurs=0)
            sku_val = getattr(item, "product_sku", None) or (getattr(item.product, "sku", None) if hasattr(item, "product") else None)
            if sku_val:
                cod_com = etree.SubElement(line_elem, f"{{{ns}}}CodigoComercial")
                etree.SubElement(cod_com, f"{{{ns}}}Tipo").text = "04"  # 04=Uso Interno
                etree.SubElement(cod_com, f"{{{ns}}}Codigo").text = str(sku_val)[:20]

            raw_qty = Decimal(str(item.quantity))
            raw_price = Decimal(str(item.unit_price))
            raw_tax = getattr(item, "tax_amount", Decimal("0.00")) or Decimal("0.00")
            tax_rate_pct = getattr(item, "tax_rate_percentage", None) or getattr(item, "tax_rate", Decimal("13.00")) or Decimal("13.00")
            disc_val = getattr(item, "discount_amount", Decimal("0.00")) or Decimal("0.00")

            # In CR fiscal invoicing:
            # If item was recorded with tax-inclusive price, extract net ex-tax unit price
            line_total_val = getattr(item, "line_total", None)
            if line_total_val and raw_tax > Decimal("0.00") and abs(line_total_val - (raw_price * raw_qty)) < Decimal("0.02"):
                ex_tax_total = line_total_val - raw_tax + disc_val
                unit_price_ex_tax = (ex_tax_total / raw_qty).quantize(Decimal("0.00001"), rounding=ROUND_HALF_UP)
            elif tax_rate_pct > Decimal("0.00") and raw_tax > Decimal("0.00") and abs(sale.total_amount - (sale.subtotal_amount + sale.tax_amount)) < Decimal("0.02") and abs(sale.subtotal_amount - (raw_price * raw_qty)) > Decimal("0.02"):
                ex_tax_total = (raw_price * raw_qty) / (Decimal("1.00") + (tax_rate_pct / Decimal("100.00")))
                unit_price_ex_tax = (ex_tax_total / raw_qty).quantize(Decimal("0.00001"), rounding=ROUND_HALF_UP)
            else:
                unit_price_ex_tax = raw_price

            monto_total_linea_bruta = (unit_price_ex_tax * raw_qty).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            subtotal_line = (monto_total_linea_bruta - disc_val).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

            unit_val = getattr(item, "unit_of_measure", None) or (getattr(item.product, "unit_of_measure", None) if hasattr(item, "product") else "Unid") or "Unid"
            is_service = getattr(item, "is_service", False)
            if not is_service and hasattr(item, "product") and item.product:
                is_service = getattr(item.product, "is_service", False)

            etree.SubElement(line_elem, f"{{{ns}}}Cantidad").text = fmt_money(raw_qty, 3)
            etree.SubElement(line_elem, f"{{{ns}}}UnidadMedida").text = str(unit_val)[:10]
            etree.SubElement(line_elem, f"{{{ns}}}Detalle").text = (item.product_name or "Producto")[:200]
            etree.SubElement(line_elem, f"{{{ns}}}PrecioUnitario").text = fmt_money(unit_price_ex_tax, 5)
            etree.SubElement(line_elem, f"{{{ns}}}MontoTotal").text = fmt_money_2(monto_total_linea_bruta)

            if disc_val > Decimal("0.00"):
                desc_elem = etree.SubElement(line_elem, f"{{{ns}}}Descuento")
                etree.SubElement(desc_elem, f"{{{ns}}}MontoDescuento").text = fmt_money_2(disc_val)
                etree.SubElement(desc_elem, f"{{{ns}}}CodigoDescuento").text = "04"
                tot_desc += disc_val

            etree.SubElement(line_elem, f"{{{ns}}}SubTotal").text = fmt_money_2(subtotal_line)
            etree.SubElement(line_elem, f"{{{ns}}}BaseImponible").text = fmt_money_2(subtotal_line)

            cod_imp, cod_tarifa = map_tax_rate_code(tax_rate_pct)
            if tax_rate_pct > Decimal("0.00"):
                monto_imp = (subtotal_line * (tax_rate_pct / Decimal("100.00"))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                tot_impuesto += monto_imp
                tot_grav += subtotal_line
                if is_service:
                    tot_serv_grav += subtotal_line
                else:
                    tot_merc_grav += subtotal_line

                tb_key = (cod_imp, cod_tarifa)
                tax_breakdowns[tb_key] = tax_breakdowns.get(tb_key, Decimal("0.00")) + monto_imp

                imp_elem = etree.SubElement(line_elem, f"{{{ns}}}Impuesto")
                etree.SubElement(imp_elem, f"{{{ns}}}Codigo").text = cod_imp
                etree.SubElement(imp_elem, f"{{{ns}}}CodigoTarifaIVA").text = cod_tarifa
                etree.SubElement(imp_elem, f"{{{ns}}}Tarifa").text = fmt_money_2(tax_rate_pct)
                etree.SubElement(imp_elem, f"{{{ns}}}Monto").text = fmt_money_2(monto_imp)

                etree.SubElement(line_elem, f"{{{ns}}}ImpuestoAsumidoEmisorFabrica").text = "0.00"
                etree.SubElement(line_elem, f"{{{ns}}}ImpuestoNeto").text = fmt_money_2(monto_imp)
                etree.SubElement(line_elem, f"{{{ns}}}MontoTotalLinea").text = fmt_money_2(subtotal_line + monto_imp)
            else:
                tot_exento += subtotal_line
                if is_service:
                    tot_serv_exento += subtotal_line
                else:
                    tot_merc_exenta += subtotal_line

                imp_elem = etree.SubElement(line_elem, f"{{{ns}}}Impuesto")
                etree.SubElement(imp_elem, f"{{{ns}}}Codigo").text = "01"
                etree.SubElement(imp_elem, f"{{{ns}}}CodigoTarifaIVA").text = "01"
                etree.SubElement(imp_elem, f"{{{ns}}}Tarifa").text = "0.00"
                etree.SubElement(imp_elem, f"{{{ns}}}Monto").text = "0.00"

                etree.SubElement(line_elem, f"{{{ns}}}ImpuestoAsumidoEmisorFabrica").text = "0.00"
                etree.SubElement(line_elem, f"{{{ns}}}ImpuestoNeto").text = "0.00"
                etree.SubElement(line_elem, f"{{{ns}}}MontoTotalLinea").text = fmt_money_2(subtotal_line)

            line_num += 1

        # 12. OtrosCargos (minOccurs=0, maxOccurs=15)
        tot_otros_cargos = Decimal("0.00")
        if other_charges:
            for oc in other_charges[:15]:
                oc_elem = etree.SubElement(root, f"{{{ns}}}OtrosCargos")
                etree.SubElement(oc_elem, f"{{{ns}}}TipoDocumentoOC").text = str(oc.get("type", "06"))[:2]  # 06=Servicio 10%
                etree.SubElement(oc_elem, f"{{{ns}}}Detalle").text = str(oc.get("detail", "Servicio"))[:160]
                oc_amount = Decimal(str(oc.get("amount", "0.00"))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                etree.SubElement(oc_elem, f"{{{ns}}}MontoCargo").text = fmt_money_2(oc_amount)
                tot_otros_cargos += oc_amount

        # 13. ResumenFactura
        resumen = etree.SubElement(root, f"{{{ns}}}ResumenFactura")
        curr_elem = etree.SubElement(resumen, f"{{{ns}}}CodigoTipoMoneda")
        doc_curr = sale.currency or "CRC"
        etree.SubElement(curr_elem, f"{{{ns}}}CodigoMoneda").text = doc_curr
        etree.SubElement(curr_elem, f"{{{ns}}}TipoCambio").text = "1.00000" if doc_curr == "CRC" else fmt_money(sale.exchange_rate or Decimal("520.00"), 5)

        if tot_serv_grav > Decimal("0.00"):
            etree.SubElement(resumen, f"{{{ns}}}TotalServGravados").text = fmt_money_2(tot_serv_grav)
        if tot_serv_exento > Decimal("0.00"):
            etree.SubElement(resumen, f"{{{ns}}}TotalServExentos").text = fmt_money_2(tot_serv_exento)
        if tot_merc_grav > Decimal("0.00"):
            etree.SubElement(resumen, f"{{{ns}}}TotalMercanciasGravadas").text = fmt_money_2(tot_merc_grav)
        if tot_merc_exenta > Decimal("0.00"):
            etree.SubElement(resumen, f"{{{ns}}}TotalMercanciasExentas").text = fmt_money_2(tot_merc_exenta)

        if tot_grav > Decimal("0.00"):
            etree.SubElement(resumen, f"{{{ns}}}TotalGravado").text = fmt_money_2(tot_grav)
        if tot_exento > Decimal("0.00"):
            etree.SubElement(resumen, f"{{{ns}}}TotalExento").text = fmt_money_2(tot_exento)

        tot_venta = tot_grav + tot_exento
        etree.SubElement(resumen, f"{{{ns}}}TotalVenta").text = fmt_money_2(tot_venta)

        if tot_desc > Decimal("0.00"):
            etree.SubElement(resumen, f"{{{ns}}}TotalDescuentos").text = fmt_money_2(tot_desc)

        tot_venta_neta = tot_venta - tot_desc
        etree.SubElement(resumen, f"{{{ns}}}TotalVentaNeta").text = fmt_money_2(tot_venta_neta)

        # TotalDesgloseImpuesto per tax code and rate
        for (b_cod_imp, b_cod_tarifa), b_amount in tax_breakdowns.items():
            desglose = etree.SubElement(resumen, f"{{{ns}}}TotalDesgloseImpuesto")
            etree.SubElement(desglose, f"{{{ns}}}Codigo").text = b_cod_imp
            etree.SubElement(desglose, f"{{{ns}}}CodigoTarifaIVA").text = b_cod_tarifa
            etree.SubElement(desglose, f"{{{ns}}}TotalMontoImpuesto").text = fmt_money_2(b_amount)

        if tot_impuesto > Decimal("0.00"):
            etree.SubElement(resumen, f"{{{ns}}}TotalImpuesto").text = fmt_money_2(tot_impuesto)

        if tot_otros_cargos > Decimal("0.00"):
            etree.SubElement(resumen, f"{{{ns}}}TotalOtrosCargos").text = fmt_money_2(tot_otros_cargos)

        # MedioPago (1 to 4 elements)
        payments_to_emit = sale.payments if sale.payments else []
        if not payments_to_emit:
            # Fallback 1 cash payment
            mp_elem = etree.SubElement(resumen, f"{{{ns}}}MedioPago")
            etree.SubElement(mp_elem, f"{{{ns}}}TipoMedioPago").text = "01"
            etree.SubElement(mp_elem, f"{{{ns}}}TotalMedioPago").text = fmt_money_2(tot_venta_neta + tot_impuesto + tot_otros_cargos)
        else:
            for p in payments_to_emit[:4]:
                mp_elem = etree.SubElement(resumen, f"{{{ns}}}MedioPago")
                pm_str = p.payment_method
                if "CARD" in pm_str:
                    cod_p = "02"
                elif "SINPE" in pm_str:
                    cod_p = "06"
                elif "TRANSFER" in pm_str:
                    cod_p = "04"
                elif "CHECK" in pm_str:
                    cod_p = "03"
                else:
                    cod_p = "01"

                etree.SubElement(mp_elem, f"{{{ns}}}TipoMedioPago").text = cod_p
                etree.SubElement(mp_elem, f"{{{ns}}}TotalMedioPago").text = fmt_money_2(p.amount)

        tot_comprobante = tot_venta_neta + tot_impuesto + tot_otros_cargos
        etree.SubElement(resumen, f"{{{ns}}}TotalComprobante").text = fmt_money_2(tot_comprobante)

        # 14. InformacionReferencia (Mandatory for 02 Nota de Débito and 03 Nota de Crédito)
        if reference_info:
            ir_elem = etree.SubElement(root, f"{{{ns}}}InformacionReferencia")
            etree.SubElement(ir_elem, f"{{{ns}}}TipoDocIR").text = str(reference_info.get("doc_type", "01")).zfill(2)[:2]
            etree.SubElement(ir_elem, f"{{{ns}}}Numero").text = str(reference_info.get("number", numeric_key))[:50]
            ref_date = reference_info.get("date", cr_now.isoformat())
            etree.SubElement(ir_elem, f"{{{ns}}}FechaEmisionIR").text = str(ref_date)
            etree.SubElement(ir_elem, f"{{{ns}}}Codigo").text = str(reference_info.get("code", "01")).zfill(2)[:2]  # 01=Anula
            etree.SubElement(ir_elem, f"{{{ns}}}Razon").text = str(reference_info.get("reason", "Anulación / Corrección de Comprobante"))[:180]
        elif doc_type in ["02", "03"]:
            # Default reference if not explicitly passed
            ir_elem = etree.SubElement(root, f"{{{ns}}}InformacionReferencia")
            etree.SubElement(ir_elem, f"{{{ns}}}TipoDocIR").text = "01"
            etree.SubElement(ir_elem, f"{{{ns}}}Numero").text = numeric_key[:50]
            etree.SubElement(ir_elem, f"{{{ns}}}FechaEmisionIR").text = cr_now.isoformat()
            etree.SubElement(ir_elem, f"{{{ns}}}Codigo").text = "01"
            etree.SubElement(ir_elem, f"{{{ns}}}Razon").text = "Nota de Crédito por devolución o corrección"

        xml_output = etree.tostring(root, encoding="utf-8", xml_declaration=True, pretty_print=True).decode("utf-8")

        if validate_xsd:
            cls.validate_xml_schema(xml_output, doc_type)

        return xml_output

    @classmethod
    def generate_mensaje_receptor_xml(
        cls,
        numeric_key: str,
        emitter_tax_id: str,
        doc_date: datetime,
        message_code: str,  # 1=Aceptado, 2=Aceptado Parcial, 3=Rechazado
        message_detail: str,
        tax_amount: Decimal,
        total_invoice: Decimal,
        receiver_tax_id: str,
        receiver_consecutive: str,
        economic_activity_code: Optional[str] = "620101",
        tax_condition: Optional[str] = "01",
        validate_xsd: bool = True
    ) -> str:
        """
        Generates official MensajeReceptor v4.4 XML (document type 05).
        """
        ns = DOC_NAMESPACES["05"]
        root_tag = ROOT_TAGS["05"]
        NSMAP = {None: ns}

        root = etree.Element(f"{{{ns}}}{root_tag}", nsmap=NSMAP)

        etree.SubElement(root, f"{{{ns}}}Clave").text = numeric_key
        etree.SubElement(root, f"{{{ns}}}NumeroCedulaEmisor").text = "".join(c for c in emitter_tax_id if c.isdigit())[:12]
        etree.SubElement(root, f"{{{ns}}}FechaEmisionDoc").text = doc_date.isoformat()
        etree.SubElement(root, f"{{{ns}}}Mensaje").text = str(message_code)[:1]
        if message_detail:
            etree.SubElement(root, f"{{{ns}}}DetalleMensaje").text = message_detail[:80]
        if tax_amount > Decimal("0.00"):
            etree.SubElement(root, f"{{{ns}}}MontoTotalImpuesto").text = fmt_money_2(tax_amount)
        if economic_activity_code:
            etree.SubElement(root, f"{{{ns}}}CodigoActividad").text = str(economic_activity_code).zfill(6)[:6]
        if tax_condition:
            etree.SubElement(root, f"{{{ns}}}CondicionImpuesto").text = str(tax_condition).zfill(2)[:2]

        etree.SubElement(root, f"{{{ns}}}TotalFactura").text = fmt_money_2(total_invoice)
        etree.SubElement(root, f"{{{ns}}}NumeroCedulaReceptor").text = "".join(c for c in receiver_tax_id if c.isdigit())[:12]
        etree.SubElement(root, f"{{{ns}}}NumeroConsecutivoReceptor").text = receiver_consecutive[:20]

        xml_output = etree.tostring(root, encoding="utf-8", xml_declaration=True, pretty_print=True).decode("utf-8")

        if validate_xsd:
            cls.validate_xml_schema(xml_output, "05")

        return xml_output

def generate_hacienda_xml_v44(
    doc_type: Optional[str] = None,
    numeric_key: Optional[str] = None,
    consecutive_number: Optional[str] = None,
    sale: Optional[Sale] = None,
    org: Optional[Organization] = None,
    branch: Optional[Branch] = None,
    customer: Optional[Customer] = None,
    reference_info: Optional[Dict[str, Any]] = None,
    other_charges: Optional[List[Dict[str, Any]]] = None,
    validate_xsd: bool = True,
    **kwargs
) -> str:
    from app.services.consecutive_service import ConsecutiveService

    sale_obj = sale or kwargs.get("sale")
    org_obj = org or kwargs.get("org")
    branch_obj = branch or kwargs.get("branch")
    customer_obj = customer or kwargs.get("customer")
    doc_t = doc_type or kwargs.get("doc_type") or ("01" if customer_obj and getattr(customer_obj, "identification_number", None) else "04")

    if not consecutive_number:
        b_code = getattr(branch_obj, "code", "001") if branch_obj else "001"
        consecutive_number = ConsecutiveService.build_consecutivo_20(
            branch_code=b_code,
            terminal_number="00001",
            doc_type=doc_t,
            consecutive_int=1
        )

    if not numeric_key:
        emitter_tax = getattr(org_obj, "identification_number", "3101999888") if org_obj else "3101999888"
        numeric_key, _ = ConsecutiveService.build_clave_50(
            emitter_tax_id=emitter_tax,
            consecutivo_20=consecutive_number,
            doc_date=datetime.now(timezone.utc),
            situation="1"
        )

    return HaciendaXMLGeneratorV44.generate_xml(
        doc_type=doc_t,
        numeric_key=numeric_key,
        consecutive_number=consecutive_number,
        sale=sale_obj,
        org=org_obj,
        branch=branch_obj,
        customer=customer_obj,
        reference_info=reference_info,
        other_charges=other_charges,
        validate_xsd=validate_xsd
    )
