import { describe, expect, it } from 'vitest';
import { composeDisplayDocument, wrapBodyInDocument } from '../../src/runtime/html/document';

describe('wrapBodyInDocument', () => {
  it('keeps the CSP + charset meta and auto title when no headHtml', () => {
    const doc = wrapBodyInDocument('Proyek', '<p>x</p>');
    expect(doc).toContain('Content-Security-Policy');
    expect(doc).toContain('<meta charset="utf-8">');
    expect(doc).toContain('<title>Proyek</title>');
    expect(doc).toContain('<body><p>x</p></body>');
  });

  it('uses the block-provided <title> and drops the auto one', () => {
    const doc = wrapBodyInDocument('Proyek', '<p>x</p>', {
      headHtml: '<title>Dari Blok</title>\n',
    });
    expect(doc).toContain('<title>Dari Blok</title>');
    expect(doc).not.toContain('<title>Proyek</title>');
    expect(doc).toContain('Content-Security-Policy');
  });
});

describe('composeDisplayDocument', () => {
  it('produces a multi-line CSP-free full document', () => {
    const out = composeDisplayDocument({
      headHtml: '<title>Halaman Saya</title>\n',
      bodyHtml: '<p>Halo</p>\n',
      fallbackTitle: 'Proyek',
    });
    expect(out).toContain('<!doctype html>');
    expect(out).toContain('<html lang="id">');
    expect(out).toContain('<head>');
    expect(out).toContain('<title>Halaman Saya</title>');
    expect(out).toContain('<body>');
    expect(out).toContain('<p>Halo</p>');
    expect(out).toContain('</html>');
    expect(out).not.toContain('Content-Security-Policy');
    expect(out).not.toContain('<meta charset');
    expect(out.split('\n').length).toBeGreaterThan(5);
  });

  it('falls back to the project title when headHtml is empty', () => {
    const out = composeDisplayDocument({ headHtml: '', bodyHtml: '', fallbackTitle: 'Proyek' });
    expect(out).toContain('<title>Proyek</title>');
  });
});
