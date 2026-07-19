import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../js/core/eventBus';

describe('EventBus', () => {
  it('delivers emitted payloads to subscribers', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('scoreChanged', handler);
    bus.emit('scoreChanged', { score: 50, delta: 50 });
    expect(handler).toHaveBeenCalledWith({ score: 50, delta: 50 });
  });

  it('supports multiple subscribers', () => {
    const bus = new EventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('enterVehicle', a);
    bus.on('enterVehicle', b);
    bus.emit('enterVehicle', { vehicleType: 'sedan' });
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });

  it('unsubscribes via the returned function', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const off = bus.on('exitVehicle', handler);
    off();
    bus.emit('exitVehicle', {});
    expect(handler).not.toHaveBeenCalled();
  });

  it('once() fires exactly once', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.once('playerDied', handler);
    bus.emit('playerDied', {});
    bus.emit('playerDied', {});
    expect(handler).toHaveBeenCalledOnce();
  });

  it('handlers that unsubscribe mid-dispatch do not break iteration', () => {
    const bus = new EventBus();
    const calls: string[] = [];
    const offA = bus.on('message', () => {
      calls.push('a');
      offA();
    });
    bus.on('message', () => calls.push('b'));
    bus.emit('message', { text: 'hi' });
    expect(calls).toEqual(['a', 'b']);
  });

  it('clear() removes all handlers', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('damage', handler);
    bus.clear();
    bus.emit('damage', { target: 'player', amount: 10 });
    expect(handler).not.toHaveBeenCalled();
  });
});
