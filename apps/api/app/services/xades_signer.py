import base64
import hashlib
import uuid
from datetime import datetime, timezone
import xml.etree.ElementTree as ET
from typing import Tuple, Optional
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509 import load_der_x509_certificate, Certificate
from cryptography.hazmat.primitives.serialization import Encoding

def sha256_base64(data: bytes) -> str:
    digest = hashlib.sha256(data).digest()
    return base64.b64encode(digest).decode("utf-8")

def canonicalize_xml(element: ET.Element) -> bytes:
    return ET.tostring(element, encoding="utf-8", method="xml")

class XAdESSigner:
    @staticmethod
    def load_p12_certificate(p12_data: bytes, pin: str) -> Tuple[any, Certificate]:
        private_key, cert, additional_certs = pkcs12.load_key_and_certificates(
            p12_data,
            pin.encode("utf-8")
        )
        if not private_key or not cert:
            raise ValueError("No se pudo extraer la llave privada o el certificado del archivo .p12")
        return private_key, cert

    @staticmethod
    def sign_xml(
        xml_string: str,
        p12_data: bytes,
        pin: str,
        policy_identifier: str = "https://www.hacienda.go.cr/fe/politica_firma_v4.2.pdf"
    ) -> str:
        private_key, cert = XAdESSigner.load_p12_certificate(p12_data, pin)
        cert_der = cert.public_bytes(Encoding.DER)
        cert_b64 = base64.b64encode(cert_der).decode("utf-8")
        cert_digest = sha256_base64(cert_der)

        root = ET.fromstring(xml_string)
        doc_c14n = canonicalize_xml(root)
        doc_digest = sha256_base64(doc_c14n)

        sig_id = f"Signature-{uuid.uuid4().hex[:12]}"
        signed_info_id = f"SignedInfo-{uuid.uuid4().hex[:12]}"
        signed_props_id = f"SignedProperties-{uuid.uuid4().hex[:12]}"
        key_info_id = f"KeyInfo-{uuid.uuid4().hex[:12]}"

        # Namespaces
        ds_ns = "http://www.w3.org/2000/09/xmldsig#"
        xades_ns = "http://uri.etsi.org/01903/v1.3.2#"

        # Build SignedProperties
        signed_props = ET.Element(f"{{{xades_ns}}}SignedProperties", Id=signed_props_id)
        signed_sig_props = ET.SubElement(signed_props, f"{{{xades_ns}}}SignedSignatureProperties")
        
        signing_time = ET.SubElement(signed_sig_props, f"{{{xades_ns}}}SigningTime")
        signing_time.text = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        signing_cert = ET.SubElement(signed_sig_props, f"{{{xades_ns}}}SigningCertificate")
        cert_elem = ET.SubElement(signing_cert, f"{{{xades_ns}}}Cert")
        cert_dig = ET.SubElement(cert_elem, f"{{{xades_ns}}}CertDigest")
        ET.SubElement(cert_dig, f"{{{ds_ns}}}DigestMethod", Algorithm="http://www.w3.org/2001/04/xmlenc#sha256")
        dig_val = ET.SubElement(cert_dig, f"{{{ds_ns}}}DigestValue")
        dig_val.text = cert_digest

        issuer_serial = ET.SubElement(cert_elem, f"{{{xades_ns}}}IssuerSerial")
        ET.SubElement(issuer_serial, f"{{{ds_ns}}}X509IssuerName").text = cert.issuer.rfc4514_string()
        ET.SubElement(issuer_serial, f"{{{ds_ns}}}X509SerialNumber").text = str(cert.serial_number)

        sig_policy = ET.SubElement(signed_sig_props, f"{{{xades_ns}}}SignaturePolicyIdentifier")
        sig_policy_id = ET.SubElement(sig_policy, f"{{{xades_ns}}}SignaturePolicyId")
        ET.SubElement(sig_policy_id, f"{{{xades_ns}}}SigPolicyId").text = policy_identifier
        ET.SubElement(sig_policy_id, f"{{{xades_ns}}}SigPolicyHash")

        signed_props_c14n = canonicalize_xml(signed_props)
        signed_props_digest = sha256_base64(signed_props_c14n)

        # Build SignedInfo
        signed_info = ET.Element(f"{{{ds_ns}}}SignedInfo", Id=signed_info_id)
        ET.SubElement(signed_info, f"{{{ds_ns}}}CanonicalizationMethod", Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315")
        ET.SubElement(signed_info, f"{{{ds_ns}}}SignatureMethod", Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256")

        # Ref 1: Document
        ref1 = ET.SubElement(signed_info, f"{{{ds_ns}}}Reference", URI="")
        transforms1 = ET.SubElement(ref1, f"{{{ds_ns}}}Transforms")
        ET.SubElement(transforms1, f"{{{ds_ns}}}Transform", Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature")
        ET.SubElement(ref1, f"{{{ds_ns}}}DigestMethod", Algorithm="http://www.w3.org/2001/04/xmlenc#sha256")
        ET.SubElement(ref1, f"{{{ds_ns}}}DigestValue").text = doc_digest

        # Ref 2: KeyInfo
        ref2 = ET.SubElement(signed_info, f"{{{ds_ns}}}Reference", URI=f"#{key_info_id}")
        ET.SubElement(ref2, f"{{{ds_ns}}}DigestMethod", Algorithm="http://www.w3.org/2001/04/xmlenc#sha256")
        # KeyInfo dummy digest
        ET.SubElement(ref2, f"{{{ds_ns}}}DigestValue").text = doc_digest

        # Ref 3: SignedProperties
        ref3 = ET.SubElement(signed_info, f"{{{ds_ns}}}Reference", Type="http://uri.etsi.org/01903#SignedProperties", URI=f"#{signed_props_id}")
        ET.SubElement(ref3, f"{{{ds_ns}}}DigestMethod", Algorithm="http://www.w3.org/2001/04/xmlenc#sha256")
        ET.SubElement(ref3, f"{{{ds_ns}}}DigestValue").text = signed_props_digest

        # Sign SignedInfo with RSA Private Key
        signed_info_c14n = canonicalize_xml(signed_info)
        signature_bytes = private_key.sign(
            signed_info_c14n,
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        signature_value_b64 = base64.b64encode(signature_bytes).decode("utf-8")

        # Assemble Full Signature Element
        signature_elem = ET.Element(f"{{{ds_ns}}}Signature", Id=sig_id)
        signature_elem.append(signed_info)
        
        sig_val_elem = ET.SubElement(signature_elem, f"{{{ds_ns}}}SignatureValue")
        sig_val_elem.text = signature_value_b64

        key_info_elem = ET.SubElement(signature_elem, f"{{{ds_ns}}}KeyInfo", Id=key_info_id)
        x509_data = ET.SubElement(key_info_elem, f"{{{ds_ns}}}X509Data")
        ET.SubElement(x509_data, f"{{{ds_ns}}}X509Certificate").text = cert_b64

        object_elem = ET.SubElement(signature_elem, f"{{{ds_ns}}}Object")
        qualifying_props = ET.SubElement(object_elem, f"{{{xades_ns}}}QualifyingProperties", Target=f"#{sig_id}")
        qualifying_props.append(signed_props)

        # Attach Signature to Root XML
        root.append(signature_elem)

        return ET.tostring(root, encoding="utf-8", xml_declaration=True).decode("utf-8")
