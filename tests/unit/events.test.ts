import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../src/core/events';

type M = { ping: { n: number }; done: void };

describe('EventBus', () => {
  it('delivers payloads to listeners', () => {
    const bus = new EventBus<M>();
    const fn = vi.fn();
    bus.on('ping', fn);
    bus.emit('ping', { n: 7 });
    expect(fn).toHaveBeenCalledWith({ n: 7 });
  });

  it('stops delivery after the returned unsubscribe is called', () => {
    const bus = new EventBus<M>();
    const fn = vi.fn();
    const off = bus.on('ping', fn);
    off();
    bus.emit('ping', { n: 1 });
    expect(fn).not.toHaveBeenCalled();
  });

  it('supports multiple listeners and is safe with none', () => {
    const bus = new EventBus<M>();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('ping', a);
    bus.on('ping', b);
    expect(() => bus.emit('done', undefined as void)).not.toThrow();
    bus.emit('ping', { n: 2 });
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });
});
