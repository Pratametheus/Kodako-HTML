import { describe, expect, it } from 'vitest';
import { migrateHtmlWorkspaceJson } from '../../src/core/html-project';

describe('migrateHtmlWorkspaceJson', () => {
  it('lifts children out of a legacy html_page block', () => {
    const legacy = {
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
                  type: 'html_paragraph',
                  inputs: { TEXT: { shadow: { type: 'html_text', fields: { VALUE: 'Halo' } } } },
                  next: { block: { type: 'html_hr' } },
                },
              },
            },
          },
        ],
      },
    };
    const out = migrateHtmlWorkspaceJson(legacy) as typeof legacy;
    const top = out.blocks.blocks;
    // one top-level entry: the head block keeps its whole `.next` chain
    expect(top).toHaveLength(1);
    expect(top[0]).toMatchObject({
      type: 'html_paragraph',
      x: 20,
      y: 20,
      next: { block: { type: 'html_hr' } },
    });
    expect(migrateHtmlWorkspaceJson(out)).toEqual(out); // idempotent
  });

  it('returns unrelated json untouched', () => {
    const j = { blocks: { languageVersion: 0, blocks: [{ type: 'html_hr' }] } };
    expect(migrateHtmlWorkspaceJson(j)).toEqual(j);
    expect(migrateHtmlWorkspaceJson({})).toEqual({});
  });
});

describe('migrateHtmlWorkspaceJson — legacy image WIDTH', () => {
  it('converts each legacy WIDTH string to its numeric equivalent', () => {
    const legacy = {
      blocks: {
        languageVersion: 0,
        blocks: [
          { type: 'html_image_asset', fields: { ASSET: 'img_1', ALT: '', WIDTH: '' } },
          { type: 'html_image_url', fields: { URL: 'https://x/y.png', ALT: '', WIDTH: '240px' } },
        ],
      },
    };
    const out = migrateHtmlWorkspaceJson(legacy) as typeof legacy;
    expect(out.blocks.blocks[0]!.fields.WIDTH).toBe(0);
    expect(out.blocks.blocks[1]!.fields.WIDTH).toBe(240);
  });

  it('migrates an image nested inside other blocks, not just top-level', () => {
    const legacy = {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'html_section',
            inputs: {
              BODY: {
                block: {
                  type: 'html_image_url',
                  fields: { URL: 'https://x/y.png', ALT: '', WIDTH: '120px' },
                  next: {
                    block: {
                      type: 'html_image_asset',
                      fields: { ASSET: 'img_2', ALT: '', WIDTH: '480px' },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    };
    const out = migrateHtmlWorkspaceJson(legacy) as typeof legacy;
    const nested = out.blocks.blocks[0]!.inputs.BODY.block;
    expect(nested.fields.WIDTH).toBe(120);
    expect(nested.next.block.fields.WIDTH).toBe(480);
  });

  it('leaves an already-numeric WIDTH untouched', () => {
    const modern = {
      blocks: {
        languageVersion: 0,
        blocks: [
          { type: 'html_image_url', fields: { URL: 'https://x/y.png', ALT: '', WIDTH: 200 } },
        ],
      },
    };
    expect(migrateHtmlWorkspaceJson(modern)).toEqual(modern);
  });

  it('is idempotent', () => {
    const legacy = {
      blocks: {
        languageVersion: 0,
        blocks: [{ type: 'html_image_asset', fields: { ASSET: 'img_1', ALT: '', WIDTH: '240px' } }],
      },
    };
    const once = migrateHtmlWorkspaceJson(legacy);
    expect(migrateHtmlWorkspaceJson(once)).toEqual(once);
  });
});
