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
                  type: 'sprite_repeat',
                  inputs: {
                    TIMES: { shadow: { type: 'math_number', fields: { NUM: 4 } } },
                    DO: {
                      block: {
                        type: 'sprite_turn_right',
                        inputs: { DEG: { shadow: { type: 'math_number', fields: { NUM: 90 } } } },
                        next: {
                          block: {
                            type: 'sprite_move',
                            inputs: {
                              STEPS: { shadow: { type: 'math_number', fields: { NUM: 30 } } },
                            },
                          },
                        },
                      },
                    },
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
  await page.getByRole('button', { name: 'Jalankan' }).click();
  await page.waitForFunction(() => (window as any).__kodakoStage.isRunning() === false, null, {
    timeout: 5000,
  });
  const after = await page.evaluate(() => (window as any).__kodakoStage.spriteState()[0]);
  // 4×(turn 90, move 30) returns to start-ish; assert it actually executed by direction wrapping back
  expect(after).not.toEqual(before);

  await page.getByRole('button', { name: 'Stop' }).click();
  await page.waitForTimeout(500); // debounced autosave
  await page.reload();
  await expect(page.locator('#blocklyDiv')).toBeVisible();
  const blockCount = await page.evaluate(() => {
    const B = (window as any).__kodakoBlockly;
    return B.getMainWorkspace().getAllBlocks(false).length;
  });
  expect(blockCount).toBeGreaterThan(3);
});
