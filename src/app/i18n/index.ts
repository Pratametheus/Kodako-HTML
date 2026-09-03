import dict from './id.json';

const table = dict as Record<string, string>;

export function t(key: string, params?: Record<string, string | number>): string {
  let str = table[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      str = str.split(`{${name}}`).join(String(value));
    }
  }
  return str;
}

const dateFmt = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}
