import { expect, test } from '@playwright/test';

test('create, name, reload, still listed', async ({ page }) => {
  await page.goto('/index.html#/');
  await expect(page.getByRole('heading', { name: 'Project Saya' })).toBeVisible();

  await page.getByRole('button', { name: 'Project Baru' }).click();
  await expect(page).toHaveURL(/#\/editor\/proj_/);

  const nameInput = page.locator('[data-name]');
  await nameInput.fill('Latihan Kelas 4');
  await nameInput.blur();

  await page.waitForTimeout(500); // let the debounced autosave flush
  await page.reload();

  // After reload the editor route re-hydrates from localStorage.
  await expect(page.locator('[data-name]')).toHaveValue('Latihan Kelas 4');

  await page.getByRole('button', { name: 'Kembali' }).click();
  await expect(page.getByText('Latihan Kelas 4')).toBeVisible();
});

test('landing page links to the editor', async ({ page }) => {
  await page.goto('/landing.html');
  await expect(page.getByRole('heading', { name: 'Game HTML' })).toBeVisible();
  await page.getByRole('link', { name: 'Mulai Buat' }).click();
  await expect(page).toHaveURL(/index\.html/);
});
