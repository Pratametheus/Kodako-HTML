import type { Project, SpriteData } from '../../../core/project';
import { resolveAssetUrl } from '../../../runtime/sprite/assets';
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

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );

export function renderSpritePanel(
  host: HTMLElement,
  deps: SpritePanelDeps,
): { refresh(): void; dispose(): void } {
  const refresh = (): void => {
    const project = deps.getProject();
    const selected =
      project.sprite.sprites.find((sprite) => sprite.id === deps.getSelectedId()) ??
      project.sprite.sprites[0]!;
    host.innerHTML = `
      <div class="sprite-panel__list">
        ${project.sprite.sprites
          .map((sprite) => {
            const url = resolveAssetUrl(sprite.costumes[0]?.assetId ?? '', project.assets);
            return `
              <button class="sprite-chip" type="button" data-sprite-id="${escapeHtml(sprite.id)}"
                aria-pressed="${sprite.id === deps.getSelectedId()}">
                ${url ? `<img src="${escapeHtml(url)}" alt="" />` : '<span class="sprite-chip__mark" aria-hidden="true"></span>'}
                <span>${escapeHtml(sprite.name)}</span>
              </button>`;
          })
          .join('')}
      </div>
      <button class="sprite-panel__add" type="button" data-add-sprite>${t('editor.sprite.addSprite')}</button>
      <div class="sprite-properties">
        <label>${t('editor.sprite.newSpriteName')}<input data-sprite-name value="${escapeHtml(selected.name)}" /></label>
        <div class="sprite-properties__grid">
          <label>${t('editor.sprite.fieldX')}<input type="number" data-sprite-field="x" value="${selected.x}" /></label>
          <label>${t('editor.sprite.fieldY')}<input type="number" data-sprite-field="y" value="${selected.y}" /></label>
          <label>${t('editor.sprite.fieldDirection')}<input type="number" data-sprite-field="direction" value="${selected.direction}" /></label>
          <label>${t('editor.sprite.fieldSize')}<input type="number" min="5" max="1000" data-sprite-field="size" value="${selected.size}" /></label>
        </div>
        <label class="sprite-properties__check"><input type="checkbox" data-sprite-field="visible" ${selected.visible ? 'checked' : ''} />${t('editor.sprite.fieldVisible')}</label>
        <button class="sprite-properties__remove" type="button" data-remove-sprite ${project.sprite.sprites.length <= 1 ? 'disabled' : ''}>${t('editor.sprite.removeSprite')}</button>
      </div>
    `;

    host.querySelectorAll<HTMLButtonElement>('[data-sprite-id]').forEach((button) => {
      button.addEventListener('click', () => deps.onSelect(button.dataset.spriteId!));
    });
    host
      .querySelector<HTMLButtonElement>('[data-add-sprite]')
      ?.addEventListener('click', deps.onAdd);
    host
      .querySelector<HTMLButtonElement>('[data-remove-sprite]')
      ?.addEventListener('click', () => deps.onRemove(selected.id));
    host
      .querySelector<HTMLInputElement>('[data-sprite-name]')
      ?.addEventListener('change', (event) =>
        deps.onRename(selected.id, (event.currentTarget as HTMLInputElement).value),
      );
    host.querySelectorAll<HTMLInputElement>('[data-sprite-field]').forEach((input) => {
      input.addEventListener('change', () => {
        const field = input.dataset.spriteField as 'x' | 'y' | 'direction' | 'size' | 'visible';
        if (field === 'visible') deps.onField({ visible: input.checked });
        else deps.onField({ [field]: Number(input.value) });
      });
    });
  };

  refresh();
  return { refresh, dispose: () => (host.innerHTML = '') };
}
