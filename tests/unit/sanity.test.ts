import { describe, expect, it } from 'vitest';

describe('toolchain', () => {
  it('runs vitest with jsdom', () => {
    expect(typeof document).toBe('object');
    document.body.innerHTML = '<p id="x">hi</p>';
    expect(document.getElementById('x')?.textContent).toBe('hi');
  });
});
