export interface TimerHandle { readonly id: number; }

export interface Clock {
  now(): number;
  setTimer(fn: () => void, ms: number): TimerHandle;
  clearTimer(handle: TimerHandle): void;
}

export class ManualClock implements Clock {
  private current = 0;
  private nextId = 1;
  private readonly timers = new Map<number, { fireAt: number; fn: () => void }>();

  now(): number {
    return this.current;
  }

  setTimer(fn: () => void, ms: number): TimerHandle {
    const id = this.nextId++;
    this.timers.set(id, { fireAt: this.current + Math.max(0, ms), fn });
    return { id };
  }

  clearTimer(handle: TimerHandle): void {
    this.timers.delete(handle.id);
  }

  advance(ms: number): void {
    const target = this.current + Math.max(0, ms);
    for (;;) {
      let dueId: number | null = null;
      let dueAt = Infinity;
      for (const [id, t] of this.timers) {
        if (t.fireAt <= target && t.fireAt < dueAt) {
          dueId = id;
          dueAt = t.fireAt;
        }
      }
      if (dueId === null) break;
      const t = this.timers.get(dueId);
      this.timers.delete(dueId);
      if (t) {
        this.current = t.fireAt;
        t.fn();
      }
    }
    this.current = target;
  }
}

export class SystemClock implements Clock {
  private nextId = 1;
  private readonly handles = new Map<number, ReturnType<typeof setTimeout>>();

  now(): number {
    return Date.now();
  }

  setTimer(fn: () => void, ms: number): TimerHandle {
    const id = this.nextId++;
    const handle = setTimeout(() => {
      this.handles.delete(id);
      fn();
    }, ms);
    this.handles.set(id, handle);
    return { id };
  }

  clearTimer(handle: TimerHandle): void {
    const t = this.handles.get(handle.id);
    if (t !== undefined) {
      clearTimeout(t);
      this.handles.delete(handle.id);
    }
  }
}
