import { expect, test } from '@playwright/test';

test('the global error boundary paints a Bahasa Indonesia recovery overlay', async ({ page }) => {
  await page.goto('/editor.html#/');
  await page.getByRole('button', { name: 'Project Baru' }).click();
  await expect(page).toHaveURL(/#\/editor\/proj_/);

  await page.evaluate(() => {
    window.dispatchEvent(
      new ErrorEvent('error', { error: new Error('e2e boom'), message: 'e2e boom' }),
    );
  });

  const overlay = page.locator('[data-testid="kodako-error-boundary"]');
  await expect(overlay).toBeVisible();
  await expect(overlay).toContainText('Maaf, ada yang salah');
  await expect(overlay.locator('[data-action="reload"]')).toBeVisible();
  await expect(overlay.locator('[data-action="reload"]')).toContainText('Muat ulang');
});

test('keyboard: Tab reaches Project Baru with a visible focus ring', async ({ page }) => {
  await page.goto('/editor.html#/');
  await expect(page.getByRole('heading', { name: 'Project Saya' })).toBeVisible();

  let landed = false;
  for (let i = 0; i < 6 && !landed; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => ({
      text: document.activeElement?.textContent?.trim(),
      focusVisible: document.activeElement?.matches(':focus-visible') ?? false,
    }));
    if (info.text === 'Project Baru') {
      landed = true;
      expect(info.focusVisible).toBe(true);
    }
  }
  expect(landed).toBe(true);

  await page.getByRole('button', { name: 'Project Baru' }).click();
  await expect(page).toHaveURL(/#\/editor\/proj_/);
});
