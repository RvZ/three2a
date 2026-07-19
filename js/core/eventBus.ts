/**
 * A tiny, typed publish/subscribe event bus.
 *
 * Decouples systems that used to reach into each other through the `Game`
 * god-object: e.g. the collision manager can emit `entityKilled` without
 * knowing the HUD or sound manager exist, and those subscribe independently.
 */

/** The event catalogue and each event's payload type. Extend as needed. */
export interface GameEvents {
  enterVehicle: { vehicleType: string };
  exitVehicle: Record<string, never>;
  entityKilled: { kind: 'pedestrian' | 'vehicle'; points: number };
  crash: { x: number; z: number; intensity: number };
  scoreChanged: { score: number; delta: number };
  damage: { target: 'player' | 'npc' | 'vehicle'; amount: number };
  playerDied: Record<string, never>;
  wantedChanged: { level: number };
  message: { text: string; duration?: number };
}

type EventName = keyof GameEvents;
type Handler<K extends EventName> = (payload: GameEvents[K]) => void;
type AnyHandler = (payload: unknown) => void;

export class EventBus {
  // Stored untyped internally; the public methods enforce the typed contract.
  private readonly handlers = new Map<EventName, Set<AnyHandler>>();

  /** Subscribe to an event. Returns an unsubscribe function. */
  on<K extends EventName>(event: K, handler: Handler<K>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set<AnyHandler>();
      this.handlers.set(event, set);
    }
    set.add(handler as AnyHandler);
    return () => this.off(event, handler);
  }

  /** Subscribe to an event for a single firing. */
  once<K extends EventName>(event: K, handler: Handler<K>): () => void {
    const off = this.on(event, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  /** Unsubscribe a previously registered handler. */
  off<K extends EventName>(event: K, handler: Handler<K>): void {
    this.handlers.get(event)?.delete(handler as AnyHandler);
  }

  /** Emit an event to all current subscribers. */
  emit<K extends EventName>(event: K, payload: GameEvents[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    // Copy so handlers that unsubscribe during dispatch don't corrupt iteration.
    for (const handler of [...set]) {
      handler(payload);
    }
  }

  /** Remove every handler (used on teardown/restart). */
  clear(): void {
    this.handlers.clear();
  }
}
