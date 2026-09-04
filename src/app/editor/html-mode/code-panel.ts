import hljs from 'highlight.js/lib/core';
import xml from 'highlight.js/lib/languages/xml';
import '../../../styles/hljs-theme.css';

hljs.registerLanguage('xml', xml);

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
]);

function prettyPrintHtml(bodyHtml: string): string {
  const source = bodyHtml.trim();
  if (!source) return '';

  let depth = 0;
  return source
    .split(/\r?\n/)
    .map((rawLine) => {
      const line = rawLine.trim();
      const startsWithClose = /^<\//.test(line);
      if (startsWithClose) depth = Math.max(0, depth - 1);

      const rendered = `${'  '.repeat(depth)}${line}`;
      const openingTags = [...line.matchAll(/<([a-z][\w-]*)(?:\s[^>]*)?>/gi)].filter(
        (match) => !VOID_TAGS.has(match[1]?.toLowerCase() ?? ''),
      ).length;
      const closingTags = [...line.matchAll(/<\/[a-z][\w-]*\s*>/gi)].length;
      depth = Math.max(0, depth + openingTags - closingTags + (startsWithClose ? 1 : 0));
      return rendered;
    })
    .join('\n');
}

export type HtmlCodePanel = {
  setCode(bodyHtml: string): void;
  dispose(): void;
};

export function renderCodePanel(host: HTMLElement): HtmlCodePanel {
  host.replaceChildren();
  const pre = document.createElement('pre');
  pre.className = 'hljs';
  const code = document.createElement('code');
  code.className = 'language-xml';
  code.setAttribute('contenteditable', 'false');
  pre.append(code);
  host.append(pre);

  return {
    setCode(bodyHtml: string): void {
      const pretty = prettyPrintHtml(bodyHtml);
      code.innerHTML = hljs.highlight(pretty, { language: 'xml' }).value;
    },
    dispose(): void {
      host.replaceChildren();
    },
  };
}
