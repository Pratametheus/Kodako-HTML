import { describe, expect, it } from 'vitest';
import { createEmptyProject, validate } from '../../src/core/project';
import {
  addSprite,
  applyRuntimeSprite,
  removeSprite,
  runtimeSpriteFrom,
  spriteWorkspaceJson,
  withSpriteWorkspace,
} from '../../src/core/sprite-project';

describe('sprite project wiring', () => {
  it('creates a valid project with the builtin cat costume', () => {
    const project = createEmptyProject('X');

    expect(project.sprite.sprites[0]!.costumes).toEqual([{ assetId: 'builtin:cat' }]);
    expect(project.assets['builtin:cat']).toMatchObject({
      source: 'builtin',
      kind: 'image',
      ref: 'builtin:cat',
    });
    expect(validate(project).ok).toBe(true);
  });

  it('immutably round-trips a sprite Blockly workspace', () => {
    const project = createEmptyProject('X');
    const spriteId = project.sprite.sprites[0]!.id;
    const json = { blocks: { languageVersion: 0, blocks: [] } };

    const next = withSpriteWorkspace(project, spriteId, json);

    expect(next).not.toBe(project);
    expect(spriteWorkspaceJson(next.sprite.sprites[0]!)).toEqual(json);
    expect(spriteWorkspaceJson(project.sprite.sprites[0]!)).toEqual({});
    expect(next.meta.updatedAt).not.toBe('');
  });

  it('maps runtime fields to and from SpriteData', () => {
    const sprite = createEmptyProject('X').sprite.sprites[0]!;
    const runtime = runtimeSpriteFrom({
      ...sprite,
      x: 12,
      y: -8,
      direction: -45,
      size: 120,
      visible: false,
    });

    expect(runtime).toMatchObject({
      x: 12,
      y: -8,
      direction: -45,
      size: 120,
      visible: false,
      costumes: ['builtin:cat'],
    });
    const stored = applyRuntimeSprite(sprite, { ...runtime, x: 30, costumeIndex: 0 });
    expect(stored).toMatchObject({ x: 30, y: -8, direction: -45, currentCostume: 0 });
  });

  it('adds distinct sprites with complete defaults', () => {
    const project = createEmptyProject('X');
    const added = addSprite(project, 'Sprite Baru');

    expect(added.project.sprite.sprites).toHaveLength(2);
    expect(added.spriteId).not.toBe(project.sprite.sprites[0]!.id);
    expect(added.project.sprite.sprites[1]).toMatchObject({
      id: added.spriteId,
      name: 'Sprite Baru',
      costumes: [{ assetId: 'builtin:cat' }],
      sounds: [],
      script: {},
    });
  });

  it('removes a sprite but refuses to remove the last one', () => {
    const project = createEmptyProject('X');
    expect(() => removeSprite(project, project.sprite.sprites[0]!.id)).toThrow(/terakhir/i);

    const added = addSprite(project, 'Dua');
    const removed = removeSprite(added.project, added.spriteId);
    expect(removed.sprite.sprites).toHaveLength(1);
  });
});
