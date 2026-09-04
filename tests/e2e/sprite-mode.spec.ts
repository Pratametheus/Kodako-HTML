import { expect, test } from '@playwright/test';

/* eslint-disable @typescript-eslint/no-explicit-any -- browser debug hooks intentionally mirror Blockly's untyped E2E boundary */

test('green flag runs a script and the sprite moves; workspace persists', async ({ page }) => {
  await page.goto('/index.html#/');
  await page.getByRole('button', { name: 'Project Baru' }).click();
  await expect(page).toHaveURL(/#\/editor\/proj_/);

  // Sprite mode is the default (project.activeMode === 'sprite')
  await expect(page.locator('#blocklyDiv')).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();

  // Build a script by dropping blocks from the flyout via Blockly's API
  // (dragging is flaky in CI; use an eval hook that appends a known workspace).
  // Net-displacement script: sprite starts at x 0 dir 90 -> `gerak 50 langkah`
  // ends at x ~= 50, y ~= 0 (unlike a repeat that returns to the origin).
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
                    STEPS: { shadow: { type: 'math_number', fields: { NUM: 50 } } },
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
  // The live debug hook reads runtimeContext, so `after` reflects the executed move.
  expect(Math.abs(after.x - 50)).toBeLessThan(1);
  expect(Math.abs(after.y)).toBeLessThan(1);

  await page.getByRole('button', { name: 'Berhenti' }).click();
  await page.waitForTimeout(500); // debounced autosave
  await page.reload();
  await expect(page.locator('#blocklyDiv')).toBeVisible();
  const reloaded = await page.evaluate(() => {
    const B = (window as any).__kodakoBlockly;
    const blocks = B.getMainWorkspace().getAllBlocks(false);
    return {
      count: blocks.length,
      hasMove: blocks.some((b: any) => b.type === 'sprite_move'),
    };
  });
  expect(reloaded.count).toBeGreaterThanOrEqual(2);
  expect(reloaded.hasMove).toBe(true);
});
