import { describe, expect, it } from 'vitest';
import { spriteToolbox } from '../../src/blocks/sprite/toolbox';

type Cat = {
  kind: string;
  name?: string;
  categorystyle?: string;
  custom?: string;
  cssconfig?: { icon?: string };
};

const categories = (spriteToolbox as { contents: Cat[] }).contents;

describe('sprite toolbox', () => {
  it('lists categories in Scratch-Indonesia order', () => {
    expect(categories.map((c) => c.name)).toEqual([
      'Gerakan',
      'Tampilan',
      'Suara',
      'Kejadian',
      'Kontrol',
      'Sensor',
      'Operator',
      'Variabel',
    ]);
  });

  it('keeps the motion category style on the renamed Gerakan entry', () => {
    const motion = categories.find((c) => c.name === 'Gerakan');
    expect(motion?.categorystyle).toBe('motion_category');
  });

  it('keeps Variabel as the Blockly VARIABLE custom category', () => {
    const vars = categories.find((c) => c.name === 'Variabel');
    expect(vars?.custom).toBe('VARIABLE');
  });

  it('gives every category a Scratch-style rail icon class', () => {
    for (const category of categories) {
      expect(category.cssconfig?.icon).toMatch(/^kodako-cat-icon kodako-cat-icon--[a-z]+$/);
    }
  });
});
