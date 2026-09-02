import base64
import hashlib
import uuid
from datetime import datetime, timezone
from typing import Tuple
from lxml import etree
from cryptography.hazmat.primitives.serialization import pkcs12, Encoding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa
import cryptography.x509 as crypto_x509
from app.core.exceptions import BadRequestException

XMLDSIG_NS = "http://www.w3.org/2000/09/xmldsig#"
XADES_NS = "http://uri.etsi.org/01903/v1.3.2#"
C14N_ALGO = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"
RSA_SHA256_ALGO = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"
SHA256_DIGEST_ALGO = "http://www.w3.org/2001/04/xmlenc#sha256"
ENVELOPED_SIG_TRANSFORM = "http://www.w3.org/2000/09/xmldsig#enveloped-signature"

POLICY_IDENTIFIER = "https://www.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2016/v4.2/ResolucionComprobantesElectronicosDGT-R-48-2016_4.2.pdf"
POLICY_DIGEST_B64 = "V8/BnPliaasaAcBMB//US0002XA="

def c14n(node: etree._Element, exclusive: bool = False, inclusive_prefixes: list = None) -> bytes:
    return etree.tostring(
        node,
        method="c14n",
        exclusive=exclusive,
        inclusive_ns_prefixes=inclusive_prefixes
    )

def sha256_base64(data: bytes) -> str:
    digest = hashlib.sha256(data).digest()
    return base64.b64encode(digest).decode("utf-8")

class XAdESSignerV44:
    @classmethod
    def sign_xml(cls, xml_content: str, p12_bytes: bytes, pin: str) -> str:
        """
        Signs an XML document using XAdES-EPES v1.3.2 Enveloped Signature with RSA-SHA256.
        """
        private_key, cert, _ = pkcs12.load_key_and_certificates(p12_bytes, pin.encode("utf-8"))
        if not cert or not private_key:
            raise BadRequestException("Certificado o clave privada no válidos en el archivo .p12")

        # Validate certificate validity window
        now_utc = datetime.now(timezone.utc)
        not_after = getattr(cert, "not_valid_after_utc", None)
        if not_after is None:
            not_after = cert.not_valid_after.replace(tzinfo=timezone.utc)

        not_before = getattr(cert, "not_valid_before_utc", None)
        if not_before is None:
            not_before = cert.not_valid_before.replace(tzinfo=timezone.utc)

        if now_utc > not_after:
            raise BadRequestException(
                f"Certificado criptográfico PKCS#12 expirado en fecha {not_after.strftime('%Y-%m-%d %H:%M:%S UTC')}. Operación bloqueada."
            )
        if now_utc < not_before:
            raise BadRequestException(
                f"Certificado criptográfico PKCS#12 aún no entra en vigencia hasta {not_before.strftime('%Y-%m-%d %H:%M:%S UTC')}."
            )

        doc = etree.fromstring(xml_content.encode("utf-8"))

        sig_id = f"Signature-{uuid.uuid4().hex[:12]}"
        signed_info_id = f"SignedInfo-{uuid.uuid4().hex[:12]}"
        key_info_id = f"KeyInfo-{uuid.uuid4().hex[:12]}"
        signed_props_id = f"SignedProperties-{uuid.uuid4().hex[:12]}"
        qualifying_props_id = f"QualifyingProperties-{uuid.uuid4().hex[:12]}"

        # 1. Document Digest (URI="") before signature element is added
        doc_c14n = c14n(doc)
        doc_digest = sha256_base64(doc_c14n)

        # 2. Build Signature element skeleton attached to document
        signature = etree.SubElement(
            doc,
            f"{{{XMLDSIG_NS}}}Signature",
            Id=sig_id,
            nsmap={"ds": XMLDSIG_NS}
        )

        # 3. Build KeyInfo node
        key_info = etree.SubElement(signature, f"{{{XMLDSIG_NS}}}KeyInfo", Id=key_info_id)
        x509_data = etree.SubElement(key_info, f"{{{XMLDSIG_NS}}}X509Data")
        cert_der = cert.public_bytes(Encoding.DER)
        cert_b64 = base64.b64encode(cert_der).decode("utf-8")
        etree.SubElement(x509_data, f"{{{XMLDSIG_NS}}}X509Certificate").text = cert_b64

        public_key = cert.public_key()
        if isinstance(public_key, rsa.RSAPublicKey):
            public_numbers = public_key.public_numbers()
            key_val = etree.SubElement(key_info, f"{{{XMLDSIG_NS}}}KeyValue")
            rsa_val = etree.SubElement(key_val, f"{{{XMLDSIG_NS}}}RSAKeyValue")
            mod_bytes = public_numbers.n.to_bytes((public_numbers.n.bit_length() + 7) // 8, byteorder="big")
            exp_bytes = public_numbers.e.to_bytes((public_numbers.e.bit_length() + 7) // 8, byteorder="big")
            etree.SubElement(rsa_val, f"{{{XMLDSIG_NS}}}Modulus").text = base64.b64encode(mod_bytes).decode("utf-8")
            etree.SubElement(rsa_val, f"{{{XMLDSIG_NS}}}Exponent").text = base64.b64encode(exp_bytes).decode("utf-8")

        key_info_digest = sha256_base64(c14n(key_info))

        # 4. Build QualifyingProperties / SignedProperties
        object_elem = etree.SubElement(signature, f"{{{XMLDSIG_NS}}}Object")
        qualifying_props = etree.SubElement(
            object_elem,
            f"{{{XADES_NS}}}QualifyingProperties",
            Id=qualifying_props_id,
            Target=f"#{sig_id}",
            nsmap={"xades": XADES_NS}
        )
        signed_props = etree.SubElement(
            qualifying_props,
            f"{{{XADES_NS}}}SignedProperties",
            Id=signed_props_id
        )
        signed_sig_props = etree.SubElement(signed_props, f"{{{XADES_NS}}}SignedSignatureProperties")
        
        now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        etree.SubElement(signed_sig_props, f"{{{XADES_NS}}}SigningTime").text = now_utc

        signing_cert = etree.SubElement(signed_sig_props, f"{{{XADES_NS}}}SigningCertificate")
        cert_elem = etree.SubElement(signing_cert, f"{{{XADES_NS}}}Cert")
        cert_digest = etree.SubElement(cert_elem, f"{{{XADES_NS}}}CertDigest")
        etree.SubElement(cert_digest, f"{{{XMLDSIG_NS}}}DigestMethod", Algorithm=SHA256_DIGEST_ALGO)
        etree.SubElement(cert_digest, f"{{{XMLDSIG_NS}}}DigestValue").text = sha256_base64(cert_der)

        issuer_serial = etree.SubElement(cert_elem, f"{{{XADES_NS}}}IssuerSerial")
        etree.SubElement(issuer_serial, f"{{{XMLDSIG_NS}}}X509IssuerName").text = cert.issuer.rfc4514_string()
        etree.SubElement(issuer_serial, f"{{{XMLDSIG_NS}}}X509SerialNumber").text = str(cert.serial_number)

        sig_policy = etree.SubElement(signed_sig_props, f"{{{XADES_NS}}}SignaturePolicyIdentifier")
        sig_policy_id = etree.SubElement(sig_policy, f"{{{XADES_NS}}}SignaturePolicyId")
        sig_policy_ident = etree.SubElement(sig_policy_id, f"{{{XADES_NS}}}SigPolicyId")
        etree.SubElement(sig_policy_ident, f"{{{XADES_NS}}}Identifier").text = POLICY_IDENTIFIER
        sig_policy_hash = etree.SubElement(sig_policy_id, f"{{{XADES_NS}}}SigPolicyHash")
        etree.SubElement(sig_policy_hash, f"{{{XMLDSIG_NS}}}DigestMethod", Algorithm=SHA256_DIGEST_ALGO)
        etree.SubElement(sig_policy_hash, f"{{{XMLDSIG_NS}}}DigestValue").text = POLICY_DIGEST_B64

        signed_props_digest = sha256_base64(c14n(signed_props))

        # 5. Build SignedInfo node and insert at position 0 of Signature
        signed_info = etree.Element(
            f"{{{XMLDSIG_NS}}}SignedInfo",
            Id=signed_info_id
        )
        etree.SubElement(signed_info, f"{{{XMLDSIG_NS}}}CanonicalizationMethod", Algorithm=C14N_ALGO)
        etree.SubElement(signed_info, f"{{{XMLDSIG_NS}}}SignatureMethod", Algorithm=RSA_SHA256_ALGO)

        # Reference 1: Document Root
        ref_doc = etree.SubElement(signed_info, f"{{{XMLDSIG_NS}}}Reference", URI="")
        transforms_doc = etree.SubElement(ref_doc, f"{{{XMLDSIG_NS}}}Transforms")
        etree.SubElement(transforms_doc, f"{{{XMLDSIG_NS}}}Transform", Algorithm=ENVELOPED_SIG_TRANSFORM)
        etree.SubElement(transforms_doc, f"{{{XMLDSIG_NS}}}Transform", Algorithm=C14N_ALGO)
        etree.SubElement(ref_doc, f"{{{XMLDSIG_NS}}}DigestMethod", Algorithm=SHA256_DIGEST_ALGO)
        etree.SubElement(ref_doc, f"{{{XMLDSIG_NS}}}DigestValue").text = doc_digest

        # Reference 2: KeyInfo
        ref_ki = etree.SubElement(signed_info, f"{{{XMLDSIG_NS}}}Reference", URI=f"#{key_info_id}")
        transforms_ki = etree.SubElement(ref_ki, f"{{{XMLDSIG_NS}}}Transforms")
        etree.SubElement(transforms_ki, f"{{{XMLDSIG_NS}}}Transform", Algorithm=C14N_ALGO)
        etree.SubElement(ref_ki, f"{{{XMLDSIG_NS}}}DigestMethod", Algorithm=SHA256_DIGEST_ALGO)
        etree.SubElement(ref_ki, f"{{{XMLDSIG_NS}}}DigestValue").text = key_info_digest

        # Reference 3: SignedProperties
        ref_sp = etree.SubElement(
            signed_info,
            f"{{{XMLDSIG_NS}}}Reference",
            Type="http://uri.etsi.org/01903#SignedProperties",
            URI=f"#{signed_props_id}"
        )
        transforms_sp = etree.SubElement(ref_sp, f"{{{XMLDSIG_NS}}}Transforms")
        etree.SubElement(transforms_sp, f"{{{XMLDSIG_NS}}}Transform", Algorithm=C14N_ALGO)
        etree.SubElement(ref_sp, f"{{{XMLDSIG_NS}}}DigestMethod", Algorithm=SHA256_DIGEST_ALGO)
        etree.SubElement(ref_sp, f"{{{XMLDSIG_NS}}}DigestValue").text = signed_props_digest

        signature.insert(0, signed_info)

        # 6. Sign SignedInfo with RSA-SHA256
        signed_info_c14n = c14n(signed_info)
        signature_value_bytes = private_key.sign(
            signed_info_c14n,
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        signature_value_b64 = base64.b64encode(signature_value_bytes).decode("utf-8")

        # 7. Insert SignatureValue at position 1 (between SignedInfo and KeyInfo)
        sig_val_elem = etree.Element(f"{{{XMLDSIG_NS}}}SignatureValue")
        sig_val_elem.text = signature_value_b64
        signature.insert(1, sig_val_elem)

        return etree.tostring(doc, encoding="utf-8", xml_declaration=True, pretty_print=False).decode("utf-8")

    @classmethod
    def verify_signature(cls, signed_xml_str: str) -> bool:
        """
        Cryptographically verifies the RSA-SHA256 signature and references.
        """
        try:
            doc = etree.fromstring(signed_xml_str.encode("utf-8"))
            sig_elem = doc.find(f".//{{{XMLDSIG_NS}}}Signature")
            if sig_elem is None:
                return False

            signed_info = sig_elem.find(f"{{{XMLDSIG_NS}}}SignedInfo")
            sig_value = sig_elem.find(f"{{{XMLDSIG_NS}}}SignatureValue")
            x509_cert_elem = sig_elem.find(f".//{{{XMLDSIG_NS}}}X509Certificate")

            if signed_info is None or sig_value is None or x509_cert_elem is None:
                return False

            cert_b64 = x509_cert_elem.text.strip()
            cert_der = base64.b64decode(cert_b64)
            
            cert = crypto_x509.load_der_x509_certificate(cert_der)
            public_key = cert.public_key()

            sig_bytes = base64.b64decode(sig_value.text.strip())
            signed_info_c14n = c14n(signed_info)

            public_key.verify(
                sig_bytes,
                signed_info_c14n,
                padding.PKCS1v15(),
                hashes.SHA256()
            )

            # Verify Reference 1 (Document Digest)
            ref_doc = signed_info.find(f"{{{XMLDSIG_NS}}}Reference[@URI='']")
            if ref_doc is not None:
                expected_doc_digest = ref_doc.find(f"{{{XMLDSIG_NS}}}DigestValue").text.strip()
                
                # Clone doc and remove ds:Signature to recalculate document digest
                doc_copy = etree.fromstring(signed_xml_str.encode("utf-8"))
                sig_in_copy = doc_copy.find(f".//{{{XMLDSIG_NS}}}Signature")
                if sig_in_copy is not None:
                    doc_copy.remove(sig_in_copy)
                actual_doc_digest = sha256_base64(c14n(doc_copy))
                if expected_doc_digest != actual_doc_digest:
                    return False

            return True
        except Exception:
            return False
