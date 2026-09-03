import './home.css';
import { formatDate, t } from '../i18n';
import type { ProjectManager } from './project-manager';

type Deps = { manager: ProjectManager; onOpen: (id: string) => void };

export function renderHome(root: HTMLElement, deps: Deps): () => void {
  root.innerHTML = `
    <section class="home">
      <h1>${t('home.title')}</h1>
      <div class="home__actions">
        <button class="btn btn-primary" data-action="new">${t('home.new')}</button>
        <button class="btn" data-action="open-file">${t('home.openFile')}</button>
      </div>
      <div class="home__list" data-list></div>
    </section>
  `;

  const listEl = root.querySelector<HTMLElement>('[data-list]')!;

  const renderList = async () => {
    const summaries = await deps.manager.list();
    if (summaries.length === 0) {
      listEl.innerHTML = `<p class="home__empty">${t('home.empty')}</p>`;
      return;
    }
    listEl.innerHTML = summaries
      .map(
        (s) => `
        <article class="card" data-card data-id="${s.id}">
          <p class="card__name"></p>
          <p class="card__date">${formatDate(s.updatedAt)}</p>
          <div class="card__buttons">
            <button class="btn" data-action="open">${t('home.open')}</button>
            <button class="btn" data-action="rename">${t('home.rename')}</button>
            <button class="btn" data-action="duplicate">${t('home.duplicate')}</button>
            <button class="btn" data-action="download">${t('home.download')}</button>
            <button class="btn" data-action="delete">${t('home.delete')}</button>
          </div>
        </article>`,
      )
      .join('');
    // Set names via textContent to avoid HTML injection from user-chosen names.
    summaries.forEach((s) => {
      listEl.querySelector<HTMLElement>(`[data-card][data-id="${s.id}"] .card__name`)!.textContent =
        s.name;
    });
  };

  const onClick = async (ev: MouseEvent) => {
    const btn = (ev.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const card = btn.closest<HTMLElement>('[data-card]');
    const id = card?.dataset.id;

    try {
      if (action === 'new') {
        const opened = await deps.manager.create();
        deps.onOpen(opened.id);
      } else if (action === 'open-file') {
        const opened = await deps.manager.openFromFile();
        deps.onOpen(opened.id);
      } else if (action === 'open' && id) {
        deps.onOpen(id);
      } else if (action === 'rename' && id && card) {
        const current = card.querySelector<HTMLElement>('.card__name')!.textContent ?? '';
        const next = window.prompt(t('home.promptRename'), current);
        if (next && next.trim() && next !== current) {
          await deps.manager.rename(id, next.trim());
          await renderList();
        }
      } else if (action === 'duplicate' && id) {
        await deps.manager.duplicate(id);
        await renderList();
      } else if (action === 'download' && id) {
        await deps.manager.exportToFile(id);
      } else if (action === 'delete' && id && card) {
        const name = card.querySelector<HTMLElement>('.card__name')!.textContent ?? '';
        if (window.confirm(t('confirm.delete', { name }))) {
          await deps.manager.remove(id);
          await renderList();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  root.addEventListener('click', onClick);
  void renderList();

  return () => {
    root.removeEventListener('click', onClick);
    root.innerHTML = '';
  };
}
