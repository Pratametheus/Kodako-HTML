import { describe, expect, it } from 'vitest';
import { htmlWorkspaceJson, withHtmlWorkspace } from '../../src/core/html-project';
import { createEmptyProject, validate } from '../../src/core/project';

describe('HTML project workspace wiring', () => {
  it('returns an empty workspace for a new project', () => {
    expect(htmlWorkspaceJson(createEmptyProject('X'))).toEqual({});
  });

  it('immutably replaces the workspace and updates project metadata', () => {
    const project = createEmptyProject('X');
    project.meta.updatedAt = '2000-01-01T00:00:00.000Z';
    const workspace = { blocks: { languageVersion: 0, blocks: [] } };

    const next = withHtmlWorkspace(project, workspace);

    expect(next).not.toBe(project);
    expect(htmlWorkspaceJson(next)).toEqual(workspace);
    expect(htmlWorkspaceJson(project)).toEqual({});
    expect(next.meta.updatedAt).not.toBe(project.meta.updatedAt);
    expect(validate(next).ok).toBe(true);
  });
});
