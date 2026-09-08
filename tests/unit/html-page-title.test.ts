import { describe, expect, it } from 'vitest';
import { extractTitle, slugifyTitle } from '../../src/runtime/html/page-title';

describe('extractTitle', () => {
  it('reads the text of a <title> tag', () => {
    expect(extractTitle('<title>Halaman Saya</title>', 'x')).toBe('Halaman Saya');
  });
  it('trims surrounding whitespace and newlines', () => {
    expect(extractTitle('<title>\n  Halo  \n</title>', 'x')).toBe('Halo');
  });
  it('tolerates attributes on the tag', () => {
    expect(extractTitle('<title data-x="1">Judul</title>', 'x')).toBe('Judul');
  });
  it('decodes the basic HTML entities', () => {
    expect(extractTitle('<title>Aku &amp; Kamu</title>', 'x')).toBe('Aku & Kamu');
  });
  it('falls back when there is no <title>', () => {
    expect(extractTitle('<meta charset="utf-8">', 'Tanpa Judul')).toBe('Tanpa Judul');
  });
  it('falls back when the <title> is empty', () => {
    expect(extractTitle('<title></title>', 'Tanpa Judul')).toBe('Tanpa Judul');
  });
});

describe('slugifyTitle', () => {
  it('lowercases and hyphenates spaces, always ending in .html', () => {
    expect(slugifyTitle('Halaman Saya')).toBe('halaman-saya.html');
  });
  it('drops punctuation and collapses repeats', () => {
    expect(slugifyTitle('Aku & Kamu!!!  (v2)')).toBe('aku-kamu-v2.html');
  });
  it('returns halaman.html for an empty title', () => {
    expect(slugifyTitle('   ')).toBe('halaman.html');
  });
  it('truncates very long titles to 40 chars of slug', () => {
    const slug = slugifyTitle('a'.repeat(120));
    expect(slug).toBe(`${'a'.repeat(40)}.html`);
  });
});
