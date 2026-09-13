export type ProjectAsset = {
  kind: 'image' | 'sound';
  name: string;
  source: 'builtin' | 'embedded';
  ref: string;
};

export type Project = {
  formatVersion: 1;
  meta: { name: string; createdAt: string; updatedAt: string };
  html: { workspace: Record<string, unknown> };
  assets: Record<string, ProjectAsset>;
};

export function createEmptyProject(name: string): Project {
  const now = new Date().toISOString();
  return {
    formatVersion: 1,
    meta: { name, createdAt: now, updatedAt: now },
    html: { workspace: {} },
    assets: {},
  };
}

const CURRENT_VERSION = 1;

export function migrate(input: unknown): unknown {
  if (typeof input !== 'object' || input === null || !('formatVersion' in input)) {
    throw new Error('Format project tidak dikenal. File ini mungkin bukan project Game HTML.');
  }
  const version = (input as { formatVersion: unknown }).formatVersion;
  if (version === CURRENT_VERSION) return input;
  throw new Error(`Versi format project (${String(version)}) tidak didukung.`);
}

type ValidateResult = { ok: true; project: Project } | { ok: false; errors: string[] };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function validate(input: unknown): ValidateResult {
  const errors: string[] = [];
  if (!isPlainObject(input)) return { ok: false, errors: ['Project harus berupa objek.'] };

  if (input.formatVersion !== 1) errors.push('formatVersion harus 1.');

  const meta = input.meta;
  if (
    !isPlainObject(meta) ||
    typeof meta.name !== 'string' ||
    typeof meta.createdAt !== 'string' ||
    typeof meta.updatedAt !== 'string'
  ) {
    errors.push('meta.name / meta.createdAt / meta.updatedAt tidak valid.');
  }

  const html = input.html;
  if (!isPlainObject(html) || !isPlainObject(html.workspace))
    errors.push('html.workspace tidak valid.');

  const assets = input.assets;
  if (!isPlainObject(assets)) {
    errors.push('assets harus objek.');
  } else {
    for (const [id, a] of Object.entries(assets)) {
      if (
        !isPlainObject(a) ||
        (a.kind !== 'image' && a.kind !== 'sound') ||
        typeof a.name !== 'string' ||
        (a.source !== 'builtin' && a.source !== 'embedded') ||
        typeof a.ref !== 'string'
      ) {
        errors.push(`assets["${id}"] tidak valid.`);
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, project: input as Project };
}

export function serializeProject(p: Project): string {
  return JSON.stringify(p, null, 2);
}

export function parseProjectText(text: string): ValidateResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['File bukan JSON yang valid.'] };
  }
  let migrated: unknown;
  try {
    migrated = migrate(parsed);
  } catch (e) {
    return {
      ok: false,
      errors: [e instanceof Error ? e.message : 'Gagal membaca format project.'],
    };
  }
  return validate(migrated);
}
