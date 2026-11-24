import { test, expect } from '@playwright/test';

test.describe('home', () => {
  test('título, un solo URL y sin redirect', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.request().redirectedFrom()).toBeNull();
    await page.waitForTimeout(500);
    expect(new URL(page.url()).pathname).toBe('/');
    await expect(page).toHaveTitle('Juana Cabrera — Intérprete y compositora');
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  });

  test('secciones visibles', async ({ page }) => {
    await page.goto('/');
    for (const id of ['bio', 'recorrido', 'canciones', 'videos', 'contacto']) {
      const el = page.locator(`#${id}`);
      await el.scrollIntoViewIfNeeded();
      await expect(el).toBeVisible();
    }
    await expect(page.locator('a[href="/palabras"]')).toBeVisible();
  });

  test('el play de Origamix es un link a YouTube, sin iframe', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('iframe')).toHaveCount(0);
    const play = page.getByRole('link', { name: 'Reproducir video de Origamix' });
    await expect(play).toHaveAttribute('href', /youtube\.com\/watch\?v=ELkYVo988S4/);
    await expect(play).toHaveAttribute('target', '_blank');
  });

  test('JSON-LD y Open Graph', async ({ page }) => {
    await page.goto('/');
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.map((b) => JSON.parse(b)['@type']);
    expect(types).toContain('Person');
    expect(types).toContain('VideoObject');
    expect(blocks.join('')).not.toMatch(/birthDate|telephone/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Juana Cabrera/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/brand\/og-image\.png$/);
  });

  test('menú abre y cierra con Escape', async ({ page }) => {
    await page.goto('/');
    const btn = page.locator('#menu-btn');
    await btn.click();
    await expect(page.locator('#menu-nav')).toBeVisible();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(page.locator('#menu-nav')).toBeHidden();
  });

  test('con reduced-motion no hay animaciones', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/');
    const name = await page.locator('.hero__haz').evaluate((e) => getComputedStyle(e).animationName);
    expect(name).toBe('none');
    await ctx.close();
  });

  test('con movimiento normal el haz se anima', async ({ page }) => {
    await page.goto('/');
    const name = await page.locator('.hero__haz').evaluate((e) => getComputedStyle(e).animationName);
    expect(name).not.toBe('none');
  });
});
