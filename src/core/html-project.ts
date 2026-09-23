import type { Project } from './project';

export function htmlWorkspaceJson(project: Project): Record<string, unknown> {
  return project.html.workspace ?? {};
}

type BlockNode = {
  type?: string;
  fields?: Record<string, unknown>;
  next?: { block?: BlockNode };
  inputs?: Record<string, { block?: BlockNode }>;
  x?: number;
  y?: number;
  [k: string]: unknown;
};

const LEGACY_IMAGE_WIDTHS: Record<string, number> = {
  '': 0,
  '120px': 120,
  '240px': 240,
  '480px': 480,
};

function migrateImageWidthField(node: BlockNode): BlockNode {
  if (
    (node.type === 'html_image_asset' || node.type === 'html_image_url') &&
    node.fields &&
    typeof node.fields.WIDTH === 'string' &&
    Object.hasOwn(LEGACY_IMAGE_WIDTHS, node.fields.WIDTH)
  ) {
    return {
      ...node,
      fields: { ...node.fields, WIDTH: LEGACY_IMAGE_WIDTHS[node.fields.WIDTH as string] },
    };
  }
  return node;
}

function migrateBlockNode(node: BlockNode | undefined): BlockNode | undefined {
  if (!node || typeof node !== 'object') return node;
  let current = migrateImageWidthField(node);
  if (current.next?.block) {
    current = {
      ...current,
      next: { ...current.next, block: migrateBlockNode(current.next.block) },
    };
  }
  if (current.inputs) {
    const nextInputs: typeof current.inputs = {};
    for (const [key, value] of Object.entries(current.inputs)) {
      nextInputs[key] = value?.block ? { ...value, block: migrateBlockNode(value.block) } : value;
    }
    current = { ...current, inputs: nextInputs };
  }
  return current;
}

/**
 * One-time migration for projects saved before the `html_page` root block was
 * removed. Lifts the child stack of a legacy `html_page` block up to the top
 * level (so the top-level block stack is the `<body>`) **as a single connected
 * stack** — the head block keeps its whole `.next` chain, and inherits the
 * page's x/y so the kid's arrangement survives the upgrade.
 *
 * Also rewrites any legacy string `html_image_asset`/`html_image_url` `WIDTH`
 * field (`''`/`'120px'`/`'240px'`/`'480px'`, from before the field became a
 * plain pixel number) to its numeric equivalent, anywhere in the block tree
 * (not just top-level).
 *
 * Idempotent; the `html_page` lift mutates the lifted block's `x`/`y` in
 * place (pre-existing behavior), everything else is pure. Any
 * missing/oddly-shaped node is treated as "nothing to migrate" and `raw` is
 * returned untouched.
 */
export function migrateHtmlWorkspaceJson(raw: Record<string, unknown>): Record<string, unknown> {
  const blocksHolder = (raw as { blocks?: { blocks?: unknown } }).blocks;
  const list = blocksHolder?.blocks;
  if (!Array.isArray(list)) {
    return raw;
  }

  let nextList = list as BlockNode[];
  if (nextList.some((b) => b?.type === 'html_page')) {
    const lifted: BlockNode[] = [];
    for (const entry of nextList) {
      if (entry?.type !== 'html_page') {
        lifted.push(entry);
        continue;
      }
      const head = entry.inputs?.BODY?.block;
      if (head && typeof head === 'object') {
        if (typeof entry.x === 'number') head.x = entry.x;
        if (typeof entry.y === 'number') head.y = entry.y;
        lifted.push(head);
      }
    }
    nextList = lifted;
  }

  nextList = nextList.map((entry) => migrateBlockNode(entry) as BlockNode);

  return { ...raw, blocks: { ...blocksHolder, blocks: nextList } };
}

export function withHtmlWorkspace(project: Project, workspace: Record<string, unknown>): Project {
  return {
    ...project,
    meta: { ...project.meta, updatedAt: new Date().toISOString() },
    html: { ...project.html, workspace },
  };
}
