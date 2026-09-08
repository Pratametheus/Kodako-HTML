const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

/** Read the text content of the first `<title>` in `headHtml`; `fallback` if absent or empty. */
export function extractTitle(headHtml: string, fallback: string): string {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(headHtml);
  const raw = (match?.[1] ?? '').replace(
    /&(?:amp|lt|gt|quot|#39);/g,
    (entity) => ENTITIES[entity] ?? entity,
  );
  const text = raw.trim();
  return text.length > 0 ? text : fallback;
}

/** A friendly file-name slug for the fake address bar. Always ends in `.html`. */
export function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return `${slug.length > 0 ? slug : 'halaman'}.html`;
}
