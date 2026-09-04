import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Blockly, installSpriteBlockly } from '../../src/blocks';
import { createEmptyProject } from '../../src/core/project';
import {
  __spriteModeHandle,
  renderSpriteMode,
  setSpriteWorkspaceFactoryForTests,
} from '../../src/app/editor/sprite-mode/sprite-mode';

installSpriteBlockly();

function scriptWithWait(): Record<string, unknown> {
  const workspace = new Blockly.Workspace();
  const hat = workspace.newBlock('sprite_hat_green_flag');
  const wait = workspace.newBlock('sprite_wait');
  const seconds = workspace.newBlock('math_number');
  seconds.setFieldValue('1', 'NUM');
  wait.getInput('SECS')!.connection!.connect(seconds.outputConnection!);
  hat.nextConnection!.connect(wait.previousConnection!);
  const json = Blockly.serialization.workspaces.save(workspace);
  workspace.dispose();
  return json;
}

describe('renderSpriteMode', () => {
  beforeEach(() => {
    setSpriteWorkspaceFactoryForTests(() => {
      const workspace = new Blockly.Workspace() as unknown as Blockly.WorkspaceSvg;
      workspace.highlightBlock = vi.fn();
      return workspace;
    });
    const context = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      setTransform: vi.fn(),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 20 })),
    } as unknown as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,x');
  });

  afterEach(() => {
    setSpriteWorkspaceFactoryForTests(null);
    vi.restoreAllMocks();
  });

  it('mounts Blockly, stage controls, and Sprite/Kostum tabs', () => {
    const host = document.createElement('div');
    const project = createEmptyProject('X');

    const cleanup = renderSpriteMode(host, {
      project,
      markDirty: vi.fn(),
      getThumbnail: { current: null },
    });

    expect(host.querySelector('#blocklyDiv')).not.toBeNull();
    expect(host.querySelector('canvas')).not.toBeNull();
    expect(host.querySelector('[data-green-flag]')).not.toBeNull();
    expect(host.querySelector('[data-stop]')).not.toBeNull();
    expect(host.querySelector('[data-tab="sprite"]')).not.toBeNull();
    expect(host.querySelector('[data-tab="kostum"]')).not.toBeNull();
    cleanup();
  });

  it('starts and stops a green-flag program', () => {
    const host = document.createElement('div');
    const project = createEmptyProject('X');
    project.sprite.sprites[0]!.script = scriptWithWait();
    const cleanup = renderSpriteMode(host, {
      project,
      markDirty: vi.fn(),
      getThumbnail: { current: null },
    });

    host.querySelector<HTMLButtonElement>('[data-green-flag]')!.click();
    expect(__spriteModeHandle.current?.isRunning()).toBe(true);
    host.querySelector<HTMLButtonElement>('[data-stop]')!.click();
    expect(__spriteModeHandle.current?.isRunning()).toBe(false);
    cleanup();
  });

  it('preserves separate workspaces while switching sprites', () => {
    const host = document.createElement('div');
    const project = createEmptyProject('X');
    project.sprite.sprites[0]!.script = scriptWithWait();
    const cleanup = renderSpriteMode(host, {
      project,
      markDirty: vi.fn(),
      getThumbnail: { current: null },
    });

    host.querySelector<HTMLButtonElement>('[data-add-sprite]')!.click();
    __spriteModeHandle.current!.workspace.newBlock('sprite_hat_clicked');
    host.querySelectorAll<HTMLButtonElement>('[data-sprite-id]')[0]!.click();
    expect(
      __spriteModeHandle.current!.workspace.getAllBlocks(false).map((block) => block.type),
    ).toContain('sprite_hat_green_flag');
    host.querySelectorAll<HTMLButtonElement>('[data-sprite-id]')[1]!.click();
    expect(
      __spriteModeHandle.current!.workspace.getAllBlocks(false).map((block) => block.type),
    ).toContain('sprite_hat_clicked');
    cleanup();
  });

  it('marks project data dirty for a non-UI Blockly change and cleans up fully', () => {
    const host = document.createElement('div');
    const markDirty = vi.fn();
    const cleanup = renderSpriteMode(host, {
      project: createEmptyProject('X'),
      markDirty,
      getThumbnail: { current: null },
    });
    const workspace = __spriteModeHandle.current!.workspace;

    workspace.fireChangeListener({ isUiEvent: false } as Blockly.Events.Abstract);
    expect(markDirty).toHaveBeenCalled();
    cleanup();

    expect(host.innerHTML).toBe('');
    expect(__spriteModeHandle.current).toBeNull();
  });
});
