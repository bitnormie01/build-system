import { test, expect, vi } from 'vitest';
import { ManualClock } from './clock.js';

test('ManualClock fires a timer only after enough virtual time advances', () => {
  const clock = new ManualClock();
  const fn = vi.fn();
  clock.setTimer(fn, 100);
  clock.advance(50);
  expect(fn).not.toHaveBeenCalled();
  clock.advance(50);
  expect(fn).toHaveBeenCalledTimes(1);
  expect(clock.now()).toBe(100);
});

test('ManualClock fires timers in fireAt order and honors clearTimer', () => {
  const clock = new ManualClock();
  const order: string[] = [];
  clock.setTimer(() => order.push('b'), 200);
  clock.setTimer(() => order.push('a'), 100);
  const c = clock.setTimer(() => order.push('c'), 150);
  clock.clearTimer(c);
  clock.advance(500);
  expect(order).toEqual(['a', 'b']);
});

test('ManualClock runs timers scheduled during firing', () => {
  const clock = new ManualClock();
  const seen: number[] = [];
  clock.setTimer(() => {
    seen.push(clock.now());
    clock.setTimer(() => seen.push(clock.now()), 10);
  }, 100);
  clock.advance(200);
  expect(seen).toEqual([100, 110]);
});
