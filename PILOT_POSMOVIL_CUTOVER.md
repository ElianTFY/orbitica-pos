# ORBÍTICA POS — Plan de Transición y Cutover Piloto desde POSMóvil

## 1. Contexto de la Empresa Piloto

- **Sector**: Comercio familiar costarricense (Supermercado / Tienda de conveniencia).
- **Sistema Actual**: POSMóvil (Facturación electrónica local + punto de venta tradicional).
- **Sistema Destino**: Orbítica POS SaaS con integración directa a Hacienda v4.4.

---

## 2. Estrategia de Convivencia y Prevención de Duplicados Fiscales

> [!CAUTION]
> Para evitar colisiones en la Clave Numérica de 50 dígitos en Hacienda, **NUNCA** se debe reutilizar la misma combinación de `(Sucursal, Terminal)` que se encuentre emitiendo activamente en POSMóvil en el mismo día.

### 2.1 Asignación de Terminales Separadas
- **POSMóvil (Caja Principal)**: Sucursal `001`, Terminal `00001`.
- **Orbítica POS (Caja Piloto)**: Sucursal `001`, Terminal `00002` (o Sucursal `002`, Terminal `00001`).
- Esto garantiza que las secuencias consecutivas de 10 dígitos sean completamente independientes y Hacienda nunca rechace un comprobante por clave duplicada (`código 02`).

---

## 3. Procedimiento de Migración Paso a Paso (Cutover)

### Paso 1: Exportación y Limpieza del Catálogo desde POSMóvil
1. Exportar el inventario desde POSMóvil a formato CSV / Excel.
2. Mapear los campos requeridos por Orbítica POS:
   - `name`: Nombre del producto.
   - `barcode` / `sku`: Código de barras.
   - `cabys_code`: Código CAByS oficial de 13 dígitos.
   - `tax_rate`: Tasa de IVA (13%, 4%, 2%, 1%, 0%).
   - `cost_price`: Costo sin impuestos.
   - `selling_price`: Precio final al consumidor.
   - `current_stock`: Conteo físico de inventario al corte.

### Paso 2: Configuración Fiscal Inicial en Orbítica POS
1. Registrar la organización con su cédula jurídica/física y códigos de ubicación DGT (Provincia, Cantón, Distrito, Barrio).
2. Subir el certificado `.p12` criptográfico de la empresa y su PIN a `POST /api/v1/hacienda/credentials` (almacenado bajo cifrado AES-256).
3. Configurar usuario y contraseña ATV generados en el portal de Hacienda.
4. Probar conectividad con `POST /api/v1/hacienda/test-connection`.

### Paso 3: Carga de Inventario y Apertura de Saldos
1. Importar los productos mediante el asistente de migración.
2. Verificar que las existencias iniciales coincidan con el arqueo físico.

### Paso 4: Fase Piloto en Paralelo (Día 1 a Día 7)
1. Operar la Caja 2 en Orbítica POS para ventas con Tiquete y Factura Electrónica v4.4.
2. Verificar en tiempo real la aceptación de comprobantes consultando el estado oficial en Hacienda (`ACCEPTED`).
3. Al final de cada turno, realizar el arqueo de caja comparando el efectivo real con el esperado del sistema.

### Paso 5: Apagado Definitivo de POSMóvil (Día 8 en adelante)
1. Cierre final de turno en POSMóvil y exportación de reportes históricos para custodia fiscal (5 años).
2. Traspaso de la Caja 1 a Orbítica POS.
