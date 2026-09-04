import { afterEach, describe, expect, it, vi } from 'vitest';
import { wrapBodyInDocument } from '../../src/runtime/html/document';
import { createHtmlPreview } from '../../src/runtime/html/preview';

afterEach(() => {
  vi.useRealTimers();
});

describe('HTML document wrapper', () => {
  it('builds a script-free document with an escaped title', () => {
    const documentHtml = wrapBodyInDocument('A & B', '<p>x</p>');
    expect(documentHtml).toContain('<!doctype html>');
    expect(documentHtml).toContain('<title>A &amp; B</title>');
    expect(documentHtml).toContain('<p>x</p>');
    expect(documentHtml).toContain(
      "<meta http-equiv=\"Content-Security-Policy\" content=\"script-src 'none'; object-src 'none'; base-uri 'none'\">",
    );
    expect(documentHtml).not.toContain('<script');
  });
});

describe('sandboxed HTML preview', () => {
  it('allows only same-origin access and never scripts', () => {
    const iframe = document.createElement('iframe');
    const preview = createHtmlPreview(iframe, { getAssets: () => ({}) });
    expect(iframe.getAttribute('sandbox')).toBe('allow-same-origin');
    expect(iframe.getAttribute('sandbox')).not.toContain('allow-scripts');
    preview.dispose();
  });

  it('resolves builtin asset placeholders before writing srcdoc', () => {
    const iframe = document.createElement('iframe');
    const preview = createHtmlPreview(iframe, { getAssets: () => ({}) });
    preview.update('<img src="asset:builtin:cat">');
    preview.flush();
    expect(iframe.srcdoc).toMatch(/src="(?:data:|[^"]*cat[^"]*\.svg)/);
    expect(iframe.srcdoc).not.toContain('asset:');
    preview.dispose();
  });

  it('replaces unresolved assets with an empty source', () => {
    const iframe = document.createElement('iframe');
    const preview = createHtmlPreview(iframe, { getAssets: () => ({}) });
    preview.update('<img src="asset:missing">');
    preview.flush();
    expect(iframe.srcdoc).toContain('src=""');
    preview.dispose();
  });

  it('coalesces rapid updates into one srcdoc write', () => {
    vi.useFakeTimers();
    const iframe = document.createElement('iframe');
    let writes = 0;
    let srcdoc = '';
    Object.defineProperty(iframe, 'srcdoc', {
      configurable: true,
      get: () => srcdoc,
      set: (value: string) => {
        writes += 1;
        srcdoc = value;
      },
    });
    const preview = createHtmlPreview(iframe, { getAssets: () => ({}), debounceMs: 25 });
    preview.update('<p>pertama</p>');
    preview.update('<p>kedua</p>');
    vi.advanceTimersByTime(25);
    expect(writes).toBe(1);
    expect(srcdoc).toContain('<p>kedua</p>');
    preview.dispose();
  });

  it('cancels a pending update when disposed', () => {
    vi.useFakeTimers();
    const iframe = document.createElement('iframe');
    const preview = createHtmlPreview(iframe, { getAssets: () => ({}), debounceMs: 25 });
    preview.update('<p>tidak ditulis</p>');
    preview.dispose();
    vi.advanceTimersByTime(25);
    expect(iframe.srcdoc).toBe('');
  });
});
