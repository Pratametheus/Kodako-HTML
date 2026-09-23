import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

/* eslint-disable @typescript-eslint/no-explicit-any -- browser debug hooks intentionally mirror Blockly's untyped E2E boundary */

test('HTML mode previews, highlights, exports, and preserves a page', async ({ page }) => {
  await page.goto('/editor.html#/');
  await page.getByRole('button', { name: 'Project Baru' }).click();
  await expect(page).toHaveURL(/#\/editor\/proj_/);

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

  // Bug fix (Fase D): the empty-canvas hint must disappear once blocks exist.
  await expect(page.locator('.html-mode__hint')).toBeHidden();

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
});

test('document skeleton blocks drive the head + the code panel shows the full page', async ({
  page,
}) => {
  await page.goto('/editor.html#/');
  await page.getByRole('button', { name: 'Project Baru' }).click();
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

  await expect(page.locator('[data-preview-tab]')).toHaveText('Halaman Saya');
  await expect(page.locator('[data-preview-url]')).toHaveText('halaman-saya.html');

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

test('flex row block lays children out with display:flex end to end', async ({ page }) => {
  await page.goto('/editor.html#/');
  await page.getByRole('button', { name: 'Project Baru' }).click();
  await expect(page.locator('#htmlBlocklyDiv')).toBeVisible();

  await page.evaluate(() => {
    const B = (window as any).__kodakoBlockly;
    B.serialization.workspaces.load(
      {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'html_row',
              x: 20,
              y: 20,
              fields: { JUSTIFY: 'center' },
              inputs: {
                BODY: {
                  block: {
                    type: 'html_paragraph',
                    inputs: {
                      TEXT: { shadow: { type: 'html_text', fields: { VALUE: 'Kotak 1' } } },
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
  await expect(code).toContainText('display:flex');
  await expect(code).toContainText('justify-content:center');
  await expect(code).toContainText('Kotak 1');
});

test('table blocks render a bordered table end to end', async ({ page }) => {
  await page.goto('/editor.html#/');
  await page.getByRole('button', { name: 'Project Baru' }).click();
  await expect(page.locator('#htmlBlocklyDiv')).toBeVisible();

  await page.evaluate(() => {
    const B = (window as any).__kodakoBlockly;
    B.serialization.workspaces.load(
      {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'html_table',
              x: 20,
              y: 20,
              inputs: {
                ROWS: {
                  block: {
                    type: 'html_table_row',
                    inputs: {
                      CELLS: {
                        block: {
                          type: 'html_table_cell',
                          inputs: {
                            TEXT: { shadow: { type: 'html_text', fields: { VALUE: 'Senin' } } },
                          },
                          next: {
                            block: {
                              type: 'html_table_cell',
                              inputs: {
                                TEXT: {
                                  shadow: { type: 'html_text', fields: { VALUE: 'Selasa' } },
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
  await expect(code).toContainText(
    '<table style="border-collapse:collapse;border:1px solid #000000">',
  );
  await expect(code).toContainText('<td style="border:1px solid #000000">Senin</td>');
  await expect(code).toContainText('<td style="border:1px solid #000000">Selasa</td>');
});

test('quick-win blocks (ol, header/footer, image size, spacing styles) render end to end', async ({
  page,
}) => {
  await page.goto('/editor.html#/');
  await page.getByRole('button', { name: 'Project Baru' }).click();
  await expect(page.locator('#htmlBlocklyDiv')).toBeVisible();

  await page.evaluate(() => {
    const B = (window as any).__kodakoBlockly;
    B.serialization.workspaces.load(
      {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'html_header',
              x: 20,
              y: 20,
              inputs: {
                BODY: {
                  block: {
                    type: 'html_heading',
                    fields: { LEVEL: 'h1' },
                    inputs: { TEXT: { shadow: { type: 'html_text', fields: { VALUE: 'Judul' } } } },
                  },
                },
              },
              next: {
                block: {
                  type: 'html_list_ordered',
                  inputs: {
                    ITEMS: {
                      block: {
                        type: 'html_list_item',
                        inputs: {
                          TEXT: { shadow: { type: 'html_text', fields: { VALUE: 'Langkah 1' } } },
                        },
                      },
                    },
                  },
                  next: {
                    block: {
                      type: 'html_style_padding',
                      fields: { SIZE: '32px' },
                      inputs: {
                        BODY: {
                          block: {
                            type: 'html_footer',
                            inputs: {
                              BODY: {
                                block: {
                                  type: 'html_paragraph',
                                  inputs: {
                                    TEXT: {
                                      shadow: { type: 'html_text', fields: { VALUE: 'Hak cipta' } },
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
      (window as any).__kodakoBlockly.getMainWorkspace(),
    );
  });

  await page.getByRole('button', { name: 'Jalankan' }).click();
  await page.getByRole('tab', { name: 'Lihat Kode' }).click();
  const code = page.locator('.html-mode__code, [class*="code"]').first();
  await expect(code).toContainText('<header>');
  await expect(code).toContainText('<ol>');
  await expect(code).toContainText('<li>Langkah 1</li>');
  await expect(code).toContainText('<footer style="padding:32px">');
});

test('table border, numeric image width, ordered-list type/start, and link target render end to end', async ({
  page,
}) => {
  await page.goto('/editor.html#/');
  await page.getByRole('button', { name: 'Project Baru' }).click();
  await expect(page.locator('#htmlBlocklyDiv')).toBeVisible();

  await page.evaluate(() => {
    const B = (window as any).__kodakoBlockly;
    B.serialization.workspaces.load(
      {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'html_table',
              x: 20,
              y: 20,
              fields: { BORDER_WIDTH: '2px', BORDER_STYLE: 'dashed', BORDER_COLOR: '#1e88e5' },
              inputs: {
                ROWS: {
                  block: {
                    type: 'html_table_row',
                    inputs: {
                      CELLS: {
                        block: {
                          type: 'html_table_cell',
                          inputs: {
                            TEXT: { shadow: { type: 'html_text', fields: { VALUE: 'A' } } },
                          },
                        },
                      },
                    },
                  },
                },
              },
              next: {
                block: {
                  type: 'html_image_url',
                  fields: { URL: 'https://x/y.png', ALT: 'gbr', WIDTH: 300 },
                  next: {
                    block: {
                      type: 'html_list_ordered',
                      fields: { TYPE: 'A', START: 5 },
                      inputs: {
                        ITEMS: {
                          block: {
                            type: 'html_list_item',
                            inputs: {
                              TEXT: { shadow: { type: 'html_text', fields: { VALUE: 'Langkah' } } },
                            },
                          },
                        },
                      },
                      next: {
                        block: {
                          type: 'html_link',
                          fields: { URL: 'https://x', LABEL: 'Buka', NEW_TAB: true },
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
  await expect(code).toContainText('<td style="border:2px dashed #1e88e5">A</td>');
  await expect(code).toContainText('width="300"');
  await expect(code).toContainText('<ol type="A" start="5">');
  await expect(code).toContainText('target="_blank"');
});
