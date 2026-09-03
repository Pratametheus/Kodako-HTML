import { afterEach, describe, expect, it } from 'vitest';
import { getStorage } from '../../src/core/storage';
import { WebStorage } from '../../src/core/web-storage';

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
});

describe('getStorage', () => {
  it('returns WebStorage in a plain browser', () => {
    expect(getStorage()).toBeInstanceOf(WebStorage);
  });

  it('returns a non-WebStorage implementation under Tauri', async () => {
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    const s = getStorage();
    expect(s).not.toBeInstanceOf(WebStorage);
    expect(typeof s.exportToFile).toBe('function');
  });
});
