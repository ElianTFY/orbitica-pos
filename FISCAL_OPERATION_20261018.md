# Operación fiscal de Orbítica POS — revisión del 18 de octubre de 2026

## Recorrido de una venta

1. Cada usuario accede a Orbítica con su correo y contraseña. Los permisos y la empresa se verifican en el servidor.
2. El propietario configura los datos reales del emisor y carga, para cada ambiente, el usuario API de comprobantes, su contraseña API, la llave .p12/.pfx y el PIN. No se solicita la contraseña de acceso al portal tributario.
3. La venta, los pagos, el inventario, la clave, el consecutivo y el evento de envío se guardan en una transacción. Un reintento del cobro con la misma clave de idempotencia no crea otra venta.
4. El worker toma el evento, genera el XML v4.4 y lo firma. Consulta la clave original antes de transmitir para reconciliar un envío previo cuya respuesta se haya perdido.
5. Recepción HTTP 201 significa recibido, pendiente de validación. Se consulta la misma clave hasta obtener aceptación o rechazo; no se convierte una recepción en aceptación.
6. El XML firmado y la respuesta original quedan asociados al comprobante en PostgreSQL y pueden consultarse en Facturación. La consulta manual y el worker usan el mismo transporte validado.
7. Con aceptación y correo del receptor, se envían ambos XML. Los correos de pruebas se identifican como PRUEBAS, sin validez tributaria. La falta de entrega se conserva para reintentar.

## Correcciones de esta revisión

- La preparación fiscal ya no acepta una identificación de proveedor vacía. Comprueba perfil del emisor, proveedor, certificado vigente, última prueba de autenticación guardada, servicio de correo y actividad real del worker.
- La evidencia de factura, tiquete y nota de crédito de pruebas se consulta por empresa; los indicadores de producción comparten la consulta del bloqueo de emisión.
- Credenciales, estado y prueba de conexión seleccionan explícitamente STAGING o PRODUCTION. La pantalla limpia las claves ingresadas al cambiar de ambiente y descarta respuestas de solicitudes anteriores.
- La contraseña y el PIN guardados se pueden conservar al editar. Un certificado nuevo exige su PIN. No se crea una configuración activa sin certificado.
- Las credenciales y su auditoría se guardan en una sola transacción. Cada actualización invalida la prueba anterior. La prueba de datos todavía no guardados no certifica las credenciales persistidas.
- Solo usuarios con permiso de configuración pueden consultar el usuario API o probar credenciales. Los errores de autenticación no devuelven cuerpos del proveedor, claves ni tokens.
- El worker registra actividad cada 15 segundos en una tabla independiente. Una señal de más de 60 segundos, una parada o un error no acreditan actividad. La pantalla muestra cola, incidencias y correos pendientes por empresa y ambiente.
- La consulta manual rechaza una clave diferente, Base64 inválido, estado desconocido o respuesta final sin XML. Se conserva el pendiente para consultar de nuevo.
- Los nombres comerciales se escapan en el HTML del correo y se usa el emisor capturado al emitir. Se retiró el mensaje de interfaz que afirmaba procesamiento sin respuesta registrada.
- El estado oficial `error` requiere revisión visible. Reanudar un comprobante recibido solo consulta su clave original. Una aceptación posterior limpia el error anterior.
- La tipografía mantiene una alternativa sans-serif cuando no hay fuente Geist configurada. Las capturas esperan a que termine el cambio de tamaño del menú lateral.
- Migración aditiva `0008_fiscal_monitoring`; no cambia claves, consecutivos ni documentos existentes.

## Instalación preparada, no contratada

`render.hacienda-worker.yaml` añade únicamente `orbitica-pos-test-hacienda-worker` al piloto existente de Ohio. Usa la misma DATABASE_URL, JWT_SECRET_KEY y ENCRYPTION_MASTER_KEY de `orbitica-pos-test-api`, además del proveedor y correo de esa API. No recrea bases ni servicios existentes. Conserva desactivada la emisión productiva.

El plan `0.5c-512mb` del worker figura a USD 7/mes en la tarifa oficial consultada el 18 de octubre de 2026; el importe final, impuestos, uso y condiciones se deben revisar al contratar. No se ha aplicado este Blueprint ni autorizado un cargo. Fuente: https://render.com/pricing .

Antes de aplicarlo:

1. Publicar API con migración 0008 y después frontend del mismo commit validado.
2. Configurar en la API la identificación y el nombre reales del proveedor del sistema (`SOFTWARE_PROVIDER_TAX_ID`, `SOFTWARE_PROVIDER_NAME`), sin sustituirlos por ejemplos. Confirmar configuración y entrega de Brevo.
3. Obtener autorización del titular para crear el worker de pago. Aplicar el archivo en el workspace Orbítica POS Pruebas. Revisar sus valores heredados, el commit y el estado RUNNING.
4. Dentro de la cuenta del propietario, cargar las credenciales de PRUEBAS en Configuración → Hacienda y usar Probar credenciales guardadas. Las claves se ingresan allí, no en el chat ni en el repositorio.
5. Emitir pruebas autorizadas de factura, tiquete y nota de crédito; verificar respuestas auténticas, motivo de rechazo cuando corresponda, XML descargados y correo recibido. Probar pérdida de conexión y recuperación conservando la misma clave.

`render.yaml` sigue siendo una alternativa para crear infraestructura nueva de pago; se corrigieron la rama y las variables de correo. No debe aplicarse junto con el archivo del worker por accidente. Su frontend público y la URL del backend deberán coordinarse al migrar.

## Límites que siguen abiertos

- El piloto gratuito no incluye un worker desplegado. API y frontend pueden dormir. Su PostgreSQL gratuito vence el 13 de noviembre de 2026 a las 17:05 de Costa Rica, carece de respaldo gestionado y no es una base permanente de producción.
- No hay evidencia de aceptación fiscal auténtica FE/TE/NC en esta revisión. Las pruebas automatizadas usan certificados y respuestas sintéticos y no representan aprobación de Hacienda.
- Quedan pendientes validación de entrega real de correo, registro/venta autenticados en el despliegue público y almacenamiento durable fuera del disco temporal. Los XML en PostgreSQL requieren una base permanente con respaldo.
- La validación criptográfica local no acredita por sí sola la correspondencia de la llave con la identidad fiscal ni todos los catálogos oficiales.
- Los otros pendientes del POS siguen detallados en VERIFIED_POS_AUDIT_20261014.md: módulos locales de gastos, órdenes, despacho, fidelización y banca; USD/exoneraciones y otros documentos no están declarados terminados.
- La producción permanece bloqueada: requiere autorización explícita, datos reales, operación permanente y validación fiscal por empresa. Completar la configuración o conseguir un token no garantiza la aceptación de un comprobante.

## Validación

CI completa aprobada para `21af2910b73a8f11d44a2ad568025c86d7992dfe`: https://github.com/ElianTFY/orbitica-pos/actions/runs/39097232768 .

- 152 pruebas del backend aprobadas; 6 PostgreSQL aprobadas por separado.
- Migraciones hasta 0008 y `alembic check` correctos; arranque público con comprobaciones de producción y restauración a base separada aprobados.
- Typecheck, auditoría npm de producción y build aprobados; contenedores ARM de API, worker y web arrancados y comprobados.
- 11 pasos desde navegador contra PostgreSQL aprobados, incluidos configuración por ambiente, estado del worker ausente, ventas, vuelto, reportes, devolución, cierre, permisos y recuperación. Correo capturado en memoria; Hacienda no contactada.
- Artefacto: https://github.com/ElianTFY/orbitica-pos/actions/runs/39097232768/artifacts/12125142583 . SHA-256: `274781c55e4164ed137c6a5505f9e1ab866c7a996ae200ebb25a3a981a15fb98`.
- Los tres Blueprints validan contra el JSON Schema oficial de Render descargado el 18 de octubre. Esto comprueba estructura, no crea recursos ni confirma valores secretos externos.
- Tras añadir el caso de error/reconciliación, 14 pruebas fiscales enfocadas pasaron localmente. La revisión final de ese cambio y el ajuste de fuente se publicará y verificará de nuevo antes del despliegue.

Documentación oficial del protocolo: https://www.hacienda.go.cr/docs/ComprobantesElectronicosAPI.html .
