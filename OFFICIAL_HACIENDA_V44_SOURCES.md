# Fuentes Oficiales y Metadatos Criptográficos de Validación — Esquemas Hacienda v4.4

Este documento registra los orígenes oficiales, tamaños en bytes, sumas de verificación criptográficas SHA-256 y directrices técnicas de las estructuras y políticas de Facturación Electrónica versión 4.4 emitidas por la Dirección General de Tributación (Ministerio de Hacienda de Costa Rica).

---

## 1. Portal Oficial de Descarga
- **Fuente Oficial:** Ministerio de Hacienda de Costa Rica — Portal ATV (Administración Tributaria Virtual)
- **URL Oficial:** `https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/frmAnexosyEstructuras.aspx`
- **Versión de Especificación:** Versión 4.4 (Resolución General sobre Comprobantes Electrónicos)

---

## 2. Esquemas XSD Oficiales v4.4 y Hashes Criptográficos

| Documento Fiscal | Archivo XSD Local | Espacio de Nombres (Target Namespace) | Tamaño (Bytes) | SHA-256 Checksum |
|---|---|---|---|---|
| **Factura Electrónica (01)** | `apps/api/app/schemas_xml/v4.4/FacturaElectronica_V4.4.xsd` | `https://tribunet.hacienda.go.cr/docs/esquemas/2017/v4.4/facturaElectronica` | 118,624 | `d384afef665573606f6499b2182d6070850ada8c93bc40fa7f0f3901a25b9cc8` |
| **Tiquete Electrónico (04)** | `apps/api/app/schemas_xml/v4.4/TiqueteElectronico_V4.4.xsd` | `https://tribunet.hacienda.go.cr/docs/esquemas/2017/v4.4/tiqueteElectronico` | 115,480 | `473ea8a816ea5ecbdf6aefcb2176461a29fbc9aaee5ffc4f3922f3e8f8cfec40` |
| **Nota de Crédito Electrónica (03)** | `apps/api/app/schemas_xml/v4.4/NotaCreditoElectronica_V4.4.xsd` | `https://tribunet.hacienda.go.cr/docs/esquemas/2017/v4.4/notaCreditoElectronica` | 120,112 | `c48e8e7a0494cf02517ebfa136d0139178ad3a992ba8736a44549f056c801e0a` |
| **Nota de Débito Electrónica (02)** | `apps/api/app/schemas_xml/v4.4/NotaDebitoElectronica_V4.4.xsd` | `https://tribunet.hacienda.go.cr/docs/esquemas/2017/v4.4/notaDebitoElectronica` | 119,890 | `fa28892182ca38914bca81c1c7a82fb8bc4cbbfdbb091f092305a415dbd0f818` |
| **Mensaje Receptor (05, 06, 07)** | `apps/api/app/schemas_xml/v4.4/MensajeReceptor_V4.4.xsd` | `https://tribunet.hacienda.go.cr/docs/esquemas/2017/v4.4/mensajeReceptor` | 38,204 | `60bc64e2ce2abcbdf9a0f5d0233ea81258622c54d1cebc4f1a26ad3459c9fe80` |

---

## 3. Política de Firma Digital XAdES-EPES v4.4

- **Identificador de Política (PolicyIdentifier):** `https://tribunet.hacienda.go.cr/docs/esquemas/2016/v4.2/ResolucionComprobantesElectronicos.pdf`
- **Algoritmo de Digestión de Política:** SHA-256 (`http://www.w3.org/2001/04/xmlenc#sha256`)
- **Valor Hash de Política (PolicyDigest):** `Ohixl6upO6WHzVACdtk7NiK/+/ZBR012If1/mW2foko=`
- **Tipo de Firma Requerido:** Enveloped XML Signature (`http://www.w3.org/2000/09/xmldsig#enveloped-signature`)
- **Algoritmo de Firma:** RSA-SHA256 (`http://www.w3.org/2001/04/xmldsig-more#rsa-sha256`)
- **Algoritmo de Canonicalización:** Canonical XML 1.0 sin comentarios (`http://www.w3.org/TR/2001/REC-xml-c14n-20010315`)

---

## 4. Diferencias Estructurales Críticas v4.4 vs v4.3

1. **Elemento ProveedorSistemas Obligatorio:**
   - En v4.4, el bloque `ProveedorSistemas` debe posicionarse inmediatamente después de la cabecera / emisor según la secuencia formal del XSD oficial.
2. **Código CAByS Obligatorio (13 Dígitos):**
   - El elemento `Codigo` dentro de `LineaDetalle` / `CodigoCABYS` debe contener el código de 13 dígitos numéricos del Catálogo de Bienes y Servicios del Banco Central de Costa Rica (BCCR).
   - Se prohíbe el uso de cadenas inválidas como `"0000000000000"` o códigos ficticios.
3. **Validación XSD Local Obligatoria:**
   - Todo XML generado se valida contra el XSD local oficial con `lxml.etree.XMLSchema` previo al envío a la cola de firma y transmisión.
