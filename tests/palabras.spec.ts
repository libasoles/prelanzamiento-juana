import { expect, test, type Page } from '@playwright/test';

const KEY = 'juana.session';
const b64url = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const session = (exp: number) => `${b64url({ email: 'a@b.c', exp })}.sig`;
const future = () => Date.now() + 86_400_000;

async function setSession(page: Page, token: string) {
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [KEY, token]);
}

async function mockAuth(page: Page, opts: { request?: { status: number; body: object }; verify?: { status: number; body: object } } = {}) {
  await page.route('**/auth/request', (r) =>
    r.fulfill({ status: opts.request?.status ?? 200, contentType: 'application/json', body: JSON.stringify(opts.request?.body ?? { ok: true }) }),
  );
  await page.route('**/auth/verify', (r) =>
    r.fulfill({
      status: opts.verify?.status ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(opts.verify?.body ?? { session: session(future()) }),
    }),
  );
}

const lock = (page: Page) => page.locator('#lockForm');
const player = (page: Page) => page.locator('#canciones');

test('sin sesión: se ve la lock y no el reproductor', async ({ page }) => {
  await page.goto('/palabras');
  await expect(lock(page)).toBeVisible();
  await expect(player(page)).toBeHidden();
  expect(await page.locator('html').getAttribute('data-auth')).toBe('out');
});

test('código inválido muestra error', async ({ page }) => {
  await mockAuth(page, { request: { status: 403, body: { error: 'codigo_invalido' } } });
  await page.goto('/palabras');
  await page.fill('#codigo', 'XXXX');
  await page.fill('#email', 'a@b.c');
  await page.click('.lock-submit');
  await expect(page.locator('#lockStatus')).toHaveText(/código no es válido/i);
});

test('envío ok muestra «te mandamos un link»', async ({ page }) => {
  await mockAuth(page);
  await page.goto('/palabras');
  await page.fill('#codigo', 'ABC');
  await page.fill('#email', 'a@b.c');
  await page.click('.lock-submit');
  await expect(page.locator('#lockStatus')).toHaveText(/te mandamos un link/i);
});

test('?token=ok canjea, guarda sesión, limpia la URL y muestra el reproductor', async ({ page }) => {
  await mockAuth(page);
  await page.goto('/palabras?token=ok');
  await expect(player(page)).toBeVisible();
  await expect(lock(page)).toBeHidden();
  await expect(page).toHaveURL(/\/palabras$/);
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBeTruthy();
  await expect(page.locator('.js-tracks li')).toHaveCount(8);
});

test('recargar con sesión muestra el reproductor sin lock', async ({ page }) => {
  await setSession(page, session(future()));
  await page.goto('/palabras');
  expect(await page.locator('html').getAttribute('data-auth')).toBe('in');
  await expect(player(page)).toBeVisible();
  await expect(lock(page)).toBeHidden();
  await page.reload();
  await expect(player(page)).toBeVisible();
  await expect(lock(page)).toBeHidden();
});

test('token inválido vuelve a la lock con error', async ({ page }) => {
  await mockAuth(page, { verify: { status: 401, body: { error: 'link_vencido_o_usado' } } });
  await page.goto('/palabras?token=malo');
  await expect(lock(page)).toBeVisible();
  await expect(page.locator('#lockStatus')).toHaveText(/link vencido o usado/i);
  await expect(page).toHaveURL(/\/palabras$/);
  await expect(player(page)).toBeHidden();
});

test('sesión vencida muestra la lock', async ({ page }) => {
  await setSession(page, session(Date.now() - 1000));
  await page.goto('/palabras');
  await expect(lock(page)).toBeVisible();
  await expect(player(page)).toBeHidden();
});

test('la página es noindex', async ({ page }) => {
  await page.goto('/palabras');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('la misma URL sirve mobile y desktop, sin redirects', async ({ page }) => {
  await page.goto('/palabras');
  await expect(page).toHaveURL(/\/palabras$/);
  await expect(lock(page)).toBeVisible();
});
