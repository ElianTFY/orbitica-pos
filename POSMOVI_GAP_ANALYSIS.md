# ORBÍTICA POS — ANÁLISIS DE BRECHAS FRENTE A POSMOVI (GAP ANALYSIS)

> **Fecha:** 3 de Septiembre, 2026  
> **Objetivo:** Establecer la matriz comparativa de madurez técnica y comercial de Orbítica POS frente a POSMOVI (referente de mercado en Costa Rica), identificando con honestidad técnica el estado real de cada funcionalidad: `COMPLETE`, `PARTIAL`, `MISSING`, `MOCK`, o `BLOCKED_EXTERNAL`.

---

## 1. Resumen Ejecutivo del Benchmark

| Dimensión | POSMOVI (Tradicional) | Orbítica POS (Visión V1) | Diagnóstico / Ventaja Competitiva |
|---|---|---|---|
| **Arquitectura & UX** | Sistema denso, interfaces legacy, menús sobrecargados | Diseño moderno tipo Linear/Stripe, diseño responsivo, atajos de teclado rápidos, modo oscuro nativo | **Orbítica supera ampliamente en UX y velocidad de uso diario.** |
| **Seguridad & Multi-Inquilino** | Basado en licencias de software clásico y bases relacionales convencionales | Arquitectura Zero-Trust, hashing Argon2id, aislamiento estricto por `organization_id`, bitácora de auditoría inmutable, 2FA criptográfico | **Orbítica ofrece estándar bancario de seguridad SaaS.** |
| **Punto de Venta (POS)** | Altamente optimizado para teclado de caja, rápido en ferreterías y minisupers | POS web moderno, atajos F1-F8, soporte de código de barras, pagos divididos, cálculo de vuelto exacto | **Empatando operatividad rápida de cajero con mayor ergonomía visual.** |
| **Hacienda CR v4.4** | Emisión madura, reintentos, visor de XMLs y estados DGT | Motor XAdES-BES nativo, generación XML v4.4 oficial, catálogo CABYS con tarifa 13%/4%/2%/1%/0% | **En paridad de especificación técnica DGT v4.4, requiere credenciales reales del emisor para transmisión live.** |
| **Persistencia de Datos** | Base de datos SQL centralizada en la nube del proveedor | FastAPI + PostgreSQL inmutable con SELECT FOR UPDATE contra sobreventa | **Cero tolerancia a mocks o localStorage como BD.** |

---

## 2. Matriz de Brechas Detallada por Prioridad

### P0 — Seguridad, Identidad y Arquitectura de Datos

| Funcionalidad | POSMOVI | Orbítica POS | Estado Actual | Prioridad | Brecha / Plan de Acción |
|---|---|---|---|---|---|
| **Registro de Comercio** | Asistido por soporte / ventas | Autoservicio con verificación previa de correo | `COMPLETE` | P0 | Código de 6 dígitos enviado al correo real con hash HMAC seguro. Sin mocks. |
| **Verificación de Email** | Manual / Enlace | Código OTP de 10 min, un solo uso, invalidación automática | `COMPLETE` | P0 | Validado en base de datos `email_verification_challenges`. |
| **Prevención Email Duplicado** | Validación en servidor | Constraint UNIQUE y normalización trim/lowercase (409 Conflict) | `COMPLETE` | P0 | Soporta "Iniciar sesión para agregar otro negocio". |
| **Login & Manejo de Sesión** | Sesión con cookies | Tokens JWT en memoria + Cookies HttpOnly de refresco rotativo | `COMPLETE` | P0 | Rechazo estricto de usuarios inexistentes (401). |
| **2FA (Doble Factor)** | No disponible en planes básicos | 2FA opcional por correo con desafío temporal (`POST /auth/2fa/verify`) | `COMPLETE` | P0 | TOTP Authenticator y OTP por correo sin exponer códigos en API. |
| **Aislamiento Multi-Tenant** | Por base de datos o esquema | Filtro forzoso en backend por `organization_id` del token verificado | `COMPLETE` | P0 | Frontend nunca define el tenant; validado con pruebas de sabotaje cruzado. |
| **Persistencia de Negocio** | Cloud SQL | PostgreSQL con transacciones atómicas | `COMPLETE` | P0 | LocalStorage eliminado como base de datos de negocio. |

---

### P1 — Núcleo POS, Inventario y Control de Caja

| Funcionalidad | POSMOVI | Orbítica POS | Estado Actual | Prioridad | Brecha / Plan de Acción |
|---|---|---|---|---|---|
| **Apertura de Caja & Arqueo** | Monto inicial, turno por usuario | Monto inicial, arqueo ciego, sesiones asociadas a terminal | `COMPLETE` | P1 | Validado en `apps/api/app/api/v1/cash_registers.py` y UI de caja. |
| **Cierre de Caja con Diferencias** | Monto esperado vs contado, bitácora | Cuadre exacto o diferencia en colones, registro en auditoría | `COMPLETE` | P1 | Conectado a base de datos. |
| **Atajos de Teclado POS (F1-F8)** | F1=Venta, F2=Buscar, F8=Cobrar, etc. | F1=Limpiar, F2=Buscar, F3=Cliente, F4=Cotización, F8=Cobrar, ESC | `PARTIAL` | P1 | Expandir los atajos en `pos/page.tsx` para coincidir con flujo ciego de cajero. |
| **Buscador & Escáner Barcode** | Búsqueda instantánea por código | Búsqueda por SKU, código de barras y nombre con debounce | `COMPLETE` | P1 | Búsqueda instantánea en catálogo cargado en memoria. |
| **Pagos Divididos (Mixto)** | Efectivo + SINPE + Tarjeta simultáneo | Backend soporta múltiples `SalePaymentCreate`; UI tenía botones separados | `PARTIAL` | P1 | Agregar modal de desglose de pago mixto (₡10,000 efectivo + ₡5,000 tarjeta) en POS. |
| **Cobro en Efectivo & Vuelto** | Cálculo automático con denominaciones | Botones de billetes comunes (₡2k, ₡5k, ₡10k, ₡20k, ₡50k) y vuelto exacto | `COMPLETE` | P1 | Totalmente operativo. |
| **Idempotencia contra Doble Click** | Manejado por servidor | Header `Idempotency-Key` en `POST /sales` con cache SHA-256 | `COMPLETE` | P1 | Evita ventas duplicadas por doble pulsación o reintentos de red. |
| **Concurrencia de Último Stock** | Bloqueo a nivel de registro | `SELECT FOR UPDATE` en PostgreSQL para validar stock real | `COMPLETE` | P1 | Probado en test concurrente de 2 cajeros vendiendo la última unidad. |
| **Transacción Atómica de Venta** | Todo o nada | Venta + Ítems + Pagos + Movimientos Kárdex + Caja en 1 transacción | `COMPLETE` | P1 | Rollback automático ante cualquier falla. |
| **Ventas Suspendidas** | Guardar ticket pendiente y recuperar | Guardar en estado local con etiqueta y reanudar al carrito | `COMPLETE` | P1 | No afecta stock hasta la confirmación de la venta. |
| **Devoluciones / Notas de Crédito** | Devolución con reintegro a inventario | `POST /sales/{id}/refund` con reintegro a stock y kárdex | `COMPLETE` | P1 | Genera movimiento `RETURN_IN` sin borrar la venta original. |

---

### P2 — Facturación Electrónica Hacienda Costa Rica (DGT v4.4)

| Funcionalidad | POSMOVI | Orbítica POS | Estado Actual | Prioridad | Brecha / Plan de Acción |
|---|---|---|---|---|---|
| **Estructura XML v4.4 Oficial** | Factura (01), Tiquete (04), NC (03), ND (02) | Esquemas XSD oficiales DGT v4.4 generados mediante `hacienda_xml_generator_v44.py` | `COMPLETE` | P2 | Clave numérica de 50 dígitos y consecutivo de 20 dígitos calculados según normativa. |
| **Firma Digital XAdES-BES** | Firma con certificado .p12 | Firma criptográfica SHA-256 XAdES-BES (`hacienda_signer.py`) | `COMPLETE` | P2 | Valida estructura XMLDSig con canonicalización c14n. |
| **Transmisión a DGT (Staging / Prod)** | Cliente OAuth2 con idp.comprobanteselectronicos.go.cr | `HaciendaClient` con autenticación por token Bearer | `BLOCKED_EXTERNAL` | P2 | Requiere certificado criptográfico y usuario ATV real provisto por el cliente. |
| **Máquina de Estados de Factura** | Borrador, Enviada, Aceptada, Rechazada | DRAFT, SIGNED, SENT, PROCESSING, ACCEPTED, REJECTED, ERROR, PENDING_RETRY | `COMPLETE` | P2 | Persistido en `ElectronicInvoice.status`. |
| **Pantalla Detallada de Factura (5 Tabs)** | Resumen, Factura, XML Enviado, Respuesta, Historial | Modal simple con visor de XML firmado | `PARTIAL` | P2 | Construir modal profundo de 5 pestañas estilo POSMOVI con descarga de XMLs y respuestas. |
| **Catálogo CABYS** | Búsqueda por código o descripción | Búsqueda oficial CABYS integrada con tarifas del 13%, 4%, 2%, 1% y 0% | `COMPLETE` | P2 | Validado contra códigos oficiales de Hacienda. |

---

### P3 — Clientes, Proveedores, Compras y Cotizaciones

| Funcionalidad | POSMOVI | Orbítica POS | Estado Actual | Prioridad | Brecha / Plan de Acción |
|---|---|---|---|---|---|
| **Directorio de Clientes** | Cédula, teléfono, correo, crédito, saldo | Nombre, Cédula (Física/Jurídica/DIMEX), Correo, Teléfono, Dirección | `PARTIAL` | P3 | Conectar frontend directamente a `POST/PUT /customers` y agregar validación de límite de crédito. |
| **Selección Rápida en POS** | Búsqueda y creación sin salir de la caja | Selector de cliente rápido en modal de cobro | `PARTIAL` | P3 | Añadir creación rápida de cliente con 1 click desde la pantalla de venta. |
| **Directorio de Proveedores** | Contacto, compras previas, saldo | Nombre, Cédula jurídica, contacto, teléfono, correo | `PARTIAL` | P3 | Conectar frontend directamente a `POST/PUT /suppliers`. |
| **Recepción de Compras & Kárdex** | Factura de compra aumenta inventario | `POST /purchases` aumenta stock y genera `IN_PURCHASE` en kárdex | `PARTIAL` | P3 | Conectar formulario en `purchases/page.tsx` con el backend de FastAPI. |
| **Cotizaciones / Proformas** | Crear y convertir a factura en 1 click | Pantalla de cotizaciones en frontend sin persistencia en BD | `MISSING` (Backend) | P3 | Crear modelo `Quote` en PostgreSQL, endpoint de conversión atómica a venta y enlazar UI. |

---

### P4 — Configuración, Reportes y Auditoría

| Funcionalidad | POSMOVI | Orbítica POS | Estado Actual | Prioridad | Brecha / Plan de Acción |
|---|---|---|---|---|---|
| **Centro de Configuración Profundo** | Menús segmentados: POS, Impresión, Hacienda, Cajas | Actualmente 3 tabs (general, hacienda, apariencia) | `PARTIAL` | P4 | Reorganizar en categorías completas: Empresa, Sucursales, POS, Facturación, Impresión (58mm/80mm), Pagos. |
| **Reportes Financieros Reales** | Ventas por fecha, cajero, sucursal, método de pago | Backend cuenta con endpoints agregados en PostgreSQL; frontend calculaba en cliente | `PARTIAL` | P4 | Enlazar `reports/page.tsx` a `/reports/sales-summary` y `/reports/inventory-valuation` con filtros reales y exportación CSV. |
| **Bitácora de Auditoría** | Registro de acciones críticas | Modelo `AuditLog` inmutable con actor, acción, recurso, IP y timestamp | `COMPLETE` | P4 | Visualizable en `/audit` con eventos de autenticación y ventas. |

---

### P5 — Módulos Adicionales (Post-V1 / A Ocultar o Congelar)

| Módulo | Decisión Estratégica V1 | Acción Inmediata |
|---|---|---|
| **Bancos & Conciliación (`/banking`)** | Fuera de alcance V1 | Marcar en menú como "Próximamente" |
| **Despacho & Rutas (`/dispatch`)** | Fuera de alcance V1 | Marcar en menú como "Próximamente" |
| **Órdenes de Servicio / Citas (`/work-orders`)** | Fuera de alcance V1 | Marcar en menú como "Próximamente" |
| **Fidelidad & Puntos (`/loyalty`)** | Fuera de alcance V1 | Marcar en menú como "Próximamente" |
| **RRHH Completo & Nómina** | No iniciar | No visible |
| **App Móvil Nativa** | No iniciar | PWA responsiva en navegador cubre tablets y móviles |

---

## 3. Hoja de Ruta de Implementación Vertical (Plan de Acción)

1. **Fase P0 (Cerrada):** Identidad, autenticación real, zero-mock onboarding y persistencia atómica en PostgreSQL.
2. **Fase P1:**
   - Perfeccionar atajos de teclado POS (F1-F8).
   - Implementar interfaz de pagos mixtos (Efectivo + Tarjeta + SINPE).
   - Asegurar que `pos/page.tsx` complete la venta invocando directamente a `POST /sales` con `Idempotency-Key`.
3. **Fase P2:**
   - Crear modal de detalle de factura profundo con 5 pestañas (Resumen, Factura, XML Enviado, Respuesta Hacienda, Historial).
   - Probar reintentos controlados sin duplicar comprobantes.
4. **Fase P3:**
   - Persistir Cotizaciones en PostgreSQL (`Quote` + `QuoteItem`) con endpoint `POST /quotes/{id}/convert-to-sale`.
   - Conectar formularios de Clientes, Proveedores y Compras directamente a los endpoints de FastAPI.
5. **Fase P4:**
   - Ampliar Centro de Configuración con opciones completas de impresión (58mm/80mm) y preferencias POS.
   - Conectar Reportes a los endpoints de agregación SQL del backend con exportación CSV.
6. **Fase P5:**
   - Etiquetar módulos secundarios como "Próximamente" en el sidebar para mantener el foco en la estabilidad del núcleo comercial.
