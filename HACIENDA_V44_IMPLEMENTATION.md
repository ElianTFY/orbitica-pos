# Comprobantes Electrónicos Hacienda Costa Rica v4.4 & XAdES-EPES v1.3.2

## 1. Estructura y Reglas Oficiales de Comprobantes v4.4

### 1.1 Tipos de Documentos Soportados
- `01`: Factura Electrónica (requiere receptor identificado con cédula válida).
- `04`: Tiquete Electrónico (receptor genérico o anónimo).
- `03`: Nota de Crédito Electrónica (referencia obligatoria a comprobante previo).
- `02`: Nota de Débito Electrónica (referencia obligatoria a comprobante previo).

### 1.2 Estructura de la Clave Numérica (50 dígitos)
```
[País: 3][Fecha: 6][Cédula Emisor: 12][Consecutivo: 20][Situación: 1][Código Seguridad: 8]
```
- **País**: `506` (Costa Rica).
- **Fecha**: `DDMMYY` en huso horario `America/Costa_Rica` (UTC-6 estrictamente).
- **Cédula Emisor**: Rellenada a la izquierda con ceros hasta 12 dígitos (ej. física: `000109870654`, jurídica: `003101123456`).
- **Consecutivo**: 20 dígitos numéricos continuos.
- **Situación**: `1` (Normal), `2` (Contingencia), `3` (Sin Internet).
- **Código Seguridad**: 8 dígitos pseudoaleatorios criptográficos generados por `secrets.randbelow(90000000) + 10000000`.

### 1.3 Estructura del Número Consecutivo (20 dígitos)
```
[Sucursal: 3][Terminal: 5][Tipo Documento: 2][Secuencial: 10]
```
- **Sucursal**: `001` (por defecto central) a `999`.
- **Terminal**: `00001` a `99999`.
- **Tipo Doc**: `01`, `02`, `03`, `04`.
- **Secuencial**: Secuencia atómica de 10 dígitos con ceros iniciales (`0000000001` a `9999999999`).

---

## 2. Firma Digital XAdES-EPES v1.3.2 Enveloped

### 2.1 Proceso de Firma Criptográfica
1. **Generación XML**: Se construye el árbol XML v4.4 con el espacio de nombres oficial:
   `https://tribunet.hacienda.go.cr/docs/esquemas/2017/v4.4/facturaElectronica` (o tiquete/nota).
2. **Canonicalización (C14N)**:
   Se utiliza el algoritmo estándar W3C XML-C14N (`http://www.w3.org/TR/2001/REC-xml-c14n-20010315`) para normalizar espacios y atributos.
3. **Digest del Documento**:
   Se calcula el digest SHA-256 del documento con transformación enveloped (`http://www.w3.org/2000/09/xmldsig#enveloped-signature`).
4. **Propiedades Firmadas (`SignedProperties`)**:
   Incluye `SigningTime` (UTC), `SigningCertificate` (con digest SHA-256 del certificado X.509 emisor) y `SignaturePolicyIdentifier` oficial de Hacienda.
5. **Cálculo de Firma RSA-SHA256**:
   Se firma el elemento `<ds:SignedInfo>` canónico con la clave privada RSA (2048 bits) del certificado `.p12`.
6. **Inserción de Firma**:
   El bloque `<ds:Signature>` completo se inserta como último hijo del elemento raíz del XML.

---

## 3. Integración con el API de Recepción de Hacienda

### 3.1 Autenticación OAuth2 (IdP)
- **Staging (Pruebas)**: `https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token`
- **Producción**: `https://idp.comprobanteselectronicos.go.cr/auth/realms/rut/protocol/openid-connect/token`
- **Credenciales**: `client_id` (`api-stag` o `api-prod`), `username` (cédula ATV) y `password` (clave generada en ATV).

### 3.2 Envío de Comprobante (`POST /recepcion`)
- Se envía payload JSON con:
  - `clave`: Clave numérica de 50 dígitos.
  - `fecha`: Fecha y hora ISO 8601 (UTC-6).
  - `emisor`: Tipo y número de identificación.
  - `receptor`: Tipo y número de identificación (si aplica).
  - `comprobanteXml`: XML firmado en base64.
- **Respuesta Esperada**: HTTP 201 (Aceptado para procesamiento, estado inicial `PROCESSING`).

### 3.3 Consulta de Estado (`GET /recepcion/{clave}`)
- Se consulta el estado del comprobante hasta obtener respuesta definitiva:
  - `ind-estado: "aceptado"` -> Estado en BD: `ACCEPTED` (con `hacienda_response_xml` guardado).
  - `ind-estado: "rechazado"` -> Estado en BD: `REJECTED` (con motivo de rechazo fiscal).
  - `ind-estado: "procesando"` -> Estado en BD: `PROCESSING`.

> [!IMPORTANT]
> Nunca se marca una factura como `ACCEPTED` sin haber recibido la confirmación y el XML de respuesta oficial del Ministerio de Hacienda.
