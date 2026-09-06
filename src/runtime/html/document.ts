import { escapeHtmlAttr, escapeHtmlText } from './escape';

export const HTML_DOCUMENT_RESET =
  '*{box-sizing:border-box} body{margin:16px;font-family:system-ui,sans-serif;line-height:1.5} img{max-width:100%}';

export function wrapBodyInDocument(
  title: string,
  bodyHtml: string,
  opts: { lang?: string; headHtml?: string } = {},
): string {
  const lang = escapeHtmlAttr(opts.lang ?? 'id');
  const headHtml = opts.headHtml ?? '';
  const titleTag = /<title[\s>]/i.test(headHtml)
    ? headHtml
    : `<title>${escapeHtmlText(title)}</title>`;
  return (
    `<!doctype html><html lang="${lang}"><head>` +
    '<meta charset="utf-8">' +
    "<meta http-equiv=\"Content-Security-Policy\" content=\"script-src 'none'; object-src 'none'; base-uri 'none'\">" +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    titleTag +
    `<style>${HTML_DOCUMENT_RESET}</style>` +
    `</head><body>${bodyHtml}</body></html>`
  );
}

export function composeDisplayDocument(input: {
  headHtml: string;
  bodyHtml: string;
  lang?: string;
  fallbackTitle: string;
}): string {
  const lang = escapeHtmlAttr(input.lang ?? 'id');
  const titleLine = /<title[\s>]/i.test(input.headHtml)
    ? input.headHtml.trim()
    : `<title>${escapeHtmlText(input.fallbackTitle)}</title>`;
  return [
    '<!doctype html>',
    `<html lang="${lang}">`,
    '<head>',
    titleLine,
    '</head>',
    '<body>',
    input.bodyHtml.replace(/\n$/, ''),
    '</body>',
    '</html>',
    '',
  ].join('\n');
}
