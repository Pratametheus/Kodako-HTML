import { describe, expect, it, vi } from 'vitest';
import { createEmptyProject } from '../../src/core/project';
import { addSprite } from '../../src/core/sprite-project';
import { renderCostumePanel } from '../../src/app/editor/sprite-mode/costume-panel';
import { renderSpritePanel } from '../../src/app/editor/sprite-mode/sprite-panel';

describe('sprite panel', () => {
  it('renders chips, add/remove actions, and numeric fields', () => {
    const host = document.createElement('div');
    let project = createEmptyProject('X');
    const onAdd = vi.fn();
    const onRemove = vi.fn();
    const onField = vi.fn();
    const panel = renderSpritePanel(host, {
      getProject: () => project,
      getSelectedId: () => project.sprite.sprites[0]!.id,
      onSelect: vi.fn(),
      onAdd,
      onRemove,
      onRename: vi.fn(),
      onField,
    });

    expect(host.querySelectorAll('[data-sprite-id]')).toHaveLength(1);
    host.querySelector<HTMLButtonElement>('[data-add-sprite]')!.click();
    expect(onAdd).toHaveBeenCalledOnce();
    const x = host.querySelector<HTMLInputElement>('[data-sprite-field="x"]')!;
    x.value = '42';
    x.dispatchEvent(new Event('change'));
    expect(onField).toHaveBeenCalledWith({ x: 42 });
    expect(host.querySelector<HTMLButtonElement>('[data-remove-sprite]')!.disabled).toBe(true);

    project = addSprite(project, 'Dua').project;
    panel.refresh();
    expect(host.querySelectorAll('[data-sprite-id]')).toHaveLength(2);
    expect(host.querySelector<HTMLButtonElement>('[data-remove-sprite]')!.disabled).toBe(false);
    host.querySelector<HTMLButtonElement>('[data-remove-sprite]')!.click();
    expect(onRemove).toHaveBeenCalled();
  });
});

describe('costume panel', () => {
  it('renders builtin/current costumes and accepts an image upload', async () => {
    const host = document.createElement('div');
    const sprite = createEmptyProject('X').sprite.sprites[0]!;
    const onAddBuiltin = vi.fn();
    const onUpload = vi.fn();
    const onPick = vi.fn();
    renderCostumePanel(host, {
      getSelectedSprite: () => sprite,
      onAddBuiltin,
      onUpload,
      onPick,
    });

    const builtinTiles = host.querySelectorAll<HTMLButtonElement>('[data-builtin-costume]');
    expect(builtinTiles).toHaveLength(15);
    builtinTiles[1]!.click();
    expect(onAddBuiltin).toHaveBeenCalledWith('builtin:ball');

    host.querySelector<HTMLButtonElement>('[data-current-costume="0"]')!.click();
    expect(onPick).toHaveBeenCalledWith(0);

    const input = host.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File([new Uint8Array([1, 2, 3])], 'baru.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(onUpload).toHaveBeenCalled());
    expect(onUpload.mock.calls[0]![0]).toMatchObject({
      name: 'baru.png',
      dataUrl: expect.stringMatching(/^data:image\/png/),
    });
  });
});
