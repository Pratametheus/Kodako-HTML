import type { Project } from './project';

export function htmlWorkspaceJson(project: Project): Record<string, unknown> {
  return project.html.workspace ?? {};
}

type BlockNode = {
  type?: string;
  next?: { block?: BlockNode };
  inputs?: Record<string, { block?: BlockNode }>;
  x?: number;
  y?: number;
  [k: string]: unknown;
};

/**
 * One-time migration for projects saved before the `html_page` root block was
 * removed. Lifts the child stack of a legacy `html_page` block up to the top
 * level (so the top-level block stack is the `<body>`) **as a single connected
 * stack** — the head block keeps its whole `.next` chain, and inherits the
 * page's x/y so the kid's arrangement survives the upgrade. Pure and idempotent;
 * any missing/oddly-shaped node is treated as "nothing to migrate" and `raw` is
 * returned untouched.
 */
export function migrateHtmlWorkspaceJson(raw: Record<string, unknown>): Record<string, unknown> {
  const blocksHolder = (raw as { blocks?: { blocks?: unknown } }).blocks;
  const list = blocksHolder?.blocks;
  if (!Array.isArray(list) || !list.some((b) => (b as BlockNode)?.type === 'html_page')) {
    return raw;
  }
  const nextList: BlockNode[] = [];
  for (const entry of list as BlockNode[]) {
    if (entry?.type !== 'html_page') {
      nextList.push(entry);
      continue;
    }
    const head = entry.inputs?.BODY?.block;
    if (head && typeof head === 'object') {
      if (typeof entry.x === 'number') head.x = entry.x;
      if (typeof entry.y === 'number') head.y = entry.y;
      nextList.push(head);
    }
  }
  return { ...raw, blocks: { ...blocksHolder, blocks: nextList } };
}

export function withHtmlWorkspace(project: Project, workspace: Record<string, unknown>): Project {
  return {
    ...project,
    meta: { ...project.meta, updatedAt: new Date().toISOString() },
    html: { ...project.html, workspace },
  };
}
