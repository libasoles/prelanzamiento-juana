import { expect, test, type Page } from '@playwright/test';

const KEY = 'juana.session';
const b64url = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const SESSION = `${b64url({ email: 'a@b.c', exp: Date.now() + 86_400_000 })}.sig`;

type Sent = { auth: string | undefined; body: unknown };

/** Entra con sesión y simula POST /messages del Worker. Devuelve lo que llegó. */
async function setup(page: Page, reply: { status: number; body: object }) {
  const sent: Sent[] = [];
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [KEY, SESSION]);
  await page.route('**/messages', async (route) => {
    const req = route.request();
    sent.push({ auth: await req.headerValue('authorization') ?? undefined, body: req.postDataJSON() });
    await route.fulfill({ status: reply.status, contentType: 'application/json', body: JSON.stringify(reply.body) });
  });
  await page.goto('/palabras');
  await expect(page.locator('#msgForm')).toBeAttached();
  return sent;
}

const submit = (page: Page) => page.locator('#msgForm .mensaje-btn');
const thanks = (page: Page) => page.locator('#msgThanks');
const error = (page: Page) => page.locator('#msgError');

test('envía el mensaje con la sesión y muestra el agradecimiento', async ({ page }) => {
  const sent = await setup(page, { status: 200, body: { ok: true } });
  await page.locator('#msg').scrollIntoViewIfNeeded();
  await page.fill('#msg', 'Me hizo acordar a mi abuela');
  await submit(page).click();

  await expect(thanks(page)).toBeVisible();
  await expect(error(page)).toBeHidden();
  expect(sent).toEqual([{ auth: `Bearer ${SESSION}`, body: { body: 'Me hizo acordar a mi abuela' } }]);
});

test('con el mensaje vacío no envía nada ni agradece', async ({ page }) => {
  const sent = await setup(page, { status: 200, body: { ok: true } });
  await page.fill('#msg', '   ');
  await submit(page).click();

  await expect(thanks(page)).toBeHidden();
  expect(sent).toEqual([]);
});

const failures = [
  ['falla del servidor', 500, { error: 'internal_error' }, /no pudimos guardar tu mensaje/i],
  ['demasiados mensajes', 429, { error: 'too_many_messages' }, /3 mensajes hoy/i],
  ['sesión vencida', 401, { error: 'invalid_session' }, /sesión venció/i],
] as const;

for (const [name, status, body, text] of failures) {
  test(`${name}: no agradece, avisa, conserva el texto y deja reintentar`, async ({ page }) => {
    await setup(page, { status, body });
    await page.fill('#msg', 'Hola Juana');
    await submit(page).click();

    await expect(error(page)).toHaveText(text);
    await expect(thanks(page)).toBeHidden();
    await expect(page.locator('#msg')).toHaveValue('Hola Juana');
    await expect(submit(page)).toBeEnabled();
  });
}

test('reintenta ante un 5xx y agradece si el reintento sale bien', async ({ page }) => {
  let calls = 0;
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [KEY, SESSION]);
  await page.route('**/messages', (route) => {
    calls++;
    return calls < 3
      ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"internal_error"}' })
      : route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  await page.goto('/palabras');
  await expect(page.locator('#msgForm')).toBeAttached();
  await page.fill('#msg', 'Hola Juana');
  await submit(page).click();

  await expect(thanks(page)).toBeVisible();
  expect(calls).toBe(3);
});

test('si el 5xx persiste hace 1 intento + 3 reintentos y avisa', async ({ page }) => {
  const sent = await setup(page, { status: 500, body: { error: 'internal_error' } });
  await page.fill('#msg', 'Hola Juana');
  await submit(page).click();

  await expect(error(page)).toHaveText(/no pudimos guardar tu mensaje/i);
  expect(sent).toHaveLength(4);
});

test('un 4xx no se reintenta', async ({ page }) => {
  const sent = await setup(page, { status: 429, body: { error: 'too_many_messages' } });
  await page.fill('#msg', 'Hola Juana');
  await submit(page).click();

  await expect(error(page)).toHaveText(/3 mensajes hoy/i);
  expect(sent).toHaveLength(1);
});

test('mientras envía: botones deshabilitados, dicen «Enviando» y no cambian de tamaño', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [KEY, SESSION]);
  await page.route('**/messages', async (route) => {
    await gate;
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  await page.goto('/palabras');
  const text = page.locator('#msgForm .mensaje-btn');
  const icon = page.locator('#msgForm .enviar-ico');
  const size = async (l: typeof text) => { const b = await l.boundingBox(); return b && { w: Math.round(b.width), h: Math.round(b.height) }; };
  const before = [await size(text), await size(icon)];

  await page.fill('#msg', 'Hola Juana');
  await submit(page).click();

  await expect(text).toBeDisabled();
  await expect(icon).toBeDisabled();
  await expect(text).toHaveAccessibleName('Enviando');
  await expect(text.locator('.btn-sending')).toBeVisible();
  await expect(text.locator('.btn-label')).toBeHidden();
  expect([await size(text), await size(icon)]).toEqual(before);

  release();
  await expect(thanks(page)).toBeVisible();
  await expect(text.locator('.btn-sending')).toBeHidden();
});
