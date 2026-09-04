import { describe, expect, it } from 'vitest';
import { renderCodePanel } from '../../src/app/editor/html-mode/code-panel';

describe('HTML code panel', () => {
  it('renders a read-only highlighted XML code surface', () => {
    const host = document.createElement('div');
    const panel = renderCodePanel(host);
    const pre = host.querySelector('pre.hljs');
    const code = host.querySelector('code.language-xml');

    expect(pre).toBeTruthy();
    expect(code?.getAttribute('contenteditable')).toBe('false');

    panel.setCode('<p>hi & bye</p>');
    expect(code?.innerHTML).toContain('class="hljs-');
    expect(code?.innerHTML).toContain('hi &amp; bye');
  });

  it('replaces highlighted content instead of appending', () => {
    const host = document.createElement('div');
    const panel = renderCodePanel(host);
    panel.setCode('<p>lama</p>');
    panel.setCode('<h1>baru</h1>');
    const code = host.querySelector('code.language-xml');
    expect(code?.textContent).toContain('<h1>baru</h1>');
    expect(code?.textContent).not.toContain('lama');
  });

  it('empties its host on dispose', () => {
    const host = document.createElement('div');
    const panel = renderCodePanel(host);
    panel.dispose();
    expect(host.childElementCount).toBe(0);
  });
});
