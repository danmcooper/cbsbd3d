import { expect, it } from 'vitest';
import { PROFESSIONS } from '../../../shared/solver/vocab';
import { twemojiFile } from './head';

it('keeps FE0F only when the sequence has a ZWJ', () => {
  expect(twemojiFile('👩‍🍳')).toBe('1f469-200d-1f373.svg'); // ZWJ, no FE0F present
  expect(twemojiFile('🕵️‍♀️')).toBe('1f575-fe0f-200d-2640-fe0f.svg'); // ZWJ: FE0F kept
  expect(twemojiFile('👮')).toBe('1f46e.svg');
});

it('strips a lone FE0F, which Twemoji does not put in a filename', () => {
  expect(twemojiFile('☺️')).toBe('263a.svg');
});

it('names a file for every face the game can deal', () => {
  // A missing head is an empty cell in a game whose whole interface is heads,
  // so the mapping is checked against the vocabulary rather than a sample.
  for (const p of PROFESSIONS) {
    for (const face of [p.male, p.female]) {
      expect(twemojiFile(face)).toMatch(/^[0-9a-f-]+\.svg$/);
    }
  }
});
