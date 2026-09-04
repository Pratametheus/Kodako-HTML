import { createSprite, type Sprite } from '../runtime/sprite/sprite';
import { newId } from './ids';
import type { AssetRef, Project, SpriteData } from './project';

export function spriteWorkspaceJson(sprite: SpriteData): Record<string, unknown> {
  return sprite.script ?? {};
}

export function withSpriteWorkspace(
  project: Project,
  spriteId: string,
  json: Record<string, unknown>,
): Project {
  return {
    ...project,
    meta: { ...project.meta, updatedAt: new Date().toISOString() },
    sprite: {
      ...project.sprite,
      sprites: project.sprite.sprites.map((sprite) =>
        sprite.id === spriteId ? { ...sprite, script: json } : sprite,
      ),
    },
  };
}

export function runtimeSpriteFrom(sprite: SpriteData): Sprite {
  return createSprite({
    id: sprite.id,
    name: sprite.name,
    x: sprite.x,
    y: sprite.y,
    direction: sprite.direction,
    size: sprite.size,
    visible: sprite.visible,
    costumeIndex: sprite.currentCostume,
    costumes: sprite.costumes.map((costume) => costume.assetId),
    variables: {},
    bubble: null,
  });
}

export function applyRuntimeSprite(sprite: SpriteData, runtime: Sprite): SpriteData {
  return {
    ...sprite,
    x: runtime.x,
    y: runtime.y,
    direction: runtime.direction,
    size: runtime.size,
    visible: runtime.visible,
    currentCostume: runtime.costumeIndex,
  };
}

const defaultCostume = (): AssetRef => ({ assetId: 'builtin:cat' });

export function addSprite(project: Project, name: string): { project: Project; spriteId: string } {
  const spriteId = newId('sprite');
  const sprite: SpriteData = {
    id: spriteId,
    name,
    x: 0,
    y: 0,
    direction: 90,
    size: 100,
    visible: true,
    costumes: [defaultCostume()],
    currentCostume: 0,
    sounds: [],
    script: {},
  };
  return {
    spriteId,
    project: {
      ...project,
      meta: { ...project.meta, updatedAt: new Date().toISOString() },
      sprite: {
        ...project.sprite,
        sprites: [...project.sprite.sprites, sprite],
      },
    },
  };
}

export function removeSprite(project: Project, spriteId: string): Project {
  if (project.sprite.sprites.length <= 1) {
    throw new Error('Tidak bisa menghapus sprite terakhir.');
  }
  return {
    ...project,
    meta: { ...project.meta, updatedAt: new Date().toISOString() },
    sprite: {
      ...project.sprite,
      sprites: project.sprite.sprites.filter((sprite) => sprite.id !== spriteId),
    },
  };
}
