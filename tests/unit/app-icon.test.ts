import { describe, expect, it } from 'vitest';
import { renderIconPng } from '../../scripts/gen-app-icon.mjs';

describe('renderIconPng', () => {
  it('produces a valid 1024x1024 PNG deterministically', () => {
    const a = renderIconPng();
    const b = renderIconPng();
    expect(a.equals(b)).toBe(true); // deterministic
    expect(a.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    // IHDR width/height
    expect(a.readUInt32BE(16)).toBe(1024); // width field offset: 8(sig)+4(len)+4(type)+0
    expect(a.readUInt32BE(20)).toBe(1024); // height field offset
    expect(a.length).toBeGreaterThan(1000); // non-trivial content
    expect(a.length).toBeLessThan(200_000); // sane upper bound for a simple flat-colour icon
  });
});
