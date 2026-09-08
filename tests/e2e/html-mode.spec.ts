import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

/* eslint-disable @typescript-eslint/no-explicit-any -- browser debug hooks intentionally mirror Blockly's untyped E2E boundary */

test('HTML mode previews, highlights, exports, and preserves a page', async ({ page }) => {
  await page.goto('/editor.html#/');
  await page.getByRole('button', { name: 'Project Baru' }).click();
  await expect(page).toHaveURL(/#\/editor\/proj_/);

  await page.getByRole('tab', { name: 'Mode HTML' }).click();
  await expect(page.locator('#htmlBlocklyDiv')).toBeVisible();
  await expect(page.locator('.html-mode iframe')).toBeVisible();

  await page.evaluate(() => {
    const B = (window as any).__kodakoBlockly;
    B.serialization.workspaces.load(
      {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'html_heading',
              x: 20,
              y: 20,
              fields: { LEVEL: 'h1' },
              inputs: {
                TEXT: { shadow: { type: 'html_text', fields: { VALUE: 'Halo' } } },
              },
              next: {
                block: {
                  type: 'html_style_bold',
                  inputs: {
                    BODY: {
                      block: {
                        type: 'html_paragraph',
                        inputs: {
                          TEXT: {
                            shadow: { type: 'html_text', fields: { VALUE: 'Dunia' } },
                          },
                        },
                      },
                    },
                  },
                  next: {
                    block: {
                      type: 'html_image_url',
                      fields: { URL: 'https://x/y.png', ALT: 'gbr' },
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

  await expect(page.getByRole('button', { name: 'Jalankan' })).toBeVisible();
  await page.getByRole('button', { name: 'Jalankan' }).click();

  await page.waitForFunction(() => {
    const body = (window as any).__kodakoHtml.bodyHtml();
    return (
      body.includes('<h1>Halo</h1>') &&
      body.includes('<p style="font-weight:bold">Dunia</p>') &&
      body.includes('<img')
    );
  });

  await expect
    .poll(() => page.locator('.html-mode iframe').getAttribute('srcdoc'))
    .toContain('<h1>Halo</h1>');
  await expect
    .poll(() => page.locator('.html-mode iframe').getAttribute('srcdoc'))
    .toContain('<p style="font-weight:bold">Dunia</p>');

  await page.getByRole('tab', { name: 'Lihat Kode' }).click();
  await expect(page.locator('[data-panel="code"]')).toContainText('<h1>Halo</h1>');
  await expect(page.locator('[data-panel="code"]')).toContainText(
    '<p style="font-weight:bold">Dunia</p>',
  );

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Ekspor HTML' }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const exported = await readFile(downloadPath!, 'utf8');
  expect(exported).toContain('<!doctype html>');
  expect(exported).toContain('<p style="font-weight:bold">Dunia</p>');

  await page.getByRole('tab', { name: 'Mode Sprite' }).click();
  await expect(page.locator('#blocklyDiv')).toBeVisible();
  await page.evaluate(() => {
    const B = (window as any).__kodakoBlockly;
    B.getMainWorkspace().newBlock('sprite_move');
  });
  await page.getByRole('tab', { name: 'Mode HTML' }).click();
  await expect(page.locator('#htmlBlocklyDiv')).toBeVisible();
  await page.waitForFunction(() => {
    const blocks = (window as any).__kodakoBlockly.getMainWorkspace().getAllBlocks(false);
    return (
      blocks.some((block: any) => block.type === 'html_heading') &&
      blocks.some((block: any) => block.type === 'html_paragraph')
    );
  });
  await page.getByRole('tab', { name: 'Mode Sprite' }).click();
  await expect(page.locator('#blocklyDiv')).toBeVisible();
  await page.waitForFunction(() => {
    const blocks = (window as any).__kodakoBlockly.getMainWorkspace().getAllBlocks(false);
    return blocks.some((block: any) => block.type === 'sprite_move');
  });
});

test('document skeleton blocks drive the head + the code panel shows the full page', async ({
  page,
}) => {
  await page.goto('/editor.html#/');
  await page.getByRole('button', { name: 'Project Baru' }).click();
  await page.getByRole('tab', { name: 'Mode HTML' }).click();
  await expect(page.locator('#htmlBlocklyDiv')).toBeVisible();

  await page.evaluate(() => {
    const w = window as unknown as { Blockly?: any };
    const B = w.Blockly ?? (window as any).__kodakoBlockly;
    B.serialization.workspaces.load(
      {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'html_document',
              x: 20,
              y: 20,
              inputs: {
                CONTENT: {
                  block: {
                    type: 'html_head',
                    inputs: {
                      CONTENT: {
                        block: {
                          type: 'html_title',
                          inputs: {
                            TEXT: {
                              shadow: { type: 'html_text', fields: { VALUE: 'Halaman Saya' } },
                            },
                          },
                        },
                      },
                    },
                    next: {
                      block: {
                        type: 'html_body',
                        inputs: {
                          CONTENT: {
                            block: {
                              type: 'html_paragraph',
                              inputs: {
                                TEXT: {
                                  shadow: { type: 'html_text', fields: { VALUE: 'Halo dunia' } },
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
  await page.getByRole('tab', { name: 'Lihat Kode' }).click();

  const code = page.locator('.html-mode__code, [class*="code"]').first();
  await expect(code).toContainText('<!doctype html>');
  await expect(code).toContainText('<title>Halaman Saya</title>');
  await expect(code).toContainText('<body>');
  await expect(code).toContainText('Halo dunia');
  await expect(code).not.toContainText('Content-Security-Policy');

  // "Info blok" strip: starts as a hint, shows the clicked block's tooltip.
  const info = page.locator('[data-block-info]');
  await expect(info).toHaveText('Klik sebuah blok untuk melihat penjelasannya.');
  // Click near the top-left of the outer block: the bounding box of a tall nested
  // stack has its centre over a gap between child blocks, where the actionability
  // check never resolves in headless CI. A fixed offset lands on the block header.
  await page
    .locator('.blocklyDraggable')
    .first()
    .click({ position: { x: 15, y: 15 }, force: true });
  await expect(info).not.toHaveText('Klik sebuah blok untuk melihat penjelasannya.');
  await expect(info).toContainText('<');
});
