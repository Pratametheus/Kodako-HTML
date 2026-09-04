import { escapeHtmlAttr, escapeHtmlText } from './escape';

export const HTML_DOCUMENT_RESET =
  '*{box-sizing:border-box} body{margin:16px;font-family:system-ui,sans-serif;line-height:1.5} img{max-width:100%}';

export function wrapBodyInDocument(
  title: string,
  bodyHtml: string,
  opts: { lang?: string } = {},
): string {
  const lang = escapeHtmlAttr(opts.lang ?? 'id');
  return (
    `<!doctype html><html lang="${lang}"><head>` +
    '<meta charset="utf-8">' +
    "<meta http-equiv=\"Content-Security-Policy\" content=\"script-src 'none'; object-src 'none'; base-uri 'none'\">" +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    `<title>${escapeHtmlText(title)}</title>` +
    `<style>${HTML_DOCUMENT_RESET}</style>` +
    `</head><body>${bodyHtml}</body></html>`
  );
}
