import { describe, expect, it } from 'vitest';
import { escapeHtmlAttr, escapeHtmlText } from '../../src/runtime/html/escape';

describe('HTML escaping', () => {
  it.each([escapeHtmlText, escapeHtmlAttr])(
    'escapes text and attribute metacharacters',
    (escape) => {
      expect(escape('<a> & "x" \'y\'')).toBe('&lt;a&gt; &amp; &quot;x&quot; &#39;y&#39;');
    },
  );

  it.each([escapeHtmlText, escapeHtmlAttr])('keeps empty strings empty', (escape) => {
    expect(escape('')).toBe('');
  });

  it.each([escapeHtmlText, escapeHtmlAttr])('coerces non-string input', (escape) => {
    expect(escape(42 as unknown as string)).toBe('42');
  });
});
