import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BUILTIN_BY_ID,
  BUILTIN_IMAGES,
  loadUploadedImage,
  MAX_UPLOAD_BYTES,
  resolveAssetUrl,
} from '../../src/runtime/asset-library';

describe('built-in image library', () => {
  it('contains 15 unique builtin images', () => {
    expect(BUILTIN_IMAGES).toHaveLength(15);
    const ids = BUILTIN_IMAGES.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith('builtin:'))).toBe(true);
    expect(BUILTIN_BY_ID.get('builtin:cat')?.name).toBe('Kucing');
  });

  it.each([
    ['builtin:robot', 'Robot'],
    ['builtin:cloud', 'Awan'],
    ['builtin:flower', 'Bunga'],
    ['builtin:fish', 'Ikan'],
    ['builtin:rocket', 'Roket'],
    ['builtin:apple', 'Apel'],
  ])('resolves %s', (id, name) => {
    expect(BUILTIN_BY_ID.get(id)?.name).toBe(name);
    expect(resolveAssetUrl(id, {})).toBeTruthy();
  });

  it('keeps every bundled SVG small and free of executable or external content', async () => {
    const names = [
      'cat',
      'ball',
      'arrow',
      'square',
      'star',
      'circle',
      'triangle',
      'bug',
      'heart',
      'robot',
      'cloud',
      'flower',
      'fish',
      'rocket',
      'apple',
    ];
    for (const name of names) {
      const file = resolve(process.cwd(), 'src/runtime/asset-library', `${name}.svg`);
      const source = await readFile(file, 'utf8');
      expect((await stat(file)).size, name).toBeLessThan(3072);
      expect(source, name).toContain('viewBox="0 0 100 100"');
      expect(source.toLowerCase(), name).not.toContain('<script');
      const withoutSvgNamespace = source.replace('http://www.w3.org/2000/svg', '');
      expect(withoutSvgNamespace, name).not.toMatch(/https?:\/\//i);
    }
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
