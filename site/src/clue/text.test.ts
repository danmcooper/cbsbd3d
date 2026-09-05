import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, it } from 'vitest';
import { validatePuzzle, type Person } from '../../../shared/puzzle';
import { clueText, wrapClue } from './text';

const person = (name: string, profession: string): Person => ({
  name,
  profession,
  gender: 'female',
  criminal: false,
  clue: null,
  origHint: null,
  paths: null,
});
const people = [person('Ada', 'cook'), person('Bo', 'cook'), person('Cleo', 'judge')];

it('names a suspect, and makes a possessive out of the possessive token', () => {
  expect(clueText('#NAME:2 is #NAMES:0 neighbor', people, 1)).toBe("Cleo is Ada's neighbor");
});

it("talks about the carrier in the first person", () => {
  // The clue is carried by a card and read on that card's face, so the card
  // talking about itself in the third person reads as a different suspect.
  expect(clueText('#NAME:1 is a criminal', people, 1)).toBe('I am a criminal');
  expect(clueText('2 criminals are behind #NAME:1', people, 1)).toBe('2 criminals are behind me');
  expect(clueText('#NAMES:1 neighbor is innocent', people, 1)).toBe('My neighbor is innocent');
});

it('counts a profession off the board when asked to', () => {
  expect(clueText('Exactly 1 of #PROFN:cook is a criminal', people, 2)).toBe(
    'Exactly 1 of 2 cooks is a criminal',
  );
  expect(clueText('No #PROF:judge is #PROFS:cook', people, 0)).toBe('No judge is cooks');
});

it('says a between run by the addresses on the cells', () => {
  // Every cell wears its address, so a range can name its ends instead of
  // describing a route to them.
  expect(clueText('Both innocents #BETWEEN:pair(8,26) are corners', people, 0)).toBe(
    'Both innocents from C3a to C3c are corners',
  );
});

it('reads "exactly 0" as "no", the way the source game does', () => {
  expect(clueText('There are exactly 0 criminals here', people, 0)).toBe(
    'There are no criminals here',
  );
});

it('leaves nothing unexpanded on a real cube', () => {
  const puzzle = validatePuzzle(
    JSON.parse(readFileSync(path.join(process.cwd(), 'puzzles/2026-09-04.json'), 'utf8')),
  );
  for (const [i, p] of puzzle.people.entries()) {
    if (p.clue) expect(clueText(p.clue, puzzle.people, i)).not.toMatch(/#/);
  }
});

it('wraps to short lines without splitting a word', () => {
  expect(wrapClue('2 criminals to my left', 12)).toEqual(['2 criminals', 'to my left']);
  expect(wrapClue('supercalifragilistic', 8)).toEqual(['supercalifragilistic']);
});
