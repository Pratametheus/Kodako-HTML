import './sprite-mode.css';
import {
  Blockly,
  installSpriteBlockly,
  setCostumeOptionsProvider,
  setSensingTargetsProvider,
  setSoundOptionsProvider,
  spriteTheme,
} from '../../../blocks';
import { spriteToolbox } from '../../../blocks/sprite/toolbox';
import { newId } from '../../../core/ids';
import type { Project, SpriteData } from '../../../core/project';
import {
  addSprite,
  applyRuntimeSprite,
  removeSprite,
  runtimeSpriteFrom,
  spriteWorkspaceJson,
  withSpriteWorkspace,
} from '../../../core/sprite-project';
import { BUILTIN_BY_ID, BUILTIN_SOUNDS, resolveAssetUrl } from '../../../runtime/sprite/assets';
import { createAudioEngine, type AudioEngine } from '../../../runtime/sprite/audio';
import { createSpriteEvents, type SpriteEvents } from '../../../runtime/sprite/event-bus';
import {
  createRuntimeContext,
  setMouse,
  type RuntimeContext,
} from '../../../runtime/sprite/runtime-context';
import { createScheduler, type Scheduler } from '../../../runtime/sprite/scheduler';
import { createStage, type Stage } from '../../../runtime/sprite/stage';
import { t } from '../../i18n';
import { renderCostumePanel } from './costume-panel';
import { renderSoundPanel } from './sound-panel';
import { renderSpritePanel } from './sprite-panel';

export type SpriteModeDeps = {
  project: Project;
  markDirty: () => void;
  getThumbnail: { current: (() => string | undefined) | null };
  audioEngine?: AudioEngine;
};

type WorkspaceFactory = (
  host: HTMLElement,
  options: Parameters<typeof Blockly.inject>[1],
) => Blockly.WorkspaceSvg;

let testWorkspaceFactory: WorkspaceFactory | null = null;

export function setSpriteWorkspaceFactoryForTests(factory: WorkspaceFactory | null): void {
  testWorkspaceFactory = factory;
}

export const __spriteModeHandle: {
  current: { isRunning: () => boolean; workspace: Blockly.WorkspaceSvg } | null;
} = { current: null };

function replaceProject(target: Project, next: Project): void {
  Object.assign(target, next);
}

export function renderSpriteMode(host: HTMLElement, deps: SpriteModeDeps): () => void {
  installSpriteBlockly();
  const project = deps.project;
  let selectedSpriteId = project.sprite.sprites[0]!.id;
  let loadingWorkspace = false;
  let disposed = false;
  let runActive = false;
  let detachAnimation: (() => void) | null = null;

  host.innerHTML = `
    <div class="sprite-mode">
      <section class="sprite-mode__blocks" aria-label="Area blok">
        <div id="blocklyDiv"></div>
      </section>
      <aside class="sprite-mode__side">
        <section class="sprite-stage-card" aria-label="Panggung">
          <canvas aria-label="Panggung sprite"></canvas>
          <div class="sprite-stage-toolbar">
            <button type="button" data-green-flag>▶ ${t('editor.sprite.run')}</button>
            <button type="button" data-stop>■ ${t('editor.sprite.stop')}</button>
          </div>
        </section>
        <section class="sprite-inspector">
          <div class="sprite-tabs" role="tablist">
            <button type="button" role="tab" data-tab="sprite" aria-selected="true">${t('editor.sprite.tabSprite')}</button>
            <button type="button" role="tab" data-tab="kostum" aria-selected="false">${t('editor.sprite.tabCostume')}</button>
            <button type="button" role="tab" data-tab="suara" aria-selected="false">${t('editor.sprite.tabSound')}</button>
          </div>
          <div class="sprite-tab-panel" data-panel="sprite"></div>
          <div class="sprite-tab-panel" data-panel="kostum" hidden></div>
          <div class="sprite-tab-panel" data-panel="suara" hidden></div>
        </section>
      </aside>
    </div>
  `;

  const blocklyHost = host.querySelector<HTMLElement>('#blocklyDiv')!;
  const workspace = (
    testWorkspaceFactory ?? ((element, options) => Blockly.inject(element, options))
  )(blocklyHost, {
    toolbox: spriteToolbox,
    theme: spriteTheme,
    renderer: 'zelos',
    trashcan: true,
    zoom: { controls: true, wheel: true },
    move: { scrollbars: true },
  });

  const debugWindow = window as Window & {
    Blockly?: Partial<typeof Blockly> & { getMainWorkspace?: () => Blockly.WorkspaceSvg };
    __kodakoBlockly?: typeof Blockly & { getMainWorkspace: () => Blockly.WorkspaceSvg };
    __kodakoStage?: {
      spriteState: () => {
        id: string;
        x: number;
        y: number;
        direction: number;
        bubble: string | null;
      }[];
      isRunning: () => boolean;
      pointer: () => { x: number; y: number; down: boolean };
      lastSound: () => string | null;
      answerValue: () => string;
    };
  };
  debugWindow.__kodakoBlockly = { ...Blockly, getMainWorkspace: () => workspace };
  debugWindow.Blockly = Object.assign(debugWindow.Blockly ?? {}, debugWindow.__kodakoBlockly);

  const currentSprite = (): SpriteData =>
    project.sprite.sprites.find((sprite) => sprite.id === selectedSpriteId) ??
    project.sprite.sprites[0]!;

  setCostumeOptionsProvider(() =>
    currentSprite().costumes.map((costume, index) => [
      BUILTIN_BY_ID.get(costume.assetId)?.name ?? `kostum${index + 1}`,
      String(index),
    ]),
  );
  setSoundOptionsProvider(() => {
    const options = currentSprite().sounds.map((sound, index): [string, string] => [
      BUILTIN_BY_ID.get(sound.assetId)?.name ??
        project.assets[sound.assetId]?.name ??
        `suara${index + 1}`,
      sound.assetId,
    ]);
    return options.length > 0 ? options : [['(tidak ada suara)', '']];
  });
  setSensingTargetsProvider(() =>
    project.sprite.sprites
      .filter((sprite) => sprite.id !== selectedSpriteId)
      .map((sprite): [string, string] => [sprite.name, sprite.name]),
  );

  const audioEngine = deps.audioEngine ?? createAudioEngine();
  let lastSoundId: string | null = null;
  const rememberSound = (url: string): void => {
    lastSoundId =
      BUILTIN_SOUNDS.find((sound) => sound.url === url)?.id ??
      Object.entries(project.assets).find(([, asset]) => asset.ref === url)?.[0] ??
      url;
  };
  const audio: AudioEngine = {
    play: (url, spriteId) => {
      rememberSound(url);
      audioEngine.play(url, spriteId);
    },
    playUntilDone: (url, spriteId) => {
      rememberSound(url);
      return audioEngine.playUntilDone(url, spriteId);
    },
    stopAll: () => audioEngine.stopAll(),
    changeVolume: (spriteId, delta) => audioEngine.changeVolume(spriteId, delta),
    setVolume: (spriteId, percent) => audioEngine.setVolume(spriteId, percent),
    getVolume: (spriteId) => audioEngine.getVolume(spriteId),
    dispose: () => audioEngine.dispose(),
  };
  let runtimeContext: RuntimeContext = createRuntimeContext(
    project.sprite.sprites.map(runtimeSpriteFrom),
    { audio, assets: project.assets },
  );
  const canvas = host.querySelector<HTMLCanvasElement>('canvas')!;
  const stage: Stage = createStage(canvas, () => ({
    sprites: project.sprite.sprites.map(
      (sprite) => runtimeContext.sprites.get(sprite.id) ?? runtimeSpriteFrom(sprite),
    ),
    backdropUrl: resolveAssetUrl(
      project.sprite.stage.backdrop?.assetId ?? 'builtin:bg-plain',
      project.assets,
    ),
    costumeUrlFor: (sprite) =>
      resolveAssetUrl(sprite.costumes[sprite.costumeIndex] ?? '', project.assets),
  }));

  const highlight = (id: string | null): void => workspace.highlightBlock(id);
  let scheduler: Scheduler;
  let events: SpriteEvents;

  const persistRuntime = (): void => {
    project.sprite.sprites = project.sprite.sprites.map((sprite) => {
      const runtime = runtimeContext.sprites.get(sprite.id);
      return runtime ? applyRuntimeSprite(sprite, runtime) : sprite;
    });
    project.meta.updatedAt = new Date().toISOString();
  };

  const finishRun = (): void => {
    if (!runActive) return;
    runActive = false;
    detachAnimation?.();
    detachAnimation = null;
    persistRuntime();
    stage.render();
    deps.getThumbnail.current = () => stage.thumbnail();
    deps.markDirty();
  };

  const renderFrame = (): void => {
    stage.render();
    if (runActive && !scheduler.isRunning()) finishRun();
  };

  const makeRuntime = (): void => {
    audio.stopAll();
    detachAnimation?.();
    detachAnimation = null;
    runtimeContext = createRuntimeContext(project.sprite.sprites.map(runtimeSpriteFrom), {
      audio,
      assets: project.assets,
    });
    const pointer = stage.pointer();
    setMouse(runtimeContext, pointer.x, pointer.y, pointer.down);
    scheduler = createScheduler({
      ctx: runtimeContext,
      render: renderFrame,
      onHighlight: highlight,
      onBroadcastDone: (message) => events.broadcast(message),
      playSound: (url, spriteId) => audio.playUntilDone(url, spriteId),
      onAsk: (question, submit) => stage.showAsk(question, submit),
      onAskCancel: () => stage.hideAsk(),
    });
    events = createSpriteEvents({
      ctx: runtimeContext,
      scheduler,
      onHighlight: highlight,
      stage,
    });
  };

  makeRuntime();

  const loadWorkspace = (spriteId: string): void => {
    const sprite = project.sprite.sprites.find((candidate) => candidate.id === spriteId);
    if (!sprite) return;
    loadingWorkspace = true;
    workspace.clear();
    const json = spriteWorkspaceJson(sprite);
    if (Object.keys(json).length > 0) Blockly.serialization.workspaces.load(json, workspace);
    loadingWorkspace = false;
  };

  const persistWorkspace = (markDirty = true): void => {
    if (loadingWorkspace || disposed) return;
    const json = Blockly.serialization.workspaces.save(workspace) as Record<string, unknown>;
    replaceProject(project, withSpriteWorkspace(project, selectedSpriteId, json));
    if (markDirty) deps.markDirty();
  };

  const rebuildPrograms = (): void => {
    const programs = [];
    const temporary: Blockly.Workspace[] = [];
    for (const sprite of project.sprite.sprites) {
      if (sprite.id === selectedSpriteId) {
        programs.push({ spriteId: sprite.id, workspace });
        continue;
      }
      const otherWorkspace = new Blockly.Workspace();
      temporary.push(otherWorkspace);
      const json = spriteWorkspaceJson(sprite);
      if (Object.keys(json).length > 0) Blockly.serialization.workspaces.load(json, otherWorkspace);
      programs.push({ spriteId: sprite.id, workspace: otherWorkspace });
    }
    events.rebuild(programs);
    temporary.forEach((otherWorkspace) => otherWorkspace.dispose());
  };

  loadWorkspace(selectedSpriteId);
  rebuildPrograms();
  stage.render();
  deps.getThumbnail.current = () => stage.thumbnail();

  const spritePanelHost = host.querySelector<HTMLElement>('[data-panel="sprite"]')!;
  const costumePanelHost = host.querySelector<HTMLElement>('[data-panel="kostum"]')!;
  const soundPanelHost = host.querySelector<HTMLElement>('[data-panel="suara"]')!;
  const selectSprite = (spriteId: string): void => {
    if (spriteId === selectedSpriteId) return;
    persistWorkspace();
    selectedSpriteId = spriteId;
    loadWorkspace(spriteId);
    rebuildPrograms();
    spritePanel.refresh();
    costumePanel.refresh();
    soundPanel.refresh();
    stage.render();
  };

  const spritePanel = renderSpritePanel(spritePanelHost, {
    getProject: () => project,
    getSelectedId: () => selectedSpriteId,
    onSelect: selectSprite,
    onAdd: () => {
      persistWorkspace();
      const added = addSprite(
        project,
        `${t('editor.sprite.addSprite').replace('+ ', '')} ${project.sprite.sprites.length + 1}`,
      );
      replaceProject(project, added.project);
      selectedSpriteId = added.spriteId;
      loadWorkspace(selectedSpriteId);
      rebuildPrograms();
      spritePanel.refresh();
      costumePanel.refresh();
      soundPanel.refresh();
      stage.render();
      deps.markDirty();
    },
    onRemove: (spriteId) => {
      try {
        replaceProject(project, removeSprite(project, spriteId));
      } catch {
        return;
      }
      selectedSpriteId = project.sprite.sprites[0]!.id;
      loadWorkspace(selectedSpriteId);
      rebuildPrograms();
      spritePanel.refresh();
      costumePanel.refresh();
      soundPanel.refresh();
      stage.render();
      deps.markDirty();
    },
    onRename: (spriteId, name) => {
      const sprite = project.sprite.sprites.find((candidate) => candidate.id === spriteId);
      if (!sprite) return;
      sprite.name = name;
      project.meta.updatedAt = new Date().toISOString();
      deps.markDirty();
    },
    onField: (patch) => {
      Object.assign(currentSprite(), patch);
      project.meta.updatedAt = new Date().toISOString();
      runtimeContext.sprites.set(selectedSpriteId, runtimeSpriteFrom(currentSprite()));
      deps.markDirty();
      stage.render();
    },
  });

  const costumePanel = renderCostumePanel(costumePanelHost, {
    getSelectedSprite: currentSprite,
    onAddBuiltin: (assetId) => {
      currentSprite().costumes.push({ assetId });
      costumePanel.refresh();
      deps.markDirty();
      stage.render();
    },
    onUpload: ({ dataUrl, name }) => {
      const assetId = newId('asset');
      project.assets[assetId] = { kind: 'image', name, source: 'embedded', ref: dataUrl };
      currentSprite().costumes.push({ assetId });
      costumePanel.refresh();
      deps.markDirty();
      stage.render();
    },
    onPick: (index) => {
      currentSprite().currentCostume = index;
      costumePanel.refresh();
      deps.markDirty();
      stage.render();
    },
  });

  const soundPanel = renderSoundPanel(soundPanelHost, {
    getSelectedSprite: currentSprite,
    assetName: (assetId, index) =>
      BUILTIN_BY_ID.get(assetId)?.name ?? project.assets[assetId]?.name ?? `suara${index + 1}`,
    onAddBuiltin: (assetId) => {
      if (!currentSprite().sounds.some((sound) => sound.assetId === assetId)) {
        currentSprite().sounds.push({ assetId });
        soundPanel.refresh();
        deps.markDirty();
      }
    },
    onUpload: ({ dataUrl, name }) => {
      const assetId = newId('asset');
      project.assets[assetId] = { kind: 'sound', name, source: 'embedded', ref: dataUrl };
      currentSprite().sounds.push({ assetId });
      soundPanel.refresh();
      deps.markDirty();
      audio.play(dataUrl, selectedSpriteId);
    },
    onPreview: (assetId) => {
      const url = resolveAssetUrl(assetId, project.assets);
      if (url) audio.play(url, selectedSpriteId);
    },
  });

  const onWorkspaceChange = (event: Blockly.Events.Abstract): void => {
    if (event.isUiEvent || loadingWorkspace) return;
    persistWorkspace();
    rebuildPrograms();
  };
  workspace.addChangeListener(onWorkspaceChange);

  const greenButton = host.querySelector<HTMLButtonElement>('[data-green-flag]')!;
  const stopButton = host.querySelector<HTMLButtonElement>('[data-stop]')!;
  const onGreenFlag = (): void => {
    persistWorkspace();
    lastSoundId = null;
    makeRuntime();
    rebuildPrograms();
    events.greenFlag();
    runActive = scheduler.isRunning();
    stage.render();
    if (runActive && typeof window.requestAnimationFrame === 'function') {
      detachAnimation = scheduler.attach(window);
    }
  };
  const onStop = (): void => {
    scheduler.stopAll();
    audio.stopAll();
    if (runActive) finishRun();
    else {
      deps.getThumbnail.current = () => stage.thumbnail();
      stage.render();
    }
  };
  greenButton.addEventListener('click', onGreenFlag);
  stopButton.addEventListener('click', onStop);

  const onCanvasClick = (event: MouseEvent): void => {
    const spriteId = stage.hitTest(event.clientX, event.clientY);
    if (!spriteId) return;
    if (scheduler.isRunning()) events.spriteClicked(spriteId);
    else selectSprite(spriteId);
  };
  canvas.addEventListener('click', onCanvasClick);

  const updatePointer = (event: MouseEvent, down: boolean): void => {
    stage.setPointer(event.clientX, event.clientY, down);
    const pointer = stage.pointer();
    setMouse(runtimeContext, pointer.x, pointer.y, pointer.down);
  };
  const onPointerMove = (event: MouseEvent): void =>
    updatePointer(event, (event.buttons & 1) === 1);
  const onPointerDown = (event: MouseEvent): void => updatePointer(event, true);
  const onPointerUp = (event: MouseEvent): void => updatePointer(event, false);
  canvas.addEventListener('mousemove', onPointerMove);
  canvas.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mouseup', onPointerUp);

  const onKeyDown = (event: KeyboardEvent): void => {
    if (scheduler.isRunning()) events.keyDown(event.key);
  };
  const onKeyUp = (event: KeyboardEvent): void => {
    if (scheduler.isRunning()) events.keyUp(event.key);
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  host.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab!;
      host
        .querySelectorAll<HTMLButtonElement>('[data-tab]')
        .forEach((candidate) =>
          candidate.setAttribute('aria-selected', String(candidate === button)),
        );
      host.querySelectorAll<HTMLElement>('[data-panel]').forEach((panel) => {
        panel.hidden = panel.dataset.panel !== tab;
      });
    });
  });

  __spriteModeHandle.current = {
    workspace,
    isRunning: () => scheduler.isRunning(),
  };
  debugWindow.__kodakoStage = {
    // Read the live runtime context (mutated every frame by the scheduler) so the
    // hook reflects mid-run coordinates, not the pre-run snapshot in project data.
    spriteState: () =>
      [...runtimeContext.sprites.values()].map((sprite) => ({
        id: sprite.id,
        x: sprite.x,
        y: sprite.y,
        direction: sprite.direction,
        bubble: sprite.bubble?.text ?? null,
      })),
    isRunning: () => scheduler.isRunning(),
    pointer: () => stage.pointer(),
    lastSound: () => lastSoundId,
    answerValue: () => runtimeContext.answer,
  };

  return () => {
    persistWorkspace(false);
    disposed = true;
    detachAnimation?.();
    scheduler.stopAll();
    workspace.removeChangeListener(onWorkspaceChange);
    workspace.dispose();
    stage.dispose();
    spritePanel.dispose();
    costumePanel.dispose();
    soundPanel.dispose();
    audio.dispose();
    canvas.removeEventListener('mousemove', onPointerMove);
    canvas.removeEventListener('mousedown', onPointerDown);
    window.removeEventListener('mouseup', onPointerUp);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    setCostumeOptionsProvider(() => [['kostum1', '0']]);
    setSoundOptionsProvider(() => [['(tidak ada suara)', '']]);
    setSensingTargetsProvider(() => []);
    __spriteModeHandle.current = null;
    host.innerHTML = '';
  };
}
