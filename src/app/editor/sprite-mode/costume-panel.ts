import type { SpriteData } from '../../../core/project';
import { BUILTIN_BY_ID, BUILTIN_COSTUMES, loadUploadedImage } from '../../../runtime/sprite/assets';
import { t } from '../../i18n';

export type CostumePanelDeps = {
  getSelectedSprite: () => SpriteData;
  onAddBuiltin: (assetId: string) => void;
  onUpload: (file: { dataUrl: string; name: string }) => void;
  onPick: (index: number) => void;
};

export function renderCostumePanel(
  host: HTMLElement,
  deps: CostumePanelDeps,
): { refresh(): void; dispose(): void } {
  let disposed = false;

  const refresh = (): void => {
    const sprite = deps.getSelectedSprite();
    host.innerHTML = `
      <section class="costume-section">
        <h3>${t('editor.sprite.costumeBuiltinHeading')}</h3>
        <div class="costume-grid">
          ${BUILTIN_COSTUMES.map(
            (asset) => `
              <button type="button" class="costume-tile" data-builtin-costume="${asset.id}" title="${asset.name}">
                <img src="${asset.url}" alt="" />
                <span>${asset.name}</span>
              </button>`,
          ).join('')}
        </div>
      </section>
      <label class="costume-upload">
        <span>${t('editor.sprite.uploadImage')}</span>
        <input type="file" accept="image/*" />
      </label>
      <p class="costume-error" data-upload-error role="alert" hidden></p>
      <section class="costume-section">
        <h3>${t('editor.sprite.costumeCurrentHeading')}</h3>
        <div class="costume-grid costume-grid--current">
          ${sprite.costumes
            .map((costume, index) => {
              const builtin = BUILTIN_BY_ID.get(costume.assetId);
              return `
                <button type="button" class="costume-tile" data-current-costume="${index}"
                  aria-pressed="${index === sprite.currentCostume}">
                  ${builtin ? `<img src="${builtin.url}" alt="" />` : '<span class="costume-tile__file" aria-hidden="true">▧</span>'}
                  <span>${builtin?.name ?? `kostum${index + 1}`}</span>
                </button>`;
            })
            .join('')}
        </div>
      </section>
    `;

    host.querySelectorAll<HTMLButtonElement>('[data-builtin-costume]').forEach((button) => {
      button.addEventListener('click', () => deps.onAddBuiltin(button.dataset.builtinCostume!));
    });
    host.querySelectorAll<HTMLButtonElement>('[data-current-costume]').forEach((button) => {
      button.addEventListener('click', () => deps.onPick(Number(button.dataset.currentCostume)));
    });
    host
      .querySelector<HTMLInputElement>('input[type="file"]')
      ?.addEventListener('change', async (event) => {
        const input = event.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        const error = host.querySelector<HTMLElement>('[data-upload-error]')!;
        try {
          const uploaded = await loadUploadedImage(file);
          if (!disposed) deps.onUpload(uploaded);
        } catch (caught) {
          if (!disposed) {
            error.hidden = false;
            error.textContent =
              caught instanceof Error ? caught.message : t('error.spriteRunFailed');
          }
        }
        input.value = '';
      });
  };

  refresh();
  return {
    refresh,
    dispose: () => {
      disposed = true;
      host.innerHTML = '';
    },
  };
}
