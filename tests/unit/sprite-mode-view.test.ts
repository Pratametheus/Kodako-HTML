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

function scriptWithMove(steps: string): Record<string, unknown> {
  const workspace = new Blockly.Workspace();
  const hat = workspace.newBlock('sprite_hat_green_flag');
  const move = workspace.newBlock('sprite_move');
  const n = workspace.newBlock('math_number');
  n.setFieldValue(steps, 'NUM');
  move.getInput('STEPS')!.connection!.connect(n.outputConnection!);
  hat.nextConnection!.connect(move.previousConnection!);
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

  it('renders the sound panel and tracks pointer movement over the canvas', () => {
    const host = document.createElement('div');
    const cleanup = renderSpriteMode(host, {
      project: createEmptyProject('X'),
      markDirty: vi.fn(),
      getThumbnail: { current: null },
    });
    const canvas = host.querySelector('canvas')!;
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 480,
      bottom: 360,
      width: 480,
      height: 360,
      toJSON: () => ({}),
    });

    host.querySelector<HTMLButtonElement>('[data-tab="suara"]')!.click();
    expect(host.querySelectorAll('[data-builtin-sound]')).toHaveLength(8);
    expect(host.querySelector('[data-upload-sound]')).not.toBeNull();
    canvas.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, clientX: 240, clientY: 180, buttons: 1 }),
    );
    const debugWindow = window as Window & {
      __kodakoStage?: { pointer: () => { x: number; y: number; down: boolean } };
    };
    expect(debugWindow.__kodakoStage?.pointer()).toEqual({ x: 0, y: 0, down: true });
    cleanup();
  });

  it('runs a green-flag program to completion and moves the sprite', () => {
    // Drive the rAF loop deterministically: capture the callbacks and flush them.
    const rafCbs: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCbs.push(cb);
      return rafCbs.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const flush = (): void => {
      for (const cb of rafCbs.splice(0)) cb(0);
    };

    const host = document.createElement('div');
    const project = createEmptyProject('X');
    project.sprite.sprites[0]!.script = scriptWithMove('20');
    const cleanup = renderSpriteMode(host, {
      project,
      markDirty: vi.fn(),
      getThumbnail: { current: null },
    });

    host.querySelector<HTMLButtonElement>('[data-green-flag]')!.click();
    expect(__spriteModeHandle.current?.isRunning()).toBe(true); // thread queued, not yet ticked
    flush(); // scheduler.tick: `gerak 20 langkah` executes, thread finishes

    expect(__spriteModeHandle.current?.isRunning()).toBe(false);
    expect(project.sprite.sprites[0]!.x).toBeCloseTo(20);

    host.querySelector<HTMLButtonElement>('[data-stop]')!.click();
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
