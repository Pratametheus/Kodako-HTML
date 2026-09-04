import type { Project } from './project';

export function htmlWorkspaceJson(project: Project): Record<string, unknown> {
  return project.html.workspace ?? {};
}

export function withHtmlWorkspace(project: Project, workspace: Record<string, unknown>): Project {
  return {
    ...project,
    meta: { ...project.meta, updatedAt: new Date().toISOString() },
    html: { ...project.html, workspace },
  };
}
