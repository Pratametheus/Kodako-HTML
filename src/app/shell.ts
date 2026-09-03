import type { Storage } from '../core/storage';
import { currentRoute, navigate, onRouteChange, type Route } from './router';
import { ProjectManager } from './home/project-manager';
import { renderHome } from './home/home-view';
import { renderEditor } from './editor/editor-view';

export function startApp(root: HTMLElement, storage: Storage): () => void {
  const manager = new ProjectManager(storage);
  let cleanupView: (() => void) | undefined;
  let generation = 0;

  const render = async (route: Route) => {
    const myGeneration = ++generation;

    cleanupView?.();
    cleanupView = undefined;

    if (route.name === 'home') {
      cleanupView = renderHome(root, {
        manager,
        onOpen: (id) => navigate({ name: 'editor', id }),
      });
      return;
    }

    if (route.name === 'editor') {
      try {
        const project = await storage.loadProject(route.id);
        if (myGeneration !== generation) return;
        cleanupView = renderEditor(root, {
          id: route.id,
          project,
          storage,
          onBack: () => navigate({ name: 'home' }),
        });
      } catch (err) {
        if (myGeneration !== generation) return;
        console.error(err);
        navigate({ name: 'home' });
      }
      return;
    }

    navigate({ name: 'home' });
  };

  const unsubscribe = onRouteChange((route) => void render(route));
  void render(currentRoute());

  return () => {
    unsubscribe();
    cleanupView?.();
    root.innerHTML = '';
  };
}
