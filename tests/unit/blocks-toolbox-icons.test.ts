import { describe, expect, it } from 'vitest';
import { spriteToolbox } from '../../src/blocks/sprite/toolbox';
import { htmlToolbox } from '../../src/blocks/html/toolbox';
import { CATEGORY_ICON } from '../../src/blocks/category-icons';

type Cat = { kind: string; cssconfig?: { icon?: string } };

describe('toolbox category icons', () => {
  it('every sprite category declares a kodako icon class', () => {
    for (const c of (spriteToolbox as { contents: Cat[] }).contents) {
      expect(c.cssconfig?.icon).toMatch(/^kodako-cat-icon kodako-cat-icon--[a-z]+$/);
    }
  });

  it('every html category declares a kodako icon class', () => {
    for (const c of (htmlToolbox as { contents: Cat[] }).contents) {
      expect(c.cssconfig?.icon).toMatch(/^kodako-cat-icon kodako-cat-icon--[a-z]+$/);
    }
  });

  it('icon map covers every referenced key with an inline svg data URI', () => {
    const keys = [
      ...(spriteToolbox as { contents: Cat[] }).contents,
      ...(htmlToolbox as { contents: Cat[] }).contents,
    ].map((c) => c.cssconfig!.icon!.split('--')[1]);
    for (const k of keys) {
      expect(CATEGORY_ICON[k as keyof typeof CATEGORY_ICON]).toMatch(/^data:image\/svg\+xml,/);
    }
  });
});
