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

function chainToArray(head: BlockNode | undefined): BlockNode[] {
  const out: BlockNode[] = [];
  let node = head;
  while (node && typeof node === 'object') {
    const { next, ...rest } = node;
    out.push(rest as BlockNode);
    node = next?.block;
  }
  return out;
}

/**
 * One-time migration for projects saved before the `html_page` root block was
 * removed. Lifts every child of a legacy `html_page` block up to the top level
 * (so the top-level block stack is the `<body>`), preserving the page's x/y on
 * the first lifted block. Pure and idempotent; any missing/oddly-shaped node is
 * treated as "nothing to migrate" and `raw` is returned untouched.
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
    const lifted = chainToArray(entry.inputs?.BODY?.block);
    if (lifted[0]) {
      if (typeof entry.x === 'number') lifted[0].x = entry.x;
      if (typeof entry.y === 'number') lifted[0].y = entry.y;
    }
    nextList.push(...lifted);
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
