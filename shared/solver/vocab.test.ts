import { describe, expect, it } from 'vitest';
import {
  FLAVOUR,
  NAMES,
  PROFESSIONS,
  TITLES,
  faceOf,
  namesFor,
  professionsFor,
} from './vocab';

describe('NAMES', () => {
  it('seats 27 cards with one name per initial letter', () => {
    // The cube deals one name per initial from shuffled buckets and then sorts,
    // so alphabetical order is address order: ada at A1a, zola at C3c. 27 cards
    // against 26 letters means exactly one letter is drawn twice.
    const initials = NAMES.map((p) => p.name[0]);
    expect(NAMES.length).toBeGreaterThanOrEqual(27);
    expect(new Set(initials).size).toBeGreaterThanOrEqual(26);
  });

  it('has at least two names under every initial', () => {
    // A bucket of one deals the same name on every date, which would make that
    // card's name a constant across the whole archive.
    const buckets = new Map<string, number>();
    for (const p of NAMES) buckets.set(p.name[0], (buckets.get(p.name[0]) ?? 0) + 1);
    for (const [letter, n] of buckets) expect(n, letter).toBeGreaterThanOrEqual(2);
  });

  it('has no duplicate names', () => {
    expect(new Set(NAMES.map((p) => p.name)).size).toBe(NAMES.length);
  });
});

describe('PROFESSIONS', () => {
  it('has enough professions to keep groups near two or three', () => {
    expect(PROFESSIONS.length).toBeGreaterThanOrEqual(9);
  });

  it('has no duplicate keys, and every key pluralises with a plain -s', () => {
    expect(new Set(PROFESSIONS.map((p) => p.key)).size).toBe(PROFESSIONS.length);
    for (const p of PROFESSIONS) expect(p.key, p.key).toMatch(/^[a-z]+[^sxz]$/);
  });

  it('gives every profession a face for both genders', () => {
    for (const p of PROFESSIONS) {
      expect(faceOf(p.key, 'male'), p.key).toBe(p.male);
      expect(faceOf(p.key, 'female'), p.key).toBe(p.female);
    }
  });

  it('falls back rather than throwing on a profession it does not know', () => {
    expect(faceOf('taxidermist', 'male')).toBe('😬');
  });
});

describe('namesFor and professionsFor', () => {
  it('ignore size, because there is only one board size', () => {
    // The signatures survive from the 2D generator, where they gated tiers by
    // board size. The cube is always 27 cards, so the tiers are gone and only
    // the call sites remain.
    expect(namesFor(27)).toBe(NAMES);
    expect(namesFor(1)).toBe(NAMES);
    expect(professionsFor(27)).toBe(PROFESSIONS);
    expect(professionsFor(100)).toBe(PROFESSIONS);
  });
});

describe('TITLES and FLAVOUR', () => {
  it('offer enough distinct lines that a week does not repeat one', () => {
    expect(new Set(TITLES).size).toBe(TITLES.length);
    expect(new Set(FLAVOUR).size).toBe(FLAVOUR.length);
    expect(TITLES.length).toBeGreaterThanOrEqual(20);
    expect(FLAVOUR.length).toBeGreaterThanOrEqual(27);
  });

  it('never miscounts the cube in a title', () => {
    // "Twenty Faces, Five Lies" was true of the 4x5 board and is not true
    // here; twenty-seven is.
    for (const title of TITLES) expect(title, title).not.toMatch(/\btwenty(?!-seven)\b/i);
  });
});
