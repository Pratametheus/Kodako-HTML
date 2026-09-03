import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const html = readFileSync(resolve(__dirname, '../../landing.html'), 'utf8');

describe('landing.html', () => {
  it('is in Indonesian and set to lang="id"', () => {
    expect(html).toContain('lang="id"');
    expect(html).toMatch(/Mulai Buat/);
  });
  it('links the primary CTA to the editor entry', () => {
    expect(html).toMatch(/data-cta-editor[^>]*href="\/index\.html"/);
  });
  it('has a download CTA and a teacher section', () => {
    expect(html).toContain('data-cta-download');
    expect(html).toMatch(/Untuk Guru/i);
  });
  it('has a footer year placeholder and CC0 credit', () => {
    expect(html).toContain('data-year');
    expect(html).toMatch(/CC0/);
  });
});
