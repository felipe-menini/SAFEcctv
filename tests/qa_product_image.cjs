const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require(path.join(process.env.TEMP, 'opencode', 'pw', 'node_modules', 'playwright'));

const root = path.resolve(__dirname, '..');
const indexUrl = pathToFileURL(path.join(root, 'index.html')).href;
const results = [];
const ok = (name, pass, extra = '') => { results.push(pass); console.log((pass ? 'PASS' : 'FAIL') + ' | ' + name + (extra ? ' | ' + extra : '')); };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  await page.goto(indexUrl);
  await page.click('button[data-view="catalogo"]');

  ok('18 productos base sin thumb', (await page.locator('#catalogTable .catalog-thumb').count()) === 0);

  // PNG de prueba generado en la página
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 300; c.height = 200;
    const x = c.getContext('2d'); x.fillStyle = '#cc2222'; x.fillRect(0, 0, 300, 200);
    return c.toDataURL('image/png').split(',')[1];
  });
  const png = Buffer.from(b64, 'base64');

  await page.click('#createCatalogProduct');
  await page.fill('#modalProductName', 'TY Test Camara Imagen');
  await page.fill('#modalCost', '100');
  await page.setInputFiles('#modalProductImage', { name: 'cam.png', mimeType: 'image/png', buffer: png });
  await page.waitForFunction(() => {
    const img = document.getElementById('modalImagePreview');
    return img && !img.hidden && (img.src || '').startsWith('data:image/jpeg');
  }, { timeout: 5000 });
  ok('preview normalizada a JPEG en modal', true);
  await page.click('#modalConfirm');
  await page.waitForSelector('#modalBackdrop[hidden]', { timeout: 3000 }).catch(() => { });

  const row = page.locator('#catalogTable tr', { hasText: 'TY Test Camara Imagen' });
  ok('producto creado con thumb en tabla', (await row.locator('.catalog-thumb').count()) === 1);
  ok('19 filas totales', (await page.locator('#catalogTable tr').count()) === 19);

  // lightbox
  await row.locator('.catalog-thumb').click();
  await page.waitForSelector('.product-image-view img', { timeout: 3000 });
  ok('lightbox abre con la imagen', (await page.locator('.product-image-view img').count()) === 1);
  await page.click('#modalConfirm');
  await page.waitForSelector('#modalBackdrop[hidden]', { timeout: 3000 }).catch(() => { });

  // persistencia
  await page.reload();
  await page.click('button[data-view="catalogo"]');
  const row2 = page.locator('#catalogTable tr', { hasText: 'TY Test Camara Imagen' });
  ok('persiste tras recargar', (await row2.locator('.catalog-thumb').count()) === 1);

  // editar: la imagen existente se muestra y se conserva
  await row2.locator('[data-catalog-action="edit"]').click();
  await page.waitForSelector('#modalImagePreview', { timeout: 3000 });
  const stillHas = await page.evaluate(() => {
    const img = document.getElementById('modalImagePreview');
    return !img.hidden && (img.src || '').startsWith('data:image/jpeg') && (document.getElementById('modalImageData').value || '').startsWith('data:image/jpeg');
  });
  ok('editar conserva imagen en preview + hidden', stillHas);
  await page.click('#modalConfirm');
  await page.waitForSelector('#modalBackdrop[hidden]', { timeout: 3000 }).catch(() => { });
  ok('guardar sin tocar imagen la mantiene', (await page.locator('#catalogTable tr', { hasText: 'TY Test Camara Imagen' }).locator('.catalog-thumb').count()) === 1);

  // quitar imagen
  await page.locator('#catalogTable tr', { hasText: 'TY Test Camara Imagen' }).locator('[data-catalog-action="edit"]').click();
  await page.waitForSelector('#modalImageClear:not([hidden])', { timeout: 3000 });
  await page.click('#modalImageClear');
  const cleared = await page.evaluate(() => document.getElementById('modalImageData').value === '' && document.getElementById('modalImagePreview').hidden);
  ok('botón Quitar limpia preview + hidden', cleared);
  await page.click('#modalConfirm');
  await page.waitForSelector('#modalBackdrop[hidden]', { timeout: 3000 }).catch(() => { });
  ok('producto queda sin thumb tras quitar', (await page.locator('#catalogTable tr', { hasText: 'TY Test Camara Imagen' }).locator('.catalog-thumb').count()) === 0);

  // picker en cotizador: crear otro producto con imagen y verificar card
  await page.click('#createCatalogProduct');
  await page.fill('#modalProductName', 'TY Test Picker Thumb');
  await page.setInputFiles('#modalProductImage', { name: 'cam.png', mimeType: 'image/png', buffer: png });
  await page.waitForFunction(() => {
    const img = document.getElementById('modalImagePreview');
    return img && !img.hidden && (img.src || '').startsWith('data:image/jpeg');
  }, { timeout: 5000 });
  await page.click('#modalConfirm');
  await page.waitForSelector('#modalBackdrop[hidden]', { timeout: 3000 }).catch(() => { });
  await page.click('button[data-view="cotizador"]');
  const myCard = page.locator('.product-card', { hasText: 'TY Test Picker Thumb' });
  ok('picker muestra thumb del producto', (await myCard.locator('.picker-thumb').count()) === 1);

  await browser.close();
  const failed = results.filter(r => !r).length;
  console.log(failed === 0 ? 'ALL PASS (' + results.length + ')' : 'FAILED: ' + failed + '/' + results.length);
  process.exit(failed === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
