import { expect, test, type Page } from '@playwright/test';

const KEY = 'juana.session';
const b64url = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const session = (exp: number) => `${b64url({ email: 'a@b.c', exp })}.sig`;
const future = () => Date.now() + 86_400_000;

async function setSession(page: Page, token: string) {
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [KEY, token]);
}

async function mockAuth(page: Page, opts: { request?: { status: number; body: object }; verify?: { status: number; body: object } } = {}) {
  // Turnstile de mentira: el build de producción lo carga; acá entrega siempre el token 'tok-test'.
  await page.route('https://challenges.cloudflare.com/**', (r) =>
    r.fulfill({
      contentType: 'text/javascript',
      body: `window.turnstile = { render: (el, o) => { setTimeout(() => o.callback('tok-test'), 0); return 'w1'; }, reset: () => {} };`,
    }),
  );
  await page.route('**/auth/request', (r) => {
    requests.push(r.request().postDataJSON());
    return r.fulfill({ status: opts.request?.status ?? 200, contentType: 'application/json', body: JSON.stringify(opts.request?.body ?? { ok: true }) });
  });
  await page.route('**/auth/verify', (r) =>
    r.fulfill({
      status: opts.verify?.status ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(opts.verify?.body ?? { session: session(future()) }),
    }),
  );
}

/** Cuerpos de los POST /auth/request del test en curso. */
const requests: Array<Record<string, unknown>> = [];
test.beforeEach(() => void (requests.length = 0));

const lock = (page: Page) => page.locator('#lockForm');
const player = (page: Page) => page.locator('#canciones');

test('sin sesión: se ve la lock y no el reproductor', async ({ page }) => {
  await page.goto('/palabras');
  await expect(lock(page)).toBeVisible();
  await expect(player(page)).toBeHidden();
  expect(await page.locator('html').getAttribute('data-auth')).toBe('out');
});

test('código inválido muestra error', async ({ page }) => {
  await mockAuth(page, { request: { status: 403, body: { error: 'invalid_code' } } });
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

test('el pedido del link lleva el token de Turnstile', async ({ page }) => {
  await mockAuth(page);
  await page.goto('/palabras');
  await page.fill('#codigo', 'ABC');
  await page.fill('#email', 'a@b.c');
  await page.click('.lock-submit');
  await expect(page.locator('#lockStatus')).toHaveText(/te mandamos un link/i);
  expect(requests).toHaveLength(1);
  expect(requests[0].turnstile).toBe('tok-test');
});

for (const [error, texto] of [
  ['invalid_captcha', /verificar que sos una persona/i],
  ['too_many_requests', /muchos links seguidos/i],
] as const) {
  test(`${error} muestra su mensaje`, async ({ page }) => {
    await mockAuth(page, { request: { status: 429, body: { error } } });
    await page.goto('/palabras');
    await page.fill('#codigo', 'ABC');
    await page.fill('#email', 'a@b.c');
    await page.click('.lock-submit');
    await expect(page.locator('#lockStatus')).toHaveText(texto);
  });
}

test('?token=ok canjea, guarda sesión, limpia la URL y muestra el reproductor', async ({ page }) => {
  await mockAuth(page);
  await page.goto('/palabras?token=ok');
  await expect(player(page)).toBeVisible();
  await expect(lock(page)).toBeHidden();
  await expect(page).toHaveURL(/\/palabras$/);
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBeTruthy();
  await expect(page.locator('.js-tracks li')).toHaveCount(8);
});

test('?token mientras se confirma el login: sólo el caballito', async ({ page }) => {
  await mockAuth(page);
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.route('**/auth/verify', async (r) => {
    await gate;
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ session: session(future()) }) });
  });
  await page.goto('/palabras?token=ok');
  await expect(page.locator('.pl-loading .deco-horse')).toBeVisible();
  await expect(lock(page)).toBeHidden();
  await expect(player(page)).toBeHidden();
  release();
  await expect(player(page)).toBeVisible();
  await expect(page.locator('.pl-loading')).toBeHidden();
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
  await mockAuth(page, { verify: { status: 401, body: { error: 'link_expired_or_used' } } });
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
