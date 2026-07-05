import { test, expect } from 'vitest';
import { resolveMode } from './mode.js';

test('defaults to mock when DEADMAN_MODE is unset', () => {
  expect(resolveMode({})).toBe('mock');
});
test('accepts mock and live', () => {
  expect(resolveMode({ DEADMAN_MODE: 'mock' })).toBe('mock');
  expect(resolveMode({ DEADMAN_MODE: 'live' })).toBe('live');
});
test('throws on an invalid mode', () => {
  expect(() => resolveMode({ DEADMAN_MODE: 'staging' })).toThrow(/DEADMAN_MODE/);
});
