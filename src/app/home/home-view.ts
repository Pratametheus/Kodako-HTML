import './home.css';
import { formatDate, t } from '../i18n';
import { showToast } from '../toast';
import type { ProjectManager } from './project-manager';
import { STARTER_TEMPLATES } from './starter-templates';

type Deps = { manager: ProjectManager; onOpen: (id: string) => void };

export function renderHome(root: HTMLElement, deps: Deps): () => void {
  root.innerHTML = `
    <section class="home">
      <h1>${t('home.title')}</h1>
      <div class="home__actions">
        <button class="btn btn-primary" data-action="new">${t('home.new')}</button>
        <button class="btn" data-action="templates">${t('home.templates')}</button>
        <button class="btn" data-action="open-file">${t('home.openFile')}</button>
      </div>
      <div class="home__list" data-list></div>

      <div class="home__templates-dialog" data-templates-dialog hidden>
        <div class="home__templates-backdrop" data-action="close-templates"></div>
        <div class="home__templates-content" role="dialog" aria-modal="true" aria-labelledby="templates-title">
          <div class="home__templates-header">
            <h2 id="templates-title">${t('home.templatesTitle')}</h2>
            <button class="btn btn--icon" data-action="close-templates" aria-label="${t('home.close')}">✕</button>
          </div>
          <p class="home__templates-sub">${t('home.templatesSubtitle')}</p>
          <div class="home__templates-grid">
            ${STARTER_TEMPLATES.map(
              (tmpl) => `
              <div class="template-card" data-template-id="${tmpl.id}">
                <div class="template-card__icon">${tmpl.icon}</div>
                <div class="template-card__body">
                  <h3>${tmpl.name}</h3>
                  <p>${tmpl.description}</p>
                </div>
                <button class="btn btn-primary template-card__btn" data-action="use-template" data-template="${tmpl.id}">Gunakan</button>
              </div>
            `,
            ).join('')}
          </div>
        </div>
      </div>
    </section>
  `;

  const listEl = root.querySelector<HTMLElement>('[data-list]')!;
  const dialogEl = root.querySelector<HTMLElement>('[data-templates-dialog]')!;

  const renderList = async () => {
    const summaries = await deps.manager.list();
    if (summaries.length === 0) {
      listEl.innerHTML = `<p class="home__empty">${t('home.empty')}</p>`;
      return;
    }
    listEl.innerHTML = summaries
      .map(
        (s) => `
        <article class="card" data-card data-id="${s.id}" role="group" aria-labelledby="card-name-${s.id}">
          <p class="card__name" id="card-name-${s.id}"></p>
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
      } else if (action === 'templates') {
        dialogEl.hidden = false;
      } else if (action === 'close-templates') {
        dialogEl.hidden = true;
      } else if (action === 'use-template') {
        const tmplId = btn.dataset.template;
        const tmpl = STARTER_TEMPLATES.find((t) => t.id === tmplId);
        if (tmpl) {
          dialogEl.hidden = true;
          const opened = await deps.manager.create(tmpl.name, tmpl.workspace);
          deps.onOpen(opened.id);
        }
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
      if (action === 'open-file') showToast(t('error.importFile'), { kind: 'error' });
    }
  };

  root.addEventListener('click', onClick);
  void renderList();

  return () => {
    root.removeEventListener('click', onClick);
    root.innerHTML = '';
  };
}
