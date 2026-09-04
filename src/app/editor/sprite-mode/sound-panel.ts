import type { SpriteData } from '../../../core/project';
import { BUILTIN_SOUNDS, loadUploadedSound } from '../../../runtime/sprite/assets';
import { t } from '../../i18n';

export type SoundPanelDeps = {
  getSelectedSprite: () => SpriteData;
  assetName: (assetId: string, index: number) => string;
  onAddBuiltin: (assetId: string) => void;
  onUpload: (file: { dataUrl: string; name: string }) => void;
  onPreview: (assetId: string) => void;
};

const escapeText = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function renderSoundPanel(
  host: HTMLElement,
  deps: SoundPanelDeps,
): { refresh(): void; dispose(): void } {
  let disposed = false;

  const refresh = (): void => {
    const sprite = deps.getSelectedSprite();
    host.innerHTML = `
      <section class="sound-section">
        <h3>${t('editor.sprite.soundBuiltinHeading')}</h3>
        <div class="sound-grid">
          ${BUILTIN_SOUNDS.map(
            (asset) => `
              <button type="button" class="sound-tile" data-builtin-sound="${asset.id}">
                <span aria-hidden="true">&#9835;</span>
                <span>${asset.name}</span>
              </button>`,
          ).join('')}
        </div>
      </section>
      <label class="sound-upload">
        <span>${t('editor.sprite.uploadSound')}</span>
        <input data-upload-sound type="file" accept="audio/*" />
      </label>
      <p class="sound-error" data-upload-error role="alert" hidden></p>
      <section class="sound-section">
        <h3>${t('editor.sprite.soundCurrentHeading')}</h3>
        <div class="sound-list">
          ${
            sprite.sounds
              .map(
                (sound, index) => `
                <button type="button" class="sound-current" data-current-sound="${index}">
                  <span aria-hidden="true">&#9654;</span>
                  <span>${escapeText(deps.assetName(sound.assetId, index))}</span>
                </button>`,
              )
              .join('') || `<p class="sprite-panel__empty">${t('editor.sprite.soundEmpty')}</p>`
          }
        </div>
      </section>
    `;

    host.querySelectorAll<HTMLButtonElement>('[data-builtin-sound]').forEach((button) => {
      button.addEventListener('click', () => {
        const assetId = button.dataset.builtinSound!;
        deps.onAddBuiltin(assetId);
        deps.onPreview(assetId);
      });
    });
    host.querySelectorAll<HTMLButtonElement>('[data-current-sound]').forEach((button) => {
      button.addEventListener('click', () => {
        const sound = sprite.sounds[Number(button.dataset.currentSound)];
        if (sound) deps.onPreview(sound.assetId);
      });
    });
    host
      .querySelector<HTMLInputElement>('[data-upload-sound]')
      ?.addEventListener('change', async (event) => {
        const input = event.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        const error = host.querySelector<HTMLElement>('[data-upload-error]')!;
        try {
          const uploaded = await loadUploadedSound(file);
          if (!disposed) deps.onUpload(uploaded);
        } catch (caught) {
          if (!disposed) {
            error.hidden = false;
            error.textContent =
              caught instanceof Error ? caught.message : t('error.audioUnavailable');
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
