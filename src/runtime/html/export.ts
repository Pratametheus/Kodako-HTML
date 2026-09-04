import { Blockly, generateHtml, installHtmlBlockly } from '../../blocks';
import { htmlWorkspaceJson } from '../../core/html-project';
import type { Project } from '../../core/project';
import type { Storage } from '../../core/storage';
import { resolveAssetUrl } from '../sprite/assets';
import { wrapBodyInDocument } from './document';
import { escapeHtmlAttr } from './escape';

function inlineAssetSources(bodyHtml: string, assets: Record<string, { ref: string }>): string {
  return bodyHtml.replace(/\bsrc=(["'])asset:([^"']*)\1/g, (_match, quote: string, id: string) => {
    // Uploaded images resolve to data URLs. Builtins intentionally remain bundled URLs until Phase 3.
    const url = resolveAssetUrl(id, assets) ?? '';
    return `src=${quote}${escapeHtmlAttr(url)}${quote}`;
  });
}

export function buildStandaloneDocument(
  title: string,
  bodyHtml: string,
  assets: Record<string, { ref: string }>,
): string {
  return wrapBodyInDocument(title, inlineAssetSources(bodyHtml, assets));
}

export async function exportHtmlProject(project: Project, storage: Storage): Promise<void> {
  installHtmlBlockly();
  const workspace = new Blockly.Workspace();
  try {
    Blockly.serialization.workspaces.load(htmlWorkspaceJson(project), workspace);
    const { bodyHtml } = generateHtml(workspace);
    const html = buildStandaloneDocument(project.meta.name, bodyHtml, project.assets);
    await storage.exportHtml(project.meta.name, html);
  } finally {
    workspace.dispose();
  }
}
