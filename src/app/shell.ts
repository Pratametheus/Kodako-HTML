import type { Storage } from '../core/storage';
import { currentRoute, navigate, onRouteChange, type Route } from './router';
import { ProjectManager } from './home/project-manager';
import { renderHome } from './home/home-view';
import { renderEditor } from './editor/editor-view';

export function startApp(root: HTMLElement, storage: Storage): () => void {
  const manager = new ProjectManager(storage);
  let cleanupView: (() => void) | undefined;

  const render = async (route: Route) => {
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
        cleanupView = renderEditor(root, {
          id: route.id,
          project,
          storage,
          onBack: () => navigate({ name: 'home' }),
        });
      } catch (err) {
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
