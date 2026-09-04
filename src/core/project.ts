import { newId } from './ids';

export type ProjectMode = 'sprite' | 'html';
export type AssetRef = { assetId: string };

export type SpriteData = {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: number;
  size: number;
  visible: boolean;
  costumes: AssetRef[];
  currentCostume: number;
  sounds: AssetRef[];
  script: Record<string, unknown>; // Blockly workspace JSON (opaque here)
};

export type ProjectAsset = {
  kind: 'image' | 'sound';
  name: string;
  source: 'builtin' | 'embedded';
  ref: string;
};

export type Project = {
  formatVersion: 1;
  meta: { name: string; createdAt: string; updatedAt: string };
  activeMode: ProjectMode;
  sprite: {
    stage: { backdrop: AssetRef | null };
    sprites: SpriteData[];
  };
  html: { workspace: Record<string, unknown> };
  assets: Record<string, ProjectAsset>;
};

export function createEmptyProject(name: string): Project {
  const now = new Date().toISOString();
  return {
    formatVersion: 1,
    meta: { name, createdAt: now, updatedAt: now },
    activeMode: 'sprite',
    sprite: {
      stage: { backdrop: null },
      sprites: [
        {
          id: newId('sprite'),
          name: 'Sprite 1',
          x: 0,
          y: 0,
          direction: 90,
          size: 100,
          visible: true,
          costumes: [{ assetId: 'builtin:cat' }],
          currentCostume: 0,
          sounds: [],
          script: {},
        },
      ],
    },
    html: { workspace: {} },
    assets: {
      'builtin:cat': {
        kind: 'image',
        name: 'Kucing',
        source: 'builtin',
        ref: 'builtin:cat',
      },
    },
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

  if (input.activeMode !== 'sprite' && input.activeMode !== 'html') {
    errors.push('activeMode harus "sprite" atau "html".');
  }

  const sprite = input.sprite;
  if (!isPlainObject(sprite) || !isPlainObject(sprite.stage) || !Array.isArray(sprite.sprites)) {
    errors.push('sprite.stage / sprite.sprites tidak valid.');
  } else {
    const backdrop = (sprite.stage as Record<string, unknown>).backdrop;
    if (backdrop !== null && !(isPlainObject(backdrop) && typeof backdrop.assetId === 'string')) {
      errors.push('sprite.stage.backdrop harus null atau { assetId }.');
    }
    (sprite.sprites as unknown[]).forEach((s, i) => {
      if (!isPlainObject(s)) return errors.push(`sprite.sprites[${i}] bukan objek.`);
      if (typeof s.id !== 'string' || typeof s.name !== 'string')
        errors.push(`sprite.sprites[${i}].id/name tidak valid.`);
      for (const k of ['x', 'y', 'direction', 'size', 'currentCostume'] as const) {
        if (typeof s[k] !== 'number' || Number.isNaN(s[k]))
          errors.push(`sprite.sprites[${i}].${k} harus angka.`);
      }
      if (typeof s.visible !== 'boolean')
        errors.push(`sprite.sprites[${i}].visible harus boolean.`);
      if (!Array.isArray(s.costumes) || !Array.isArray(s.sounds))
        errors.push(`sprite.sprites[${i}].costumes/sounds harus array.`);
      if (!isPlainObject(s.script)) errors.push(`sprite.sprites[${i}].script harus objek.`);
    });
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
