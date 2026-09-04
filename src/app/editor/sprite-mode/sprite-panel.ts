import type { Project, SpriteData } from '../../../core/project';
import { t } from '../../i18n';

export type SpritePanelDeps = {
  getProject: () => Project;
  getSelectedId: () => string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onField: (patch: Partial<Pick<SpriteData, 'x' | 'y' | 'direction' | 'size' | 'visible'>>) => void;
};

export function renderSpritePanel(
  host: HTMLElement,
  deps: SpritePanelDeps,
): { refresh(): void; dispose(): void } {
  const refresh = (): void => {
    const project = deps.getProject();
    host.innerHTML = `
      <div class="sprite-panel__list">
        ${project.sprite.sprites
          .map(
            (sprite) => `
              <button class="sprite-chip" type="button" data-sprite-id="${sprite.id}"
                aria-pressed="${sprite.id === deps.getSelectedId()}">
                <span class="sprite-chip__mark" aria-hidden="true"></span>
                <span>${sprite.name}</span>
              </button>`,
          )
          .join('')}
      </div>
      <button class="sprite-panel__add" type="button" data-add-sprite>${t('editor.sprite.addSprite')}</button>
    `;
    host.querySelectorAll<HTMLButtonElement>('[data-sprite-id]').forEach((button) => {
      button.addEventListener('click', () => deps.onSelect(button.dataset.spriteId!));
    });
    host
      .querySelector<HTMLButtonElement>('[data-add-sprite]')
      ?.addEventListener('click', deps.onAdd);
  };

  refresh();
  return { refresh, dispose: () => (host.innerHTML = '') };
}
