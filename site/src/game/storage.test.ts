// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { load, save } from './storage';

const state = { flipped: [1, 2], mistakes: [3], startedAt: 1000 };

afterEach(() => localStorage.clear());

it('round-trips through localStorage and survives a missing key', () => {
  save('abc', state);
  expect(load('abc')).toEqual(state);
  expect(load('never-saved')).toBeNull();
});

it('survives storage being unavailable', () => {
  // Safari in private mode throws on setItem rather than returning; a game
  // that cannot save is still a game, so neither call may throw.
  const broken = () => {
    throw new Error('QuotaExceededError');
  };
  const original = { getItem: Storage.prototype.getItem, setItem: Storage.prototype.setItem };
  Storage.prototype.getItem = broken;
  Storage.prototype.setItem = broken;
  try {
    expect(() => save('abc', state)).not.toThrow();
    expect(load('abc')).toBeNull();
  } finally {
    Object.assign(Storage.prototype, original);
  }
});

it('ignores a stored value that is not a game', () => {
  localStorage.setItem('cbsbd3d:game:abc', '{"flipped":"nonsense"}');
  expect(load('abc')).toBeNull();
});
