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
    expect(top.map((b: { type: string }) => b.type)).toEqual(['html_paragraph', 'html_hr']);
    expect(top[0]).toMatchObject({ x: 20, y: 20 });
    expect(migrateHtmlWorkspaceJson(out)).toEqual(out); // idempotent
  });

  it('returns unrelated json untouched', () => {
    const j = { blocks: { languageVersion: 0, blocks: [{ type: 'html_hr' }] } };
    expect(migrateHtmlWorkspaceJson(j)).toEqual(j);
    expect(migrateHtmlWorkspaceJson({})).toEqual({});
  });
});
