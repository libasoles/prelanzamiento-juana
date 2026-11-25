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
  ['falla del servidor', 500, { error: 'interno' }, /no pudimos guardar tu mensaje/i],
  ['demasiados mensajes', 429, { error: 'demasiados_mensajes' }, /muchos mensajes/i],
  ['sesión vencida', 401, { error: 'sesion_invalida' }, /sesión venció/i],
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
