import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
const css = readFileSync(resolve(__dirname, '../../src/landing/landing.css'), 'utf8');

describe('landing page (index.html)', () => {
  it('is Indonesian and branded "Kodako HTML", not "Game HTML"', () => {
    expect(html).toContain('lang="id"');
    expect(html).toContain('<title>Kodako HTML');
    expect(html).not.toMatch(/Game HTML/);
    expect(html).toMatch(/data-hero-title[^>]*>Kodako HTML</);
  });

  it('points both editor CTAs at /editor.html and keeps the download CTA', () => {
    expect(html).toMatch(/data-cta-editor[^>]*href="\/editor\.html"/);
    expect(html).toMatch(/class="btn btn--nav" href="\/editor\.html"/);
    expect(html).toMatch(/data-cta-download[^>]*href="https:\/\/github\.com\/Pratametheus\/Kodako-HTML\/releases"/);
  });

  it('has every section, the demo band, and the year placeholder', () => {
    expect(html).toContain('data-demo');
    expect(html).toContain('id="apa-ini"');
    expect(html).toContain('id="cara-pakai"');
    expect(html).toContain('class="sec sec--modes"');
    expect(html).toContain('id="guru"');
    expect(html).toContain('data-year');
    expect(html).toContain('Jurnal Mengajar');
  });

  it('declares the bundled Fredoka font and a reduced-motion block', () => {
    expect(css).toMatch(/@font-face\s*\{[^}]*Fredoka/);
    expect(css).toContain('fredoka-semibold.woff2');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
