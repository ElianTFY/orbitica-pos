import os
import sys
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from decimal import Decimal
from datetime import datetime, timezone, timedelta
from app.models.organization import Organization
from app.models.branch import Branch
from app.models.customer import Customer
from app.models.sale import Sale, SaleItem, SalePayment
from app.services.hacienda_xml_generator_v44 import HaciendaXMLGeneratorV44

CR_TIMEZONE = timezone(timedelta(hours=-6))

GOLDEN_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "tests", "golden_files", "v4.4")

def build_mock_entities():
    org_id = uuid.uuid4()
    org = Organization(
        id=org_id,
        legal_name="ORBITICA TECNOLOGIAS SOCIEDAD ANONIMA",
        trade_name="ORBITICA POS",
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
        name="Sucursal Principal",
        code="001",
        phone="22223333",
        address="San Jose Central"
    )

    customer = Customer(
        id=uuid.uuid4(),
        organization_id=org_id,
        name="DISTRIBUIDORA COSTARRICENSE S.A.",
        identification_type="02",
        identification_number="3101555666",
        email="contabilidad@distribuidoracr.com",
        phone="22334455"
    )
    setattr(customer, "economic_activity_code", "461001")

    # Item 1: Gravado 13% (Arroz)
    item1 = SaleItem(
        id=uuid.uuid4(),
        product_name="Consultoría de Software Especializada",
        product_sku="SRV-TI-001",
        quantity=Decimal("2.00"),
        unit_price=Decimal("10000.0000"),
        unit_cost=Decimal("5000.0000"),
        discount_percentage=Decimal("5.00"),
        discount_amount=Decimal("1000.00"),
        tax_rate=Decimal("13.00"),
        tax_amount=Decimal("2470.00"),
        line_total=Decimal("21470.00")
    )
    item1.cabys_code = "6339900000000"
    item1.unit_of_measure = "Sp"
    item1.is_service = True

    # Item 2: Reducido 1% (Canasta Básica - Pan)
    item2 = SaleItem(
        id=uuid.uuid4(),
        product_name="Pan Artesanal",
        product_sku="PAN-001",
        quantity=Decimal("5.00"),
        unit_price=Decimal("1000.0000"),
        unit_cost=Decimal("500.0000"),
        discount_percentage=Decimal("0.00"),
        discount_amount=Decimal("0.00"),
        tax_rate=Decimal("1.00"),
        tax_amount=Decimal("50.00"),
        line_total=Decimal("5050.00")
    )
    item2.cabys_code = "2322000000000"
    item2.unit_of_measure = "Unid"
    item2.is_service = False

    sale = Sale(
        id=uuid.uuid4(),
        organization_id=org_id,
        branch_id=branch.id,
        user_id=uuid.uuid4(),
        sale_number="FAC-001-000000001",
        status="COMPLETED",
        currency="CRC",
        subtotal_amount=Decimal("24000.00"),
        discount_amount=Decimal("1000.00"),
        tax_amount=Decimal("2520.00"),
        total_amount=Decimal("26520.00")
    )
    setattr(sale, "payment_condition", "01")
    sale.items = [item1, item2]

    # Multiple payments (MedioPago 1..4)
    p1 = SalePayment(id=uuid.uuid4(), payment_method="CASH", amount=Decimal("15000.00"))
    p2 = SalePayment(id=uuid.uuid4(), payment_method="SINPE_MOVIL", amount=Decimal("11520.00"))
    sale.payments = [p1, p2]

    return org, branch, customer, sale

def main():
    os.makedirs(GOLDEN_DIR, exist_ok=True)
    org, branch, customer, sale = build_mock_entities()

    # 1. Factura Electrónica (01)
    key_01 = "50602092600310199988800100001010000000001112345678"
    cons_01 = "00100001010000000001"
    xml_01 = HaciendaXMLGeneratorV44.generate_xml(
        doc_type="01",
        numeric_key=key_01,
        consecutive_number=cons_01,
        sale=sale,
        org=org,
        branch=branch,
        customer=customer,
        validate_xsd=True
    )
    with open(os.path.join(GOLDEN_DIR, "golden_01_factura_electronica.xml"), "w", encoding="utf-8") as f:
        f.write(xml_01)
    print(f"[OK] Generated golden 01 Factura ({len(xml_01)} bytes)")

    # 2. Nota de Débito (02)
    key_02 = "50602092600310199988800100001020000000001112345678"
    cons_02 = "00100001020000000001"
    ref_info = {
        "doc_type": "01",
        "number": key_01,
        "date": datetime.now(CR_TIMEZONE).isoformat(),
        "code": "01",
        "reason": "Intereses o gastos adicionales sobre factura"
    }
    xml_02 = HaciendaXMLGeneratorV44.generate_xml(
        doc_type="02",
        numeric_key=key_02,
        consecutive_number=cons_02,
        sale=sale,
        org=org,
        branch=branch,
        customer=customer,
        reference_info=ref_info,
        validate_xsd=True
    )
    with open(os.path.join(GOLDEN_DIR, "golden_02_nota_debito.xml"), "w", encoding="utf-8") as f:
        f.write(xml_02)
    print(f"[OK] Generated golden 02 Nota Débito ({len(xml_02)} bytes)")

    # 3. Nota de Crédito (03)
    key_03 = "50602092600310199988800100001030000000001112345678"
    cons_03 = "00100001030000000001"
    ref_info_nc = {
        "doc_type": "01",
        "number": key_01,
        "date": datetime.now(CR_TIMEZONE).isoformat(),
        "code": "01",
        "reason": "Anula factura electrónica por devolución total de servicios"
    }
    xml_03 = HaciendaXMLGeneratorV44.generate_xml(
        doc_type="03",
        numeric_key=key_03,
        consecutive_number=cons_03,
        sale=sale,
        org=org,
        branch=branch,
        customer=customer,
        reference_info=ref_info_nc,
        validate_xsd=True
    )
    with open(os.path.join(GOLDEN_DIR, "golden_03_nota_credito.xml"), "w", encoding="utf-8") as f:
        f.write(xml_03)
    print(f"[OK] Generated golden 03 Nota Crédito ({len(xml_03)} bytes)")

    # 4. Tiquete Electrónico (04)
    key_04 = "50602092600310199988800100001040000000001112345678"
    cons_04 = "00100001040000000001"
    xml_04 = HaciendaXMLGeneratorV44.generate_xml(
        doc_type="04",
        numeric_key=key_04,
        consecutive_number=cons_04,
        sale=sale,
        org=org,
        branch=branch,
        customer=None,  # Tiquete can omit receptor
        validate_xsd=True
    )
    with open(os.path.join(GOLDEN_DIR, "golden_04_tiquete_electronico.xml"), "w", encoding="utf-8") as f:
        f.write(xml_04)
    print(f"[OK] Generated golden 04 Tiquete ({len(xml_04)} bytes)")

    # 5. Mensaje Receptor (05)
    key_05 = "50602092600310155566600100001010000000001112345678"
    xml_05 = HaciendaXMLGeneratorV44.generate_mensaje_receptor_xml(
        numeric_key=key_05,
        emitter_tax_id="3101555666",
        doc_date=datetime.now(CR_TIMEZONE),
        message_code="1",  # 1=Aceptado
        message_detail="Aceptación total del comprobante electrónico de compra",
        tax_amount=Decimal("2520.00"),
        total_invoice=Decimal("26520.00"),
        receiver_tax_id="3101999888",
        receiver_consecutive="00100001050000000001",
        economic_activity_code="620101",
        tax_condition="01",
        validate_xsd=True
    )
    with open(os.path.join(GOLDEN_DIR, "golden_05_mensaje_receptor.xml"), "w", encoding="utf-8") as f:
        f.write(xml_05)
    print(f"[OK] Generated golden 05 Mensaje Receptor ({len(xml_05)} bytes)")

if __name__ == "__main__":
    main()
