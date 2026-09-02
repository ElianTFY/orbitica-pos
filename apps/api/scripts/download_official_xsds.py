import urllib.request
import hashlib
import os
import sys
from lxml import etree

BASE_URL = "https://apis.gometa.org/4.4/hacienda/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/"
DEST_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app", "schemas_xml", "v4.4")

SCHEMAS = [
    "FacturaElectronica_V4.4.xsd",
    "TiqueteElectronico_V4.4.xsd",
    "NotaCreditoElectronica_V4.4.xsd",
    "NotaDebitoElectronica_V4.4.xsd",
    "MensajeReceptor_V4.4.xsd",
    "MensajeHacienda_V4.4.xsd",
    "ReciboElectronicoPago_V4.4.xsd",
    "FacturaElectronicaCompra_V4.4.xsd",
    "FacturaElectronicaExportacion_V4.4.xsd",
]

XMLDSIG_URL = "https://www.w3.org/TR/2002/REC-xmldsig-core-20020212/xmldsig-core-schema.xsd"

class DsigResolver(etree.Resolver):
    def resolve(self, url, pubid, context):
        if url and "xmldsig" in url:
            dsig_local = os.path.join(DEST_DIR, "xmldsig-core-schema.xsd")
            if os.path.exists(dsig_local):
                return self.resolve_filename(dsig_local, context)
        return None

def verify_all_schemas() -> bool:
    print(f"Verificando integridad estricta de esquemas oficiales Hacienda v4.4 en {DEST_DIR}...")
    dsig_path = os.path.join(DEST_DIR, "xmldsig-core-schema.xsd")
    if not os.path.exists(dsig_path):
        print("  [FAIL] xmldsig-core-schema.xsd no encontrado.")
        return False

    all_valid = True
    for schema_name in SCHEMAS:
        schema_path = os.path.join(DEST_DIR, schema_name)
        if not os.path.exists(schema_path):
            print(f"  [FAIL] Esquema {schema_name} no existe.")
            all_valid = False
            continue

        size = os.path.getsize(schema_path)
        with open(schema_path, "rb") as f:
            content = f.read()
        sha = hashlib.sha256(content).hexdigest()

        # Check that it is the full canonical schema (not simplified/truncated)
        if "Factura" in schema_name and size < 80000:
            print(f"  [FAIL] {schema_name} parece simplificado ({size} bytes). Debe ser > 90 KB.")
            all_valid = False
            continue

        # Try compiling with lxml XMLSchema
        try:
            parser = etree.XMLParser()
            parser.resolvers.add(DsigResolver())
            doc = etree.parse(schema_path, parser)
            schema = etree.XMLSchema(doc)
            print(f"  [PASS] {schema_name} ({size:,} bytes, SHA-256: {sha[:12]}...) - Valido y compilado.")
        except Exception as e:
            print(f"  [FAIL] Error compilando {schema_name}: {e}")
            all_valid = False

    return all_valid

def download_file(url: str, dest_path: str):
    print(f"Downloading {url} -> {dest_path}...")
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Orbítica-Auditor/1.0"}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        content = resp.read()
    with open(dest_path, "wb") as f:
        f.write(content)
    sha256 = hashlib.sha256(content).hexdigest()
    print(f"  [OK] {os.path.basename(dest_path)} ({len(content):,} bytes) SHA-256: {sha256}")
    return len(content), sha256

def main():
    if "--verify-only" in sys.argv:
        success = verify_all_schemas()
        sys.exit(0 if success else 1)

    os.makedirs(DEST_DIR, exist_ok=True)
    for schema_name in SCHEMAS:
        url = BASE_URL + schema_name
        dest = os.path.join(DEST_DIR, schema_name)
        try:
            download_file(url, dest)
        except Exception as e:
            print(f"  [ERROR] Error downloading {schema_name}: {e}")

    # Also download xmldsig-core-schema.xsd
    dsig_dest = os.path.join(DEST_DIR, "xmldsig-core-schema.xsd")
    try:
        download_file(XMLDSIG_URL, dsig_dest)
    except Exception as e:
        print(f"  [ERROR] Error downloading xmldsig: {e}")

    success = verify_all_schemas()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
