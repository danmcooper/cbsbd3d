import { describe, expect, it } from 'vitest';
import { CARD_COUNT, type Person, PuzzleValidationError, validatePuzzle } from './puzzle';

const person = (i: number): Person => ({
  name: `p${i}`,
  profession: 'cook',
  gender: 'male',
  criminal: i === 0,
  clue: i === 0 ? 'ada is a criminal' : null,
  origHint: i === 0 ? 'has_trait(0,criminal)' : null,
  paths: i === 0 ? [[1]] : null,
  face: '\u{1F600}',
});

const valid = {
  formatVersion: 1 as const,
  id: '0123456789ab',
  date: '2026-09-04',
  title: 'The Cube',
  difficulty: 'Medium',
  initialReveals: [26],
  source: 'generated',
  people: Array.from({ length: CARD_COUNT }, (_, i) => person(i)),
  hints: [{ flipped: [26], clues: [26], reveals: [0] }],
};

describe('validatePuzzle', () => {
  it('accepts a well-formed cube', () => {
    expect(() => validatePuzzle(valid)).not.toThrow();
  });

  it('demands exactly 27 people', () => {
    expect(() => validatePuzzle({ ...valid, people: valid.people.slice(0, 26) })).toThrow(
      /people length 26/,
    );
  });

  it('rejects an out-of-range reveal', () => {
    expect(() => validatePuzzle({ ...valid, initialReveals: [27] })).toThrow(PuzzleValidationError);
  });

  it('rejects an unknown formatVersion', () => {
    expect(() => validatePuzzle({ ...valid, formatVersion: 2 })).toThrow(/formatVersion/);
  });

  it('rejects a malformed id or date', () => {
    expect(() => validatePuzzle({ ...valid, id: 'nope' })).toThrow(/id must be/);
    expect(() => validatePuzzle({ ...valid, date: '4 September' })).toThrow(/date must be/);
  });

  it('rejects a person missing a name', () => {
    const people = valid.people.map((p, i) => (i === 3 ? { ...p, name: '' } : p));
    expect(() => validatePuzzle({ ...valid, people })).toThrow(/people\[3\]\.name/);
  });

  it('rejects a path pointing off the cube', () => {
    const people = valid.people.map((p, i) => (i === 0 ? { ...p, paths: [[27]] } : p));
    expect(() => validatePuzzle({ ...valid, people })).toThrow(/people\[0\]\.paths/);
  });

  it('accepts a puzzle with no hints', () => {
    const { hints, ...rest } = valid;
    expect(() => validatePuzzle(rest)).not.toThrow();
  });
});
