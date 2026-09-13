import { describe, expect, it } from 'vitest';
import {
  createEmptyProject,
  migrate,
  parseProjectText,
  serializeProject,
  validate,
} from '../../src/core/project';

describe('createEmptyProject', () => {
  it('starts with an empty HTML workspace and no assets', () => {
    const p = createEmptyProject('Latihan 1');
    expect(p.formatVersion).toBe(1);
    expect(p.meta.name).toBe('Latihan 1');
    expect(p.meta.createdAt).toBe(p.meta.updatedAt);
    expect(p.html.workspace).toEqual({});
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
  it('rejects a project missing html.workspace', () => {
    const bad = { ...createEmptyProject('X'), html: {} };
    const res = validate(bad);
    expect(res.ok).toBe(false);
  });
  it('ignores leftover activeMode/sprite fields from a pre-Fase-E project', () => {
    const legacy = {
      ...createEmptyProject('X'),
      activeMode: 'sprite',
      sprite: { stage: { backdrop: null }, sprites: [] },
    };
    expect(validate(legacy).ok).toBe(true);
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
