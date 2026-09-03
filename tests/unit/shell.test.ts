import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createEmptyProject } from '../../src/core/project';
import { WebStorage } from '../../src/core/web-storage';
import { startApp } from '../../src/app/shell';

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

describe('startApp', () => {
  it('renders Home on the default route', async () => {
    stop = startApp(root, new WebStorage());
    await flush();
    expect(root.textContent).toContain('Project Saya');
  });

  it('renders the Editor for an existing project route', async () => {
    const storage = new WebStorage();
    await storage.saveProject('proj_x', createEmptyProject('Shell Test'), null);
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

  it('navigating back to Home from the editor swaps the view', async () => {
    const storage = new WebStorage();
    await storage.saveProject('proj_y', createEmptyProject('Y'), null);
    window.location.hash = '#/editor/proj_y';
    stop = startApp(root, storage);
    await flush();
    root.querySelector<HTMLButtonElement>('[data-back]')!.click();
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await flush();
    expect(root.textContent).toContain('Project Saya');
  });
});
