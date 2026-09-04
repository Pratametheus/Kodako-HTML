import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

/* eslint-disable @typescript-eslint/no-explicit-any -- browser debug hooks intentionally mirror Blockly's untyped E2E boundary */

test('HTML mode previews, highlights, exports, and preserves a page', async ({ page }) => {
  await page.goto('/index.html#/');
  await page.getByRole('button', { name: 'Project Baru' }).click();
  await expect(page).toHaveURL(/#\/editor\/proj_/);

  await page.getByRole('button', { name: 'Mode HTML' }).click();
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
              type: 'html_page',
              x: 20,
              y: 20,
              inputs: {
                BODY: {
                  block: {
                    type: 'html_heading',
                    fields: { LEVEL: 'h1' },
                    inputs: {
                      TEXT: { shadow: { type: 'html_text', fields: { VALUE: 'Halo' } } },
                    },
                    next: {
                      block: {
                        type: 'html_paragraph',
                        inputs: {
                          TEXT: { shadow: { type: 'html_text', fields: { VALUE: 'Dunia' } } },
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
                },
              },
            },
          ],
        },
      },
      B.getMainWorkspace(),
    );
  });

  await page.waitForFunction(() => {
    const body = (window as any).__kodakoHtml.bodyHtml();
    return body.includes('<h1>Halo</h1>') && body.includes('<p>Dunia</p>') && body.includes('<img');
  });

  await expect
    .poll(() => page.locator('.html-mode iframe').getAttribute('srcdoc'))
    .toContain('<h1>Halo</h1>');

  await page.getByRole('tab', { name: 'Lihat Kode' }).click();
  await expect(page.locator('[data-panel="code"]')).toContainText('<h1>Halo</h1>');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Ekspor HTML' }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const exported = await readFile(downloadPath!, 'utf8');
  expect(exported).toContain('<!doctype html>');
  expect(exported).toContain('<p>Dunia</p>');

  await page.getByRole('button', { name: 'Mode Sprite' }).click();
  await expect(page.locator('#blocklyDiv')).toBeVisible();
  await page.getByRole('button', { name: 'Mode HTML' }).click();
  await expect(page.locator('#htmlBlocklyDiv')).toBeVisible();
  await page.waitForFunction(() => {
    const blocks = (window as any).__kodakoBlockly.getMainWorkspace().getAllBlocks(false);
    return (
      blocks.some((block: any) => block.type === 'html_heading') &&
      blocks.some((block: any) => block.type === 'html_paragraph')
    );
  });
});
