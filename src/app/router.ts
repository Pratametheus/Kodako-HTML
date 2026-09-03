export type Route = { name: 'home' } | { name: 'editor'; id: string } | { name: 'notFound' };

export function parseHash(hash: string): Route {
  const clean = hash.replace(/^#/, '');
  if (clean === '' || clean === '/') return { name: 'home' };
  const editor = /^\/editor\/([^/]+)$/.exec(clean);
  if (editor) return { name: 'editor', id: editor[1]! };
  return { name: 'notFound' };
}

export function currentRoute(): Route {
  return parseHash(window.location.hash);
}

export function navigate(route: Route): void {
  const hash = route.name === 'editor' ? `#/editor/${route.id}` : '#/';
  if (window.location.hash !== hash) {
    window.location.hash = hash;
  }
}

export function onRouteChange(fn: (r: Route) => void): () => void {
  const handler = () => fn(currentRoute());
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}
