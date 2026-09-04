import './sprite-mode.css';
import {
  Blockly,
  installSpriteBlockly,
  setCostumeOptionsProvider,
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
import { BUILTIN_BY_ID, resolveAssetUrl } from '../../../runtime/sprite/assets';
import { createSpriteEvents, type SpriteEvents } from '../../../runtime/sprite/event-bus';
import { createRuntimeContext, type RuntimeContext } from '../../../runtime/sprite/runtime-context';
import { createScheduler, type Scheduler } from '../../../runtime/sprite/scheduler';
import { createStage, type Stage } from '../../../runtime/sprite/stage';
import { t } from '../../i18n';
import { renderCostumePanel } from './costume-panel';
import { renderSpritePanel } from './sprite-panel';

export type SpriteModeDeps = {
  project: Project;
  markDirty: () => void;
  getThumbnail: { current: (() => string | undefined) | null };
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
          </div>
          <div class="sprite-tab-panel" data-panel="sprite"></div>
          <div class="sprite-tab-panel" data-panel="kostum" hidden></div>
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
    renderer: 'geras',
    trashcan: true,
    zoom: { controls: true, wheel: true },
    move: { scrollbars: true },
  });

  (window as Window & { __kodakoBlockly?: typeof Blockly }).__kodakoBlockly = Blockly;

  const currentSprite = (): SpriteData =>
    project.sprite.sprites.find((sprite) => sprite.id === selectedSpriteId) ??
    project.sprite.sprites[0]!;

  setCostumeOptionsProvider(() =>
    currentSprite().costumes.map((costume, index) => [
      BUILTIN_BY_ID.get(costume.assetId)?.name ?? `kostum${index + 1}`,
      String(index),
    ]),
  );

  let runtimeContext: RuntimeContext = createRuntimeContext(
    project.sprite.sprites.map(runtimeSpriteFrom),
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
    detachAnimation?.();
    detachAnimation = null;
    runtimeContext = createRuntimeContext(project.sprite.sprites.map(runtimeSpriteFrom));
    scheduler = createScheduler({
      ctx: runtimeContext,
      render: renderFrame,
      onHighlight: highlight,
      onBroadcastDone: (message) => events.broadcast(message),
    });
    events = createSpriteEvents({ ctx: runtimeContext, scheduler, onHighlight: highlight });
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
  const selectSprite = (spriteId: string): void => {
    if (spriteId === selectedSpriteId) return;
    persistWorkspace();
    selectedSpriteId = spriteId;
    loadWorkspace(spriteId);
    rebuildPrograms();
    spritePanel.refresh();
    costumePanel.refresh();
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
      deps.markDirty();
      stage.render();
    },
    onUpload: ({ dataUrl, name }) => {
      const assetId = newId('asset');
      project.assets[assetId] = { kind: 'image', name, source: 'embedded', ref: dataUrl };
      currentSprite().costumes.push({ assetId });
      deps.markDirty();
      stage.render();
    },
    onPick: (index) => {
      currentSprite().currentCostume = index;
      deps.markDirty();
      stage.render();
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
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    setCostumeOptionsProvider(() => [['kostum1', '0']]);
    __spriteModeHandle.current = null;
    host.innerHTML = '';
  };
}
