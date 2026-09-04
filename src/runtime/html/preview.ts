import { resolveAssetUrl } from '../sprite/assets';
import { wrapBodyInDocument } from './document';
import { escapeHtmlAttr } from './escape';

export const PREVIEW_DEBOUNCE_MS = 300;

type HtmlPreviewOptions = {
  getAssets: () => Record<string, { ref: string }>;
  debounceMs?: number;
};

export type HtmlPreview = {
  update(bodyHtml: string): void;
  flush(): void;
  dispose(): void;
};

function resolveAssetSources(bodyHtml: string, assets: Record<string, { ref: string }>): string {
  return bodyHtml.replace(/\bsrc=(["'])asset:([^"']*)\1/g, (_match, quote: string, id: string) => {
    const url = resolveAssetUrl(id, assets) ?? '';
    return `src=${quote}${escapeHtmlAttr(url)}${quote}`;
  });
}

export function createHtmlPreview(
  iframe: HTMLIFrameElement,
  opts: HtmlPreviewOptions,
): HtmlPreview {
  iframe.setAttribute('sandbox', 'allow-same-origin');

  const debounceMs = opts.debounceMs ?? PREVIEW_DEBOUNCE_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pendingBody: string | undefined;
  let disposed = false;

  const render = (): void => {
    if (disposed || pendingBody === undefined) return;
    const bodyHtml = pendingBody;
    pendingBody = undefined;
    iframe.srcdoc = wrapBodyInDocument(
      iframe.title || 'Pratinjau',
      resolveAssetSources(bodyHtml, opts.getAssets()),
    );
  };

  return {
    update(bodyHtml: string): void {
      if (disposed) return;
      pendingBody = bodyHtml;
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        render();
      }, debounceMs);
    },
    flush(): void {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      render();
    },
    dispose(): void {
      disposed = true;
      pendingBody = undefined;
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
    },
  };
}
