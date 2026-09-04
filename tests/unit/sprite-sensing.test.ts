import { describe, expect, it } from 'vitest';
import {
  aabbOverlap,
  colorsMatch,
  distance,
  pointInBounds,
  spriteBounds,
  touchesEdge,
  type Bounds,
} from '../../src/runtime/sprite/sensing';
import { createSprite } from '../../src/runtime/sprite/sprite';

const bounds = (left: number, right: number, top: number, bottom: number): Bounds => ({
  left,
  right,
  top,
  bottom,
});

describe('sprite sensing geometry', () => {
  it('computes axis-aligned bounds from natural costume size and sprite scale', () => {
    const sprite = createSprite({ id: 's1', name: 'Sprite 1', x: 0, y: 0, size: 100 });
    expect(spriteBounds(sprite, { width: 80, height: 80 })).toEqual(bounds(-40, 40, 40, -40));
    expect(spriteBounds({ ...sprite, size: 50 }, { width: 80, height: 80 })).toEqual(
      bounds(-20, 20, 20, -20),
    );
  });

  it('detects overlap, separation, and touching AABB edges', () => {
    const first = bounds(-10, 10, 10, -10);
    expect(aabbOverlap(first, bounds(5, 15, 5, -5))).toBe(true);
    expect(aabbOverlap(first, bounds(11, 20, 10, -10))).toBe(false);
    expect(aabbOverlap(first, bounds(10, 20, 10, -10))).toBe(true);
  });

  it('checks points inclusively against bounds', () => {
    const box = bounds(-10, 10, 10, -10);
    expect(pointInBounds(0, 0, box)).toBe(true);
    expect(pointInBounds(10, -10, box)).toBe(true);
    expect(pointInBounds(11, 0, box)).toBe(false);
  });

  it('detects any bound at or beyond the stage edge', () => {
    expect(touchesEdge(bounds(200, 240, 20, -20))).toBe(true);
    expect(touchesEdge(bounds(-20, 20, 20, -20))).toBe(false);
  });

  it('computes Euclidean distance', () => {
    expect(distance(0, 0, 3, 4)).toBe(5);
  });

  it('matches RGB channels within the inclusive tolerance', () => {
    expect(colorsMatch(0xe5, 0x39, 0x35, '#e53935')).toBe(true);
    expect(colorsMatch(0, 0, 0, '#e53935')).toBe(false);
    expect(colorsMatch(0xe5 + 24, 0x39 - 24, 0x35 + 24, '#e53935', 24)).toBe(true);
    expect(colorsMatch(0xe5 + 25, 0x39, 0x35, '#e53935', 24)).toBe(false);
  });
});
