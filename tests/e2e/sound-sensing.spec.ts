import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/* eslint-disable @typescript-eslint/no-explicit-any -- browser debug hooks intentionally mirror Blockly's untyped E2E boundary */

async function openNewSpriteProject(page: Page): Promise<void> {
  await page.goto('/index.html#/');
  await page.getByRole('button', { name: 'Project Baru' }).click();
  await expect(page).toHaveURL(/#\/editor\/proj_/);
  await expect(page.locator('#blocklyDiv')).toBeVisible();
}

test('edge sensing requests a sound and stops the run', async ({ page }) => {
  await openNewSpriteProject(page);
  await page.getByRole('tab', { name: 'Suara' }).click();
  await page.locator('[data-builtin-sound="builtin:snd-pop"]').click();

  await page.evaluate(() => {
    const B = (window as any).__kodakoBlockly;
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
                  type: 'sprite_set_size',
                  inputs: { PCT: { shadow: { type: 'math_number', fields: { NUM: 100 } } } },
                  next: {
                    block: {
                      type: 'sprite_repeat',
                      inputs: {
                        TIMES: { shadow: { type: 'math_number', fields: { NUM: 20 } } },
                        DO: {
                          block: {
                            type: 'sprite_move',
                            inputs: {
                              STEPS: { shadow: { type: 'math_number', fields: { NUM: 20 } } },
                            },
                            next: {
                              block: {
                                type: 'sprite_if',
                                inputs: {
                                  COND: {
                                    block: {
                                      type: 'sensing_touching',
                                      fields: { TARGET: 'edge' },
                                    },
                                  },
                                  DO: {
                                    block: {
                                      type: 'sound_play',
                                      fields: { SOUND: 'builtin:snd-pop' },
                                      next: {
                                        block: {
                                          type: 'sprite_stop',
                                          fields: { TARGET: 'all' },
                                        },
                                      },
                                    },
                                  },
                                },
                              },
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
      B.getMainWorkspace(),
    );
  });

  await page.getByRole('button', { name: 'Jalankan' }).click();
  await page.waitForFunction(
    () =>
      (window as any).__kodakoStage.lastSound() === 'builtin:snd-pop' &&
      (window as any).__kodakoStage.isRunning() === false,
  );
});

test('ask waits for a submitted answer and the reporter reaches the say bubble', async ({
  page,
}) => {
  await openNewSpriteProject(page);
  await page.evaluate(() => {
    const B = (window as any).__kodakoBlockly;
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
                  type: 'sensing_ask',
                  inputs: { TEXT: { shadow: { type: 'text', fields: { TEXT: 'Nama?' } } } },
                  next: {
                    block: {
                      type: 'sprite_say',
                      inputs: { TEXT: { block: { type: 'sensing_answer' } } },
                    },
                  },
                },
              },
            },
          ],
        },
      },
      B.getMainWorkspace(),
    );
  });

  await page.getByRole('button', { name: 'Jalankan' }).click();
  const answer = page.locator('.sprite-ask input');
  await expect(answer).toBeVisible();
  await answer.fill('Budi');
  await page.locator('.sprite-ask button').click();

  await page.waitForFunction(
    () =>
      (window as any).__kodakoStage.answerValue() === 'Budi' &&
      (window as any).__kodakoStage.spriteState()[0].bubble === 'Budi',
  );
});
