import { describe, expect, it } from 'vitest';
import {
  createEmptyProject,
  migrate,
  parseProjectText,
  serializeProject,
  validate,
} from '../../src/core/project';

describe('createEmptyProject', () => {
  it('has one default sprite and sprite mode', () => {
    const p = createEmptyProject('Latihan 1');
    expect(p.formatVersion).toBe(1);
    expect(p.meta.name).toBe('Latihan 1');
    expect(p.meta.createdAt).toBe(p.meta.updatedAt);
    expect(p.activeMode).toBe('sprite');
    expect(p.sprite.sprites).toHaveLength(1);
    expect(p.sprite.sprites[0]).toMatchObject({
      x: 0,
      y: 0,
      direction: 90,
      size: 100,
      visible: true,
    });
    expect(p.assets).toEqual({});
  });
});

describe('validate', () => {
  it('accepts a freshly created project', () => {
    const res = validate(createEmptyProject('X'));
    expect(res.ok).toBe(true);
  });
  it('rejects a non-object', () => {
    const res = validate(42);
    expect(res).toEqual({ ok: false, errors: expect.arrayContaining([expect.any(String)]) });
  });
  it('rejects wrong formatVersion', () => {
    const bad = { ...createEmptyProject('X'), formatVersion: 2 };
    const res = validate(bad);
    expect(res.ok).toBe(false);
  });
  it('rejects an unknown activeMode', () => {
    const bad = { ...createEmptyProject('X'), activeMode: 'game' };
    const res = validate(bad);
    expect(res.ok).toBe(false);
  });
  it('rejects a sprite with a non-numeric x', () => {
    const p = createEmptyProject('X');
    (p.sprite.sprites[0] as unknown as { x: unknown }).x = 'left';
    expect(validate(p).ok).toBe(false);
  });
});

describe('migrate', () => {
  it('passes through a v1 project', () => {
    const p = createEmptyProject('X');
    expect(migrate(p)).toBe(p);
  });
  it('throws an Indonesian error for a missing formatVersion', () => {
    expect(() => migrate({})).toThrowError(/format/i);
  });
});

describe('serialize round-trip', () => {
  it('is idempotent', () => {
    const p = createEmptyProject('Roundtrip');
    const once = serializeProject(p);
    const back = parseProjectText(once);
    expect(back.ok).toBe(true);
    if (back.ok) expect(serializeProject(back.project)).toBe(once);
  });
  it('reports an error for invalid JSON', () => {
    const res = parseProjectText('{ not json');
    expect(res.ok).toBe(false);
  });
});
