import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BUILTIN_BACKDROPS,
  BUILTIN_BY_ID,
  BUILTIN_COSTUMES,
  BUILTIN_SOUNDS,
  loadUploadedImage,
  loadUploadedSound,
  MAX_SOUND_UPLOAD_BYTES,
  MAX_UPLOAD_BYTES,
  resolveAssetUrl,
} from '../../src/runtime/sprite/assets';

describe('sprite asset catalog', () => {
  it('contains unique builtin costumes and backdrops', () => {
    expect(BUILTIN_COSTUMES).toHaveLength(15);
    expect(BUILTIN_BACKDROPS).toHaveLength(6);
    const ids = [...BUILTIN_COSTUMES, ...BUILTIN_BACKDROPS].map(({ id }) => id);
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
    ['builtin:bg-room', 'Ruangan'],
    ['builtin:bg-space', 'Antariksa'],
  ])('resolves new polished asset %s', (id, name) => {
    expect(BUILTIN_BY_ID.get(id)?.name).toBe(name);
    expect(resolveAssetUrl(id, {})).toBeTruthy();
  });

  it('keeps every bundled SVG small and free of executable or external content', async () => {
    const costumes = [
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
    const backdrops = ['bg-plain', 'bg-sky', 'bg-grid', 'bg-sunset', 'bg-room', 'bg-space'];

    for (const [name, viewBox] of [
      ...costumes.map((name) => [name, '0 0 100 100'] as const),
      ...backdrops.map((name) => [name, '0 0 480 360'] as const),
    ]) {
      const file = resolve(process.cwd(), 'src/runtime/sprite/assets', `${name}.svg`);
      const source = await readFile(file, 'utf8');
      expect((await stat(file)).size, name).toBeLessThan(3072);
      expect(source, name).toContain(`viewBox="${viewBox}"`);
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

  it('contains eight unique builtin sounds that resolve to bundled URLs', () => {
    expect(BUILTIN_SOUNDS).toHaveLength(8);
    const ids = BUILTIN_SOUNDS.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith('builtin:snd-'))).toBe(true);
    expect(BUILTIN_SOUNDS.every(({ kind }) => kind === 'sound')).toBe(true);
    expect(BUILTIN_BY_ID.get('builtin:snd-pop')?.name).toBe('Pop');
    expect(resolveAssetUrl('builtin:snd-pop', {})).toBeTruthy();
  });

  it('rejects oversized and non-audio uploads in Bahasa Indonesia', async () => {
    const oversized = new File([new Uint8Array(MAX_SOUND_UPLOAD_BYTES + 1)], 'besar.wav', {
      type: 'audio/wav',
    });
    const text = new File(['halo'], 'catatan.txt', { type: 'text/plain' });

    await expect(loadUploadedSound(oversized)).rejects.toThrow(/suara terlalu besar/i);
    await expect(loadUploadedSound(text)).rejects.toThrow(/bukan suara/i);
  });

  it('loads a small sound as a data URL', async () => {
    const file = new File([new Uint8Array([82, 73, 70, 70])], 'x.wav', {
      type: 'audio/wav',
    });

    await expect(loadUploadedSound(file)).resolves.toEqual({
      dataUrl: expect.stringMatching(/^data:audio\/wav;base64,/),
      name: 'x.wav',
    });
  });
});
