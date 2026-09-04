import { expect, test } from '@playwright/test';

/* eslint-disable @typescript-eslint/no-explicit-any -- browser debug hooks intentionally mirror Blockly's untyped E2E boundary */

test('the global error boundary paints a Bahasa Indonesia recovery overlay', async ({ page }) => {
  await page.goto('/index.html#/');
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

test('keyboard: Tab reaches Project Baru with a visible focus ring, and mode tabs respond to ArrowRight', async ({
  page,
}) => {
  await page.goto('/index.html#/');
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

  const spriteTab = page.getByRole('tab', { name: 'Mode Sprite' });
  const htmlTab = page.getByRole('tab', { name: 'Mode HTML' });
  await spriteTab.focus();
  await expect(spriteTab).toHaveAttribute('aria-selected', 'true');

  await page.keyboard.press('ArrowRight');
  await expect(htmlTab).toHaveAttribute('aria-selected', 'true');
  await expect(spriteTab).toHaveAttribute('aria-selected', 'false');
});

test('the themed (Zelos) sprite workspace still loads a block and runs it', async ({ page }) => {
  await page.goto('/index.html#/');
  await page.getByRole('button', { name: 'Project Baru' }).click();
  await expect(page).toHaveURL(/#\/editor\/proj_/);

  await expect(page.locator('#blocklyDiv')).toBeVisible();
  await expect(page.locator('.blocklyToolboxDiv')).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();

  await page.evaluate(() => {
    const w = window as unknown as { Blockly?: any };
    const B = w.Blockly ?? (window as any).__kodakoBlockly;
    const ws = B.getMainWorkspace();
    B.serialization.workspaces.load(
      {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'sprite_hat_green_flag',
              x: 20,
              y: 20,
              next: {
                block: {
                  type: 'sprite_move',
                  inputs: {
                    STEPS: { shadow: { type: 'math_number', fields: { NUM: 30 } } },
                  },
                },
              },
            },
          ],
        },
      },
      ws,
    );
  });

  const before = await page.evaluate(() => (window as any).__kodakoStage.spriteState()[0]);
  expect(Math.abs(before.x)).toBeLessThan(1);

  await page.getByRole('button', { name: 'Jalankan' }).click();
  await page.waitForFunction(() => (window as any).__kodakoStage.isRunning() === false, null, {
    timeout: 5000,
  });

  const after = await page.evaluate(() => (window as any).__kodakoStage.spriteState()[0]);
  expect(Math.abs(after.x - 30)).toBeLessThan(1);
});
