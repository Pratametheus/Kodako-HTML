import type { SpriteData } from '../../../core/project';

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
  void deps;
  const refresh = (): void => {
    host.innerHTML = '<p class="sprite-panel__empty">Pilih dan kelola kostum sprite di sini.</p>';
  };
  refresh();
  return { refresh, dispose: () => (host.innerHTML = '') };
}
