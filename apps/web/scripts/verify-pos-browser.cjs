/* Real browser/API/database regression. Only local, explicitly disposable data.
 * Mail capture is a test fixture; no Hacienda acceptance or external delivery
 * is simulated or claimed. Run after npm run build.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn, spawnSync } = require('node:child_process');
const { chromium } = require('playwright');

assert.equal(process.env.E2E_ALLOW_DISPOSABLE_DB, '1', 'Explicit disposable database opt-in required');
const webDir = path.resolve(__dirname, '..');
const apiDir = path.resolve(webDir, '../api');
const output = path.resolve(process.env.E2E_OUTPUT_DIR || path.join(webDir, 'test-results/browser'));
fs.mkdirSync(output, { recursive: true });
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'orbitica-browser-'));
const database = process.env.E2E_DATABASE_URL || `sqlite+aiosqlite:///${temporary}/pos.db`;
if (process.env.E2E_DATABASE_URL) {
  assert(['localhost', '127.0.0.1'].includes(new URL(database).hostname), 'E2E only allows a local test database');
}
const env = { ...process.env, ENVIRONMENT: 'test', E2E_ALLOW_DISPOSABLE_DB: '1',
  DATABASE_URL: database, SYNC_DATABASE_URL: database.replace('sqlite+aiosqlite:', 'sqlite:').replace('postgresql+asyncpg:', 'postgresql:'),
  JWT_SECRET_KEY: 'browser_disposable_test_jwt_secret_never_for_production',
  ENCRYPTION_MASTER_KEY: 'browser_disposable_test_encryption_never_for_production',
  COOKIE_SECURE: 'false', HACIENDA_LIVE_EMISSION_ENABLED: 'false',
  FRONTEND_URL: 'http://127.0.0.1:3000', NEXT_TELEMETRY_DISABLED: '1' };
const python = process.env.E2E_PYTHON || 'python';
const migration = spawnSync(python, ['-m', 'alembic', 'upgrade', 'head'], { cwd: apiDir, env, encoding: 'utf8' });
assert.equal(migration.status, 0, migration.stderr);
const processes = [];
function launch(command, args, cwd, name) {
  const log = fs.openSync(path.join(output, `${name}.log`), 'w');
  const process = spawn(command, args, { cwd, env, stdio: ['ignore', log, log] });
  fs.closeSync(log); processes.push(process); return process;
}
const steps = [];
const failures = [];
const pass = name => { steps.push(name); console.log(`PASS: ${name}`); };
let browser, page;
async function ready(url) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Server not ready: ${url}`);
}
async function responseFor(action, suffix, method = 'POST') {
  const pending = page.waitForResponse(r => new URL(r.url()).pathname === `/api/v1${suffix}` && r.request().method() === method);
  await action(); const response = await pending;
  assert(response.ok(), `${method} ${suffix}: ${response.status()} ${await response.text()}`);
  return (await response.json()).data;
}

(async () => {
  try {
    launch(python, ['-m', 'uvicorn', 'tests.browser_api:app', '--host', '127.0.0.1', '--port', '8000'], apiDir, 'api');
    launch(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3000'], webDir, 'web');
    await ready('http://127.0.0.1:8000/health/ready');
    await ready('http://127.0.0.1:3000/login');
    browser = await chromium.launch({ headless: true, executablePath: process.env.E2E_CHROMIUM_PATH || undefined,
      args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    page = await context.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', error => failures.push(error.message));
    const identity = Date.now().toString();
    const ownerEmail = `owner-${identity}@example.com`, employeeEmail = `cashier-${identity}@example.com`;
    const password = `Disposable-${identity}!`;
    await page.goto('http://127.0.0.1:3000/register');
    await page.getByLabel('Correo Electrónico del Titular *', { exact: true }).fill(ownerEmail);
    await responseFor(() => page.getByRole('button', { name: 'Continuar y Enviar Código' }).click(), '/auth/register/start');
    const mail = await (await fetch(`http://127.0.0.1:8000/__e2e__/mail-code/${ownerEmail}`)).json();
    assert.equal(mail.delivery, 'test_memory_only');
    await page.getByLabel('Código de Verificación (6 dígitos) *', { exact: true }).fill(mail.code);
    await responseFor(() => page.getByRole('button', { name: 'Verificar y Continuar' }).click(), '/auth/register/verify');
    await page.getByLabel('Nombre Completo del Propietario *', { exact: true }).fill('Responsable E2E');
    await page.getByLabel('Contraseña de Acceso *', { exact: true }).fill(password);
    await page.getByLabel('Confirmar Contraseña *', { exact: true }).fill(password);
    await page.getByLabel('Nombre Comercial del Negocio', { exact: true }).fill('Empresa E2E Vacía');
    await page.getByRole('checkbox', { name: /Acepto los/ }).check();
    const organization = await responseFor(() => page.getByRole('button', { name: 'Crear Cuenta y Configurar Negocio' }).click(), '/organizations/register');
    await page.waitForURL('**/onboarding');
    assert((await context.cookies()).some(cookie => cookie.name === 'refresh_token' && cookie.httpOnly));
    await page.reload(); await page.getByText('Asistente de Configuración', { exact: false }).first().waitFor().catch(async () => {
      await page.waitForFunction(() => !document.body.innerText.includes('Cargando'));
      assert(!page.url().includes('/login'), 'Registration must survive reload');
    });
    pass('Registro desde navegador con correo de prueba y sesión tras recargar');
    const authHeaders = { Authorization: `Bearer ${organization.access_token}` };
    async function api(endpoint, options = {}) {
      const response = await context.request.fetch(`http://127.0.0.1:3000/api/v1${endpoint}`, { ...options, headers: { ...authHeaders, ...options.headers } });
      assert(response.ok(), `${endpoint}: ${response.status()} ${await response.text()}`);
      return (await response.json()).data;
    }
    assert.equal((await api('/products')).length, 0, 'New company must have no demo products');
    // Explicit synthetic fiscal profile; no credentials and no fiscal worker.
    await api('/organizations/me', { method: 'PATCH', data: { legal_name: 'Empresa de prueba E2E', identification_type: '02',
      identification_number: `3101${identity.slice(-6)}`, economic_activity_code: '521101', province_code: '1',
      canton_code: '01', district_code: '01', address_detail: 'Dirección sintética para prueba local', email: ownerEmail,
      atv_environment: 'STAGING' } });
    await page.goto('http://127.0.0.1:3000/settings');
    await page.getByRole('tab', { name: 'Hacienda v4.4', exact: true }).click();
    await page.getByText('El servicio de envío fiscal no está activo; los comprobantes permanecerán en cola', { exact: true }).waitFor();
    assert.equal(await page.getByText('CONFIGURACIÓN COMPLETA', { exact: true }).count(), 0);
    await page.getByLabel('Usuario API de Hacienda', { exact: true }).fill('unsaved-staging@example.test');
    await page.getByLabel('Contraseña API de Hacienda', { exact: true }).fill('synthetic-secret');
    await page.getByLabel('Ambiente de Hacienda', { exact: true }).selectOption('PRODUCTION');
    await page.getByText('Preparación para emitir en producción', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Contraseña API de Hacienda', { exact: true }).inputValue(), '');
    assert.equal(await page.getByLabel('Usuario API de Hacienda', { exact: true }).inputValue(), '');
    await page.getByLabel('Ambiente de Hacienda', { exact: true }).selectOption('STAGING');
    await page.getByText('Preparación para enviar pruebas', { exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2), 'Fiscal setup must fit mobile');
    await page.screenshot({ path: path.join(output, 'fiscal-setup-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: path.join(output, 'fiscal-setup-desktop.png'), fullPage: true });
    pass('Configuración fiscal: worker ausente visible, claves separadas por ambiente y pantalla móvil');

    await page.goto('http://127.0.0.1:3000/products');
    await page.getByRole('button', { name: 'Nuevo Producto', exact: true }).click();
    const productName = `Producto E2E ${identity}`;
    await page.getByLabel('Nombre del Producto', { exact: true }).fill(productName);
    await page.getByLabel('Código SKU', { exact: true }).fill(`E2E-${identity}`);
    await page.getByPlaceholder('Código o descripción, por ejemplo: pan pita').fill('2132100000100');
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await page.getByRole('listbox', { name: 'Resultados CAByS' }).getByRole('button').first().click();
    await page.getByLabel('Precio de Venta (CRC ₡)', { exact: true }).fill('1130');
    await page.getByLabel('Precio de Costo (CRC ₡)', { exact: true }).fill('700');
    await page.getByLabel('Stock Inicial en Bodega', { exact: true }).fill('4');
    const product = await responseFor(() => page.getByRole('button', { name: 'Crear Producto', exact: true }).click(), '/products');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.reload(); await page.getByText(productName, { exact: true }).waitFor();
    assert.equal(Number((await api(`/products/${product.id}`)).current_stock), 4);
    pass('Producto, CAByS e inventario inicial persistidos desde formulario');

    await page.goto('http://127.0.0.1:3000/employees');
    await page.getByRole('button', { name: 'Agregar Empleado', exact: true }).click();
    await page.getByLabel('Nombre Completo *', { exact: true }).fill('Cajero E2E');
    await page.getByLabel('Correo Electrónico *', { exact: true }).fill(employeeEmail);
    await page.getByLabel('Contraseña inicial (mínimo 8 caracteres)', { exact: true }).fill(password);
    await responseFor(() => page.getByRole('button', { name: 'Registrar Empleado', exact: true }).click(), '/users');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.reload(); await page.getByText(employeeEmail, { exact: true }).waitFor();
    pass('Empleado cajero guardado y visible tras recargar');

    await page.goto('http://127.0.0.1:3000/branches');
    await page.getByRole('button', { name: 'Nueva Sucursal', exact: true }).click();
    await page.getByLabel('Nombre de la Sucursal *', { exact: true }).fill('Sucursal E2E');
    await page.getByLabel('Código de Sucursal Hacienda (3 dígitos) *', { exact: true }).fill('002');
    await responseFor(() => page.getByRole('button', { name: 'Crear Sucursal', exact: true }).click(), '/branches');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.reload(); await page.getByText('Sucursal E2E', { exact: true }).waitFor();
    assert.equal((await api('/branches')).length, 2);
    pass('Sucursal nueva persistida y accesible por el propietario');

    await page.goto('http://127.0.0.1:3000/cash-register');
    await page.getByRole('button', { name: 'Abrir Turno de Caja', exact: true }).click();
    await page.getByLabel('Fondo Inicial en Efectivo (CRC ₡)', { exact: true }).fill('1000');
    const session = await responseFor(() => page.getByRole('button', { name: 'Confirmar Apertura', exact: true }).click(), '/cash-registers/sessions/open');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.goto('http://127.0.0.1:3000/pos');
    await page.getByRole('button').filter({ has: page.getByText(productName, { exact: true }) }).click();
    await page.getByRole('button', { name: /^Cobrar Venta/ }).click();
    await page.getByLabel('Monto Entregado por Cliente (₡)', { exact: true }).fill('2000');
    const sale = await responseFor(() => page.getByRole('button', { name: 'Completar Venta e Imprimir Comprobante', exact: true }).click(), '/sales');
    assert.equal(Number(sale.total_amount), 1130); assert.equal(sale.fiscal_status, 'QUEUED');
    assert.equal(Number((await api(`/products/${product.id}`)).current_stock), 3);
    assert.match(sale.numeric_key, /^\d{50}$/);
    const receipt = await api(`/sales/${sale.id}/receipt`);
    assert.equal(receipt.hacienda.numeric_key, sale.numeric_key);
    assert.equal(receipt.hacienda.status, 'QUEUED');
    assert.equal(Number((await api('/cash-registers/current')).expected_cash_amount), 2130, 'Change must not count as cash income');
    const pendingXML = await context.request.get(`http://127.0.0.1:3000/api/v1/sales/${sale.id}/xml`, { headers: authHeaders });
    assert.equal(pendingXML.status(), 409, 'Unsigned fiscal document must not fabricate XML');
    const printedReceipt = page.locator('#thermal-print-area');
    await printedReceipt.getByText('Vuelto:', { exact: true }).waitFor();
    assert.match(await printedReceipt.innerText(), /870[,.]00/);
    assert.match(receipt.created_at_iso, /-06:00$/);
    assert.equal(Number(receipt.payments[0].change_returned), 870);
    // Decode the actual rendered QR independently, instead of checking its props.
    await page.addScriptTag({ path: require.resolve('jsqr') });
    const decodedKey = await printedReceipt.locator('svg[role="img"]').evaluate(async svg => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 224;
      const context = canvas.getContext('2d');
      const image = new Image();
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
      await image.decode(); context.drawImage(image, 0, 0, 224, 224);
      return window.jsQR(context.getImageData(0, 0, 224, 224).data, 224, 224)?.data;
    });
    assert.equal(decodedKey, sale.numeric_key, 'Printed QR must encode the original fiscal key');
    await page.screenshot({ path: path.join(output, 'sale-desktop.png'), fullPage: true });
    pass('Venta en efectivo con vuelto, recibo original y comprobante pendiente explícito');

    const report = await responseFor(() => page.goto('http://127.0.0.1:3000/reports'), '/reports/sales-summary', 'GET');
    assert.equal(Number(report.total_sales), 1130); assert.equal(Number(report.total_cost), 700);
    assert.equal(Number(report.estimated_profit), 300); assert.equal(Number(report.payments_breakdown[0].total_amount), 1130);
    await page.getByText('1 transacciones en el período', { exact: true }).waitFor();
    assert.match(await page.getByText('Utilidad Bruta', { exact: true }).locator('../..').innerText(), /300[,.]00/);
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click();
    const downloaded = await downloadEvent;
    const csv = fs.readFileSync(await downloaded.path(), 'utf8');
    assert(csv.includes(sale.numeric_key)); assert(csv.includes('1000.00,130.00,1130.00,QUEUED'));
    await page.screenshot({ path: path.join(output, 'reports-desktop.png'), fullPage: true });
    pass('Reporte y CSV del servidor: costo completo, utilidad sin IVA y efectivo neto del vuelto');

    await page.goto('http://127.0.0.1:3000/sales');
    await page.getByRole('button', { name: 'Devolver', exact: true }).click();
    await page.getByLabel('Motivo de devolución', { exact: true }).fill('Devolución íntegra de prueba E2E');
    await responseFor(() => page.getByRole('button', { name: 'Confirmar devolución total', exact: true }).click(), `/sales/${sale.id}/refund`);
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(Number((await api('/cash-registers/current')).expected_cash_amount), 1000);
    const refundReceipt = await api(`/sales/${sale.id}/receipt`);
    assert.equal(refundReceipt.hacienda.numeric_key, sale.numeric_key);
    assert.equal(refundReceipt.hacienda.status, 'CANCELLED');
    assert.equal(Number((await api(`/products/${product.id}`)).current_stock), 4);
    await page.goto('http://127.0.0.1:3000/cash-register');
    await page.getByRole('button', { name: 'Cerrar Caja (Arqueo Z)', exact: true }).click();
    await page.getByLabel('Efectivo Físico Contado en Gaveta (CRC ₡)', { exact: true }).fill('1000');
    const closed = await responseFor(() => page.getByRole('button', { name: 'Confirmar y Cerrar Caja', exact: true }).click(), `/cash-registers/sessions/${session.id}/close`);
    assert.equal(closed.status, 'CLOSED'); assert.equal(Number(closed.cash_difference), 0);
    pass('Devolución y cierre de caja con diferencia cero sin cambiar la identidad fiscal');

    for (const viewport of [{ width: 768, height: 1024 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport); await page.goto('http://127.0.0.1:3000/products');
      await page.getByText(productName, { exact: true }).waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `Horizontal overflow at ${viewport.width}px`);
      await page.screenshot({ path: path.join(output, `products-${viewport.width}.png`), fullPage: true });
    }
    pass('Catálogo sin desbordamiento horizontal en tablet y móvil');
    const cashierContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const ownerPage = page; page = await cashierContext.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', error => failures.push(error.message));
    await page.goto('http://127.0.0.1:3000/login');
    await page.getByLabel('Correo Electrónico', { exact: true }).fill(employeeEmail);
    await page.getByLabel('Contraseña', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Acceder al Sistema', exact: true }).click();
    await page.waitForURL('**/dashboard');
    await page.goto('http://127.0.0.1:3000/pos');
    await page.getByText(productName, { exact: true }).first().waitFor();
    assert(!await page.getByText('Sin conexión con el servidor', { exact: false }).count());
    await page.screenshot({ path: path.join(output, 'cashier-pos.png'), fullPage: true });
    pass('Inicio de sesión de cajero y catálogo POS con permisos limitados');

    page = ownerPage;
    await page.goto('http://127.0.0.1:3000/forgot-password');
    await page.getByLabel('Correo Electrónico', { exact: true }).fill(ownerEmail);
    await responseFor(() => page.getByRole('button', { name: /Enviar.*Recuperación|Enviar.*Instrucciones/ }).click(), '/auth/recovery');
    const recovery = await (await fetch(`http://127.0.0.1:8000/__e2e__/recovery-link/${ownerEmail}`)).json();
    assert.equal(recovery.delivery, 'test_memory_only');
    assert(recovery.url.startsWith('http://127.0.0.1:3000/reset-password#token='));
    await page.goto(recovery.url);
    await page.getByLabel('Nueva Contraseña', { exact: true }).fill(password + '-new');
    await page.getByLabel('Confirmar Nueva Contraseña', { exact: true }).fill(password + '-new');
    await responseFor(() => page.getByRole('button', { name: /Restablecer Contraseña|Actualizar Contraseña/ }).click(), '/auth/reset-password');
    await page.getByText('¡Contraseña Actualizada!', { exact: true }).waitFor();
    assert(!page.url().includes('token='), 'Recovery secret must leave the address bar');
    assert.equal((await context.request.get('http://127.0.0.1:3000/api/v1/auth/me', { headers: authHeaders })).status(), 401);
    await page.goto('http://127.0.0.1:3000/login');
    await page.getByLabel('Correo Electrónico', { exact: true }).fill(ownerEmail);
    await page.getByLabel('Contraseña', { exact: true }).fill(password + '-new');
    await responseFor(() => page.getByRole('button', { name: 'Acceder al Sistema', exact: true }).click(), '/auth/login');
    await page.waitForURL('**/dashboard');
    pass('Recuperación por enlace, nueva contraseña y revocación de la sesión anterior');
    assert.deepEqual(failures, [], 'Uncaught browser errors');
    await ownerPage.close();
  } catch (error) {
    if (page) {
      await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
      fs.writeFileSync(path.join(output, 'failure-page.txt'), await page.locator('body').innerText().catch(() => ''));
    }
    console.error(error.stack); process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    for (const child of processes) child.kill('SIGTERM');
    fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify({ passed: !process.exitCode,
      date: new Date().toISOString(), database: database.startsWith('postgres') ? 'PostgreSQL' : 'SQLite',
      mail: 'test_memory_only', hacienda: 'not_contacted', steps, browserErrors: failures }, null, 2));
  }
})();
