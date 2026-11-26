import { expect, test } from '@playwright/test';

const b64url = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const SESSION = `${b64url({ email: 'juana@example.com', exp: Date.now() + 86_400_000 })}.sig`;
const state = (page: import('@playwright/test').Page) => page.locator('#msgRoot');

test('es noindex', async ({ page }) => {
  await page.goto('/mensajes');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('sin sesión no pide datos y ofrece iniciar sesión', async ({ page }) => {
  let asked = false;
  await page.route('**/admin/messages', (route) => { asked = true; return route.abort(); });
  await page.goto('/mensajes');
  await expect(state(page)).toHaveAttribute('data-state', 'login');
  await expect(page.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();
  expect(asked).toBe(false);
});

test('?preview muestra mensajes de ejemplo sin tocar el Worker', async ({ page }) => {
  let asked = false;
  await page.route('**/admin/messages', (route) => { asked = true; return route.abort(); });
  await page.goto('/mensajes?preview');
  await expect(state(page)).toHaveAttribute('data-state', 'list');
  await expect(page.locator('.ms-item')).toHaveCount(14);
  await expect(page.locator('.ms-item:visible')).toHaveCount(12);
  expect(asked).toBe(false);
});

test('carga progresiva: «Ver más» suma 12 y se oculta al llegar al final', async ({ page }) => {
  await page.goto('/mensajes?preview');
  await expect(page.locator('#msgShown')).toHaveText('Mostrando 12 de 14');
  await page.getByRole('button', { name: 'Ver más' }).click();
  await expect(page.locator('.ms-item:visible')).toHaveCount(14);
  await expect(page.locator('#msgMore')).toBeHidden();
});

test('la fecha es relativa y sin hora', async ({ page }) => {
  await page.goto('/mensajes?preview');
  const times = page.locator('.ms-item time');
  await expect(times.nth(0)).toHaveText('hoy');
  await expect(times.nth(1)).toHaveText('ayer');
  await expect(times.nth(5)).toHaveText('hace 4 días');
  await expect(page.locator('#msgCount')).toHaveText('14 mensajes');
});

test('«Descargar PDF» imprime todos los mensajes', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__print = 0; window.print = () => { (window as any).__print++; }; });
  await page.goto('/mensajes?preview');
  await page.getByRole('button', { name: /Descargar/ }).click();
  expect(await page.evaluate(() => (window as any).__print)).toBe(1);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.ms-item:visible')).toHaveCount(14);
});

test('con sesión autorizada lista los mensajes reales sin interpretar HTML', async ({ page }) => {
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), ['juana.session', SESSION]);
  let auth: string | undefined;
  await page.route('**/admin/messages', async (route) => {
    auth = (await route.request().headerValue('authorization')) ?? undefined;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ messages: [{ id: 1, email: 'ana@example.com', body: '<img src=x onerror=alert(1)> hola', created_at: '2026-11-03T10:00:00.000Z' }] }),
    });
  });
  await page.goto('/mensajes');
  await expect(page.locator('.ms-item')).toHaveCount(1);
  await expect(page.locator('.ms-body')).toHaveText('<img src=x onerror=alert(1)> hola');
  await expect(page.locator('.ms-body img')).toHaveCount(0);
  expect(auth).toBe(`Bearer ${SESSION}`);
});

test('con sesión no autorizada (403) muestra que no tiene acceso', async ({ page }) => {
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), ['juana.session', SESSION]);
  await page.route('**/admin/messages', (route) => route.fulfill({ status: 403, contentType: 'application/json', body: '{"error":"forbidden"}' }));
  await page.goto('/mensajes');
  await expect(state(page)).toHaveAttribute('data-state', 'denied');
  await expect(page.locator('.ms-item')).toHaveCount(0);
});

test('mientras carga muestra las estrellas bailando', async ({ page }) => {
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), ['juana.session', SESSION]);
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.route('**/admin/messages', async (route) => {
    await gate;
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"messages":[]}' });
  });
  await page.goto('/mensajes');
  await expect(state(page)).toHaveAttribute('data-state', 'loading');
  await expect(page.locator('.ms-loading .ms-stars')).toBeVisible();
  await expect(page.getByRole('status', { name: 'Cargando mensajes' })).toBeVisible();
  release();
  await expect(state(page)).toHaveAttribute('data-state', 'empty');
  await expect(page.locator('.ms-stars')).toBeHidden();
});

test('el PDF muestra la fecha dd/mm/aaaa, sin contador ni recuadros', async ({ page }) => {
  await page.goto('/mensajes?preview');
  await page.emulateMedia({ media: 'print' });
  const fecha = await page.locator('.ms-item').first().locator('time').evaluate((el) => getComputedStyle(el, '::after').content);
  expect(fecha).toMatch(/^"\d{2}\/\d{2}\/\d{4}"$/);
  await expect(page.locator('#msgCount')).toBeHidden();
  const item = page.locator('.ms-item').first();
  await expect(item).toHaveCSS('border-left-width', '2px');
  await expect(item).toHaveCSS('border-top-width', '0px');
});

test('desktop: se llena por filas, los dos mensajes más nuevos van en la primera fila', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.goto('/mensajes?preview');
  const items = page.locator('.ms-item:visible');
  const [a, b, c] = await Promise.all([0, 1, 2].map((i) => items.nth(i).boundingBox()));
  expect(Math.abs(a!.y - b!.y)).toBeLessThan(12); // 1.º y 2.º en la misma fila
  expect(b!.x).toBeGreaterThan(a!.x + a!.width / 2); // el 2.º a la derecha del 1.º
  expect(c!.y).toBeGreaterThan(a!.y + a!.height / 2); // el 3.º en la fila de abajo
});
