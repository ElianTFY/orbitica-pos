import os
import uuid
import pytest
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from lxml import etree
from app.models.organization import Organization
from app.models.branch import Branch
from app.models.customer import Customer
from app.models.sale import Sale, SaleItem, SalePayment
from app.services.hacienda_xml_generator_v44 import (
    HaciendaXMLGeneratorV44,
    generate_hacienda_xml_v44,
    DOC_NAMESPACES,
    XSD_FILES
)

CR_TIMEZONE = timezone(timedelta(hours=-6))
GOLDEN_DIR = os.path.join(os.path.dirname(__file__), "golden_files", "v4.4")

@pytest.fixture
def fiscal_context():
    org_id = uuid.uuid4()
    org = Organization(
        id=org_id,
        legal_name="DISTRIBUIDORA DE ALIMENTOS Y TECNOLOGIA CR S.A.",
        trade_name="ORBITICA STORE",
        identification_type="02",
        identification_number="3101999888",
        economic_activity_code="620101",
        email="facturacion@orbitica.cr",
        phone="50622223333",
        province_code="1",
        canton_code="01",
        district_code="01",
        neighborhood_code="Carmen",
        address_detail="San Jose Central, Barrio Carmen, Avenida 1"
    )

    branch = Branch(
        id=uuid.uuid4(),
        organization_id=org_id,
        name="Sucursal San Jose",
        code="001",
        phone="22223333",
        address="San Jose Central"
    )

    customer = Customer(
        id=uuid.uuid4(),
        organization_id=org_id,
        name="CORPORACION COSTARRICENSE S.A.",
        identification_type="02",
        identification_number="3101444555",
        email="compras@corpcr.com",
        phone="22998877"
    )
    setattr(customer, "economic_activity_code", "461001")

    # Item 1: Servicios Profesionales 13%
    item1 = SaleItem(
        id=uuid.uuid4(),
        product_name="Desarrollo de Software y Mantenimiento",
        product_sku="DEV-001",
        quantity=Decimal("1.00"),
        unit_price=Decimal("50000.0000"),
        unit_cost=Decimal("20000.0000"),
        discount_percentage=Decimal("0.00"),
        discount_amount=Decimal("0.00"),
        tax_rate=Decimal("13.00"),
        tax_amount=Decimal("6500.00"),
        line_total=Decimal("56500.00")
    )
    item1.cabys_code = "6339900000000"
    item1.unit_of_measure = "Sp"
    item1.is_service = True

    # Item 2: Pan Fresco 1% (Canasta Básica)
    item2 = SaleItem(
        id=uuid.uuid4(),
        product_name="Pan de Molde Integral",
        product_sku="PAN-002",
        quantity=Decimal("3.00"),
        unit_price=Decimal("1500.0000"),
        unit_cost=Decimal("800.0000"),
        discount_percentage=Decimal("10.00"),
        discount_amount=Decimal("450.00"),
        tax_rate=Decimal("1.00"),
        tax_amount=Decimal("40.50"),
        line_total=Decimal("4090.50")
    )
    item2.cabys_code = "2322000000000"
    item2.unit_of_measure = "Unid"
    item2.is_service = False

    # Item 3: Medicamento Exento 0%
    item3 = SaleItem(
        id=uuid.uuid4(),
        product_name="Medicamento Esencial",
        product_sku="MED-001",
        quantity=Decimal("2.00"),
        unit_price=Decimal("2000.0000"),
        unit_cost=Decimal("1000.0000"),
        discount_percentage=Decimal("0.00"),
        discount_amount=Decimal("0.00"),
        tax_rate=Decimal("0.00"),
        tax_amount=Decimal("0.00"),
        line_total=Decimal("4000.00")
    )
    item3.cabys_code = "6339900000000"
    item3.unit_of_measure = "Unid"
    item3.is_service = False

    sale = Sale(
        id=uuid.uuid4(),
        organization_id=org_id,
        branch_id=branch.id,
        user_id=uuid.uuid4(),
        sale_number="FAC-001-000000100",
        status="COMPLETED",
        currency="CRC",
        subtotal_amount=Decimal("58500.00"),
        discount_amount=Decimal("450.00"),
        tax_amount=Decimal("6540.50"),
        total_amount=Decimal("64590.50")
    )
    setattr(sale, "payment_condition", "01")
    sale.items = [item1, item2, item3]

    p1 = SalePayment(id=uuid.uuid4(), payment_method="CASH", amount=Decimal("30000.00"))
    p2 = SalePayment(id=uuid.uuid4(), payment_method="CREDIT_CARD", amount=Decimal("34590.50"))
    sale.payments = [p1, p2]

    return org, branch, customer, sale


def test_factura_electronica_01_schema_validation(fiscal_context):
    org, branch, customer, sale = fiscal_context
    key = "50602092600310199988800100001010000000010011234567"
    cons = "00100001010000000100"

    xml_str = HaciendaXMLGeneratorV44.generate_xml(
        doc_type="01",
        numeric_key=key,
        consecutive_number=cons,
        sale=sale,
        org=org,
        branch=branch,
        customer=customer,
        validate_xsd=True
    )

    assert "<FacturaElectronica" in xml_str
    assert f"<Clave>{key}</Clave>" in xml_str
    assert "<ProveedorSistemas>" in xml_str
    assert "<CodigoActividadEmisor>620101</CodigoActividadEmisor>" in xml_str
    assert "<CodigoActividadReceptor>461001</CodigoActividadReceptor>" in xml_str
    assert "<TotalComprobante>" in xml_str

    # Validate against official XSD directly
    HaciendaXMLGeneratorV44.validate_xml_schema(xml_str, "01")


def test_tiquete_electronico_04_schema_validation(fiscal_context):
    org, branch, _, sale = fiscal_context
    key = "50602092600310199988800100001040000000010011234567"
    cons = "00100001040000000100"

    xml_str = HaciendaXMLGeneratorV44.generate_xml(
        doc_type="04",
        numeric_key=key,
        consecutive_number=cons,
        sale=sale,
        org=org,
        branch=branch,
        customer=None,  # Tiquete can be issued without receptor
        validate_xsd=True
    )

    assert "<TiqueteElectronico" in xml_str
    assert f"<Clave>{key}</Clave>" in xml_str
    assert "<CodigoActividadEmisor>620101</CodigoActividadEmisor>" in xml_str
    HaciendaXMLGeneratorV44.validate_xml_schema(xml_str, "04")


def test_nota_credito_03_schema_validation_and_reference(fiscal_context):
    org, branch, customer, sale = fiscal_context
    key_nc = "50602092600310199988800100001030000000010011234567"
    cons_nc = "00100001030000000100"
    ref_key = "50602092600310199988800100001010000000009911234567"

    ref_info = {
        "doc_type": "01",
        "number": ref_key,
        "date": datetime.now(CR_TIMEZONE).isoformat(),
        "code": "01",  # 01=Anula documento de referencia
        "reason": "Anulación de factura por devolución de servicios"
    }

    xml_str = HaciendaXMLGeneratorV44.generate_xml(
        doc_type="03",
        numeric_key=key_nc,
        consecutive_number=cons_nc,
        sale=sale,
        org=org,
        branch=branch,
        customer=customer,
        reference_info=ref_info,
        validate_xsd=True
    )

    assert "<NotaCreditoElectronica" in xml_str
    assert "<InformacionReferencia>" in xml_str
    assert f"<Numero>{ref_key}</Numero>" in xml_str
    assert "<Codigo>01</Codigo>" in xml_str
    HaciendaXMLGeneratorV44.validate_xml_schema(xml_str, "03")


def test_nota_debito_02_schema_validation_and_reference(fiscal_context):
    org, branch, customer, sale = fiscal_context
    key_nd = "50602092600310199988800100001020000000010011234567"
    cons_nd = "00100001020000000100"
    ref_key = "50602092600310199988800100001010000000009911234567"

    ref_info = {
        "doc_type": "01",
        "number": ref_key,
        "date": datetime.now(CR_TIMEZONE).isoformat(),
        "code": "04",  # 04=Referencia a otro documento
        "reason": "Gastos financieros e intereses no cargados previamente"
    }

    xml_str = HaciendaXMLGeneratorV44.generate_xml(
        doc_type="02",
        numeric_key=key_nd,
        consecutive_number=cons_nd,
        sale=sale,
        org=org,
        branch=branch,
        customer=customer,
        reference_info=ref_info,
        validate_xsd=True
    )

    assert "<NotaDebitoElectronica" in xml_str
    assert "<InformacionReferencia>" in xml_str
    assert f"<Numero>{ref_key}</Numero>" in xml_str
    HaciendaXMLGeneratorV44.validate_xml_schema(xml_str, "02")


def test_mensaje_receptor_05_schema_validation():
    key_mr = "50602092600310144455500100001010000000005511234567"
    xml_str = HaciendaXMLGeneratorV44.generate_mensaje_receptor_xml(
        numeric_key=key_mr,
        emitter_tax_id="3101444555",
        doc_date=datetime.now(CR_TIMEZONE),
        message_code="1",  # 1=Aceptado
        message_detail="Aceptación total del comprobante electrónico",
        tax_amount=Decimal("1300.00"),
        total_invoice=Decimal("11300.00"),
        receiver_tax_id="3101999888",
        receiver_consecutive="00100001050000000001",
        economic_activity_code="620101",
        tax_condition="01",
        validate_xsd=True
    )

    assert "<MensajeReceptor" in xml_str
    assert f"<Clave>{key_mr}</Clave>" in xml_str
    assert "<Mensaje>1</Mensaje>" in xml_str
    assert "<TotalFactura>11300.00</TotalFactura>" in xml_str
    HaciendaXMLGeneratorV44.validate_xml_schema(xml_str, "05")


def test_credit_sale_condition_and_term(fiscal_context):
    org, branch, customer, sale = fiscal_context
    setattr(sale, "payment_condition", "02")  # 02=Crédito
    setattr(sale, "credit_term_days", 45)

    key = "50602092600310199988800100001010000000010111234567"
    cons = "00100001010000000101"

    xml_str = HaciendaXMLGeneratorV44.generate_xml(
        doc_type="01",
        numeric_key=key,
        consecutive_number=cons,
        sale=sale,
        org=org,
        branch=branch,
        customer=customer,
        validate_xsd=True
    )

    assert "<CondicionVenta>02</CondicionVenta>" in xml_str
    assert "<PlazoCredito>45</PlazoCredito>" in xml_str
    HaciendaXMLGeneratorV44.validate_xml_schema(xml_str, "01")


def test_multiple_payments_medios_pago(fiscal_context):
    org, branch, customer, sale = fiscal_context
    key = "50602092600310199988800100001010000000010211234567"
    cons = "00100001010000000102"

    p1 = SalePayment(id=uuid.uuid4(), payment_method="CASH", amount=Decimal("20000.00"))
    p2 = SalePayment(id=uuid.uuid4(), payment_method="CREDIT_CARD", amount=Decimal("20000.00"))
    p3 = SalePayment(id=uuid.uuid4(), payment_method="SINPE_MOVIL", amount=Decimal("24590.50"))
    sale.payments = [p1, p2, p3]

    xml_str = HaciendaXMLGeneratorV44.generate_xml(
        doc_type="01",
        numeric_key=key,
        consecutive_number=cons,
        sale=sale,
        org=org,
        branch=branch,
        customer=customer,
        validate_xsd=True
    )

    # Must contain 3 MedioPago elements
    root = etree.fromstring(xml_str.encode("utf-8"))
    ns = {"fe": DOC_NAMESPACES["01"]}
    medios = root.xpath("//fe:ResumenFactura/fe:MedioPago", namespaces=ns)
    assert len(medios) == 3
    HaciendaXMLGeneratorV44.validate_xml_schema(xml_str, "01")


def test_other_charges_otros_cargos(fiscal_context):
    org, branch, customer, sale = fiscal_context
    key = "50602092600310199988800100001010000000010311234567"
    cons = "00100001010000000103"

    other_charges = [
        {"type": "06", "detail": "Impuesto de servicio 10%", "amount": Decimal("5000.00")}
    ]

    xml_str = HaciendaXMLGeneratorV44.generate_xml(
        doc_type="01",
        numeric_key=key,
        consecutive_number=cons,
        sale=sale,
        org=org,
        branch=branch,
        customer=customer,
        other_charges=other_charges,
        validate_xsd=True
    )

    assert "<OtrosCargos>" in xml_str
    assert "<TipoDocumentoOC>06</TipoDocumentoOC>" in xml_str
    assert "<MontoCargo>5000.00</MontoCargo>" in xml_str
    assert "<TotalOtrosCargos>5000.00</TotalOtrosCargos>" in xml_str
    HaciendaXMLGeneratorV44.validate_xml_schema(xml_str, "01")


def test_golden_files_exist_and_validate():
    """Verify all 5 golden files exist in golden_files/v4.4/ and strictly validate against official XSDs."""
    expected_files = [
        ("golden_01_factura_electronica.xml", "01"),
        ("golden_02_nota_debito.xml", "02"),
        ("golden_03_nota_credito.xml", "03"),
        ("golden_04_tiquete_electronico.xml", "04"),
        ("golden_05_mensaje_receptor.xml", "05")
    ]

    for fname, doc_type in expected_files:
        p = os.path.join(GOLDEN_DIR, fname)
        assert os.path.exists(p), f"Golden file {fname} not found in {GOLDEN_DIR}"
        with open(p, "r", encoding="utf-8") as f:
            content = f.read()
        assert len(content) > 500
        # Assert valid against official XSD
        HaciendaXMLGeneratorV44.validate_xml_schema(content, doc_type)
