import { describe, expect, it } from 'vitest';
import {
  bouncedIfOnEdge,
  createSprite,
  directionToRadians,
  moved,
  movedToXY,
  nextCostumeOf,
  normalizeDirection,
  pointedInDirection,
  resizedBy,
  saidText,
  turnedRight,
  withVariable,
} from '../../src/runtime/sprite/sprite';

const base = () => createSprite({ id: 's1', name: 'Sprite 1', costumes: ['a', 'b', 'c'] });

describe('sprite model', () => {
  it('createSprite applies Scratch defaults', () => {
    const s = base();
    expect(s).toMatchObject({
      x: 0,
      y: 0,
      direction: 90,
      size: 100,
      visible: true,
      costumeIndex: 0,
    });
  });

  it('moved: 10 steps facing right (90°) increases x by 10', () => {
    const s = moved(base(), 10);
    expect(s.x).toBeCloseTo(10);
    expect(s.y).toBeCloseTo(0);
  });

  it('moved: 10 steps facing up (0°) increases y by 10', () => {
    const s = moved(pointedInDirection(base(), 0), 10);
    expect(s.x).toBeCloseTo(0);
    expect(s.y).toBeCloseTo(10);
  });

  it('turnedRight adds to direction and normalizes', () => {
    expect(turnedRight(base(), 100).direction).toBeCloseTo(-170);
  });

  it('normalizeDirection wraps into (-180, 180]', () => {
    expect(normalizeDirection(270)).toBeCloseTo(-90);
    expect(normalizeDirection(-180)).toBeCloseTo(180);
  });

  it('movedToXY clamps to the stage', () => {
    expect(movedToXY(base(), 9999, -9999)).toMatchObject({ x: 240, y: -180 });
  });

  it('bouncedIfOnEdge flips direction and pulls back inside when past an edge', () => {
    const s = bouncedIfOnEdge(movedToXY(pointedInDirection(base(), 90), 240, 0));
    expect(s.x).toBeLessThanOrEqual(240);
    expect(Math.cos(directionToRadians(s.direction))).toBeLessThan(0); // now moving away from the right edge
  });

  it('nextCostumeOf wraps', () => {
    expect(nextCostumeOf({ ...base(), costumeIndex: 2 }).costumeIndex).toBe(0);
  });

  it('resizedBy clamps at a sane floor', () => {
    expect(resizedBy({ ...base(), size: 20 }, -100).size).toBeGreaterThanOrEqual(5);
  });

  it('saidText / withVariable are immutable', () => {
    const s = base();
    expect(saidText(s, 'Hi').bubble).toEqual({ kind: 'say', text: 'Hi' });
    expect(s.bubble).toBeNull();
    expect(withVariable(s, 'skor', 3).variables.skor).toBe(3);
    expect(s.variables.skor).toBeUndefined();
  });

  it('directionToRadians: 90° → 0 rad (points along +x)', () => {
    expect(Math.cos(directionToRadians(90))).toBeCloseTo(1);
    expect(Math.sin(directionToRadians(90))).toBeCloseTo(0);
  });
});
