import { expect, test } from '@playwright/test';

test('the Bantuan panel opens from the editor header and closes on Escape', async ({ page }) => {
  await page.goto('/index.html#/');
  await page.getByRole('button', { name: 'Project Baru' }).click();
  await expect(page).toHaveURL(/#\/editor\/proj_/);

  await page.getByRole('button', { name: 'Bantuan' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Bantuan' })).toBeVisible();
  await expect(dialog.getByRole('heading', { level: 3 }).first()).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
