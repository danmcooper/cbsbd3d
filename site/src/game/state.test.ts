import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, expect, it } from 'vitest';
import { CARD_COUNT, validatePuzzle, type Puzzle } from '../../../shared/puzzle';
import { initialState, isDeducible, isWon, reduce, type GameState } from './state';

// A real generated cube, not a fixture: the reducer's whole job is enforcing
// the deduction paths the generator wrote, so it is tested against ones it wrote.
const puzzle: Puzzle = validatePuzzle(
  JSON.parse(readFileSync(path.join(process.cwd(), 'puzzles/2026-09-04.json'), 'utf8')),
);

let state: GameState;
let deducible: number;
let notYetDeducible: number;

beforeAll(() => {
  state = initialState(puzzle);
  const open = [...Array(CARD_COUNT).keys()].filter((i) => !state.flipped.includes(i));
  deducible = open.find((i) => isDeducible(puzzle, state, i))!;
  notYetDeducible = open.find((i) => !isDeducible(puzzle, state, i))!;
  expect(deducible).toBeTypeOf('number');
  expect(notYetDeducible).toBeTypeOf('number');
});

const accuse = (s: GameState, i: number, guess: 'criminal' | 'innocent') =>
  reduce(puzzle, s, { kind: 'accuse', i, guess });

it("starts with the puzzle's initial reveals face up", () => {
  expect(initialState(puzzle).flipped).toEqual(puzzle.initialReveals);
  expect(initialState(puzzle).mistakes).toEqual([]);
});

it('flips a correct, deducible accusation and reveals its clue', () => {
  const truth = puzzle.people[deducible].criminal ? 'criminal' : 'innocent';
  const s = accuse(state, deducible, truth);
  expect(s.flipped).toContain(deducible);
  expect(s.mistakes).toEqual([]);
});

it('records a mistake and does not flip on a wrong guess', () => {
  const wrong = puzzle.people[deducible].criminal ? 'innocent' : 'criminal';
  const s = accuse(state, deducible, wrong);
  expect(s.flipped).not.toContain(deducible);
  expect(s.mistakes).toContain(deducible);
});

it('refuses a card that is not yet deducible, without leaking which way it went', () => {
  // Both a wrong guess and an undeducible one cost a mistake and flip nothing,
  // so the screen cannot be read to tell a guess apart from a refusal.
  const s = accuse(state, notYetDeducible, 'criminal');
  const other = accuse(state, notYetDeducible, 'innocent');
  expect(s.flipped).not.toContain(notYetDeducible);
  expect(s.mistakes).toContain(notYetDeducible);
  expect(other.flipped).toEqual(s.flipped);
  expect(other.mistakes).toEqual(s.mistakes);
});

it('ignores an accusation against a card already face up', () => {
  const s = accuse(state, state.flipped[0], 'criminal');
  expect(s).toBe(state);
});

it('opens a card up once its path is on the table', () => {
  const target = puzzle.people.findIndex((p, i) => !state.flipped.includes(i) && p.paths?.length);
  const path = puzzle.people[target].paths![0];
  expect(isDeducible(puzzle, { ...state, flipped: path }, target)).toBe(true);
});

it('is won when every card is face up', () => {
  expect(isWon(puzzle, { ...state, flipped: [...Array(CARD_COUNT).keys()] })).toBe(true);
  expect(isWon(puzzle, state)).toBe(false);
});

it('strikes a spent clue off, and puts it back', () => {
  const shown = state.flipped[0];
  const off = reduce(puzzle, state, { kind: 'mute', i: shown });
  expect(off.muted).toContain(shown);
  expect(reduce(puzzle, off, { kind: 'mute', i: shown }).muted).not.toContain(shown);
});

it('will not strike off a clue that is not on show', () => {
  const hidden = [...Array(CARD_COUNT).keys()].find((i) => !state.flipped.includes(i))!;
  expect(reduce(puzzle, state, { kind: 'mute', i: hidden })).toBe(state);
});

it('leaves the score alone when a clue is struck off', () => {
  // Striking a clue off is book-keeping, not a move: it proves nothing about
  // the board and must never cost a mistake.
  const off = reduce(puzzle, state, { kind: 'mute', i: state.flipped[0] });
  expect(off.mistakes).toEqual(state.mistakes);
  expect(off.flipped).toEqual(state.flipped);
});

it('puts the board back to its opening on a reset', () => {
  const played = reduce(
    puzzle,
    reduce(puzzle, state, { kind: 'mute', i: state.flipped[0] }),
    { kind: 'accuse', i: notYetDeducible, guess: 'criminal' },
  );
  expect(played.mistakes.length).toBe(1);
  const fresh = reduce(puzzle, played, { kind: 'reset' });
  expect(fresh.flipped).toEqual(puzzle.initialReveals);
  expect(fresh.mistakes).toEqual([]);
  expect(fresh.muted).toEqual([]);
});
