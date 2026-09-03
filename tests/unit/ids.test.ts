import { describe, expect, it } from 'vitest';
import { newId } from '../../src/core/ids';

describe('newId', () => {
  it('prefixes the id', () => {
    expect(newId('sprite')).toMatch(/^sprite_[A-Za-z0-9_-]+$/);
  });
  it('returns a different value each call', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newId('p')));
    expect(ids.size).toBe(1000);
  });
});
