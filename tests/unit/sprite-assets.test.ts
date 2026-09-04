import { describe, expect, it } from 'vitest';
import {
  BUILTIN_BACKDROPS,
  BUILTIN_BY_ID,
  BUILTIN_COSTUMES,
  loadUploadedImage,
  MAX_UPLOAD_BYTES,
  resolveAssetUrl,
} from '../../src/runtime/sprite/assets';

describe('sprite asset catalog', () => {
  it('contains unique builtin costumes and backdrops', () => {
    expect(BUILTIN_COSTUMES).toHaveLength(9);
    expect(BUILTIN_BACKDROPS).toHaveLength(4);
    const ids = [...BUILTIN_COSTUMES, ...BUILTIN_BACKDROPS].map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith('builtin:'))).toBe(true);
    expect(BUILTIN_BY_ID.get('builtin:cat')?.name).toBe('Kucing');
  });

  it('rejects oversized and non-image uploads in Bahasa Indonesia', async () => {
    const oversized = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], 'besar.png', {
      type: 'image/png',
    });
    const text = new File(['halo'], 'catatan.txt', { type: 'text/plain' });

    await expect(loadUploadedImage(oversized)).rejects.toThrow(/terlalu besar/i);
    await expect(loadUploadedImage(text)).rejects.toThrow(/bukan gambar/i);
  });

  it('loads a small image as a data URL', async () => {
    const file = new File([new Uint8Array([137, 80, 78, 71])], 'x.png', {
      type: 'image/png',
    });

    await expect(loadUploadedImage(file)).resolves.toEqual({
      dataUrl: expect.stringMatching(/^data:image\/png;base64,/),
      name: 'x.png',
    });
  });

  it('resolves builtin, embedded, and missing asset URLs', () => {
    expect(resolveAssetUrl('builtin:cat', {})).toBeTruthy();
    expect(resolveAssetUrl('x', { x: { ref: 'data:image/png;base64,eA==' } })).toBe(
      'data:image/png;base64,eA==',
    );
    expect(resolveAssetUrl('missing', {})).toBeNull();
  });
});
