from typing import Dict, Any
from app.services.xades_signer_v44 import (
    XAdESSignerV44,
    XMLDSIG_NS,
    XADES_NS,
    POLICY_IDENTIFIER,
    POLICY_DIGEST_B64
)

# Alias to standard service name
XAdESService = XAdESSignerV44

def sign_xml_document(xml_content: str, p12_bytes: bytes, pin: str) -> str:
    """Signs an XML document using Costa Rica XAdES-EPES v4.4 specification."""
    return XAdESSignerV44.sign_xml(xml_content, p12_bytes, pin)

def verify_xml_signature(signed_xml_str: str) -> bool:
    """Cryptographically validates XAdES-EPES signature and document integrity."""
    return XAdESSignerV44.verify_signature(signed_xml_str)
