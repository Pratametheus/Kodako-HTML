import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyProject } from '../../src/core/project';
import { WebStorage } from '../../src/core/web-storage';
import { startApp } from '../../src/app/shell';

vi.mock('../../src/app/editor/html-mode/html-mode', () => ({
  renderHtmlMode: (host: HTMLElement) => {
    host.textContent = 'Mode HTML';
    return () => {
      host.textContent = '';
    };
  },
}));

let root: HTMLElement;
let stop: () => void;

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => {
  stop?.();
  root.remove();
});

function flush() {
  return new Promise((r) => setTimeout(r, 0));
}

function htmlProject(name: string) {
  const project = createEmptyProject(name);
  project.activeMode = 'html';
  return project;
}

describe('startApp', () => {
  it('renders Home on the default route', async () => {
    stop = startApp(root, new WebStorage());
    await flush();
    expect(root.textContent).toContain('Project Saya');
  });

  it('renders the Editor for an existing project route', async () => {
    const storage = new WebStorage();
    await storage.saveProject('proj_x', htmlProject('Shell Test'), null);
    window.location.hash = '#/editor/proj_x';
    stop = startApp(root, storage);
    await flush();
    expect(root.querySelector<HTMLInputElement>('[data-name]')!.value).toBe('Shell Test');
  });

  it('redirects to Home when the editor project is missing', async () => {
    window.location.hash = '#/editor/ghost';
    stop = startApp(root, new WebStorage());
    await flush();
    await flush();
    expect(window.location.hash).toBe('#/');
    expect(root.textContent).toContain('Project Saya');
  });

  it('ignores a stale in-flight render when the route changes rapidly', async () => {
    const storage = new WebStorage();
    await storage.saveProject('proj_z', htmlProject('Cepat'), null);
    window.location.hash = '#/editor/proj_z';
    stop = startApp(root, storage);
    // Fire two synchronous hashchanges before the first render's await resolves:
    // editor -> home -> editor.
    window.location.hash = '#/';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    window.location.hash = '#/editor/proj_z';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await flush();
    await flush();
    expect(root.querySelector<HTMLInputElement>('[data-name]')?.value).toBe('Cepat');
    expect(root.querySelectorAll('[data-name]')).toHaveLength(1);
    expect(root.querySelector('.home')).toBeNull();
  });

  it('navigating back to Home from the editor swaps the view', async () => {
    const storage = new WebStorage();
    await storage.saveProject('proj_y', htmlProject('Y'), null);
    window.location.hash = '#/editor/proj_y';
    stop = startApp(root, storage);
    await flush();
    root.querySelector<HTMLButtonElement>('[data-back]')!.click();
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await flush();
    expect(root.textContent).toContain('Project Saya');
  });
});
