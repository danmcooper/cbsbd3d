import { CARD_COUNT, type Puzzle } from '../../../shared/puzzle';

export interface GameState {
  flipped: number[];
  /** One entry per wrong or refused accusation; the count is the score. */
  mistakes: number[];
  startedAt: number;
}

export type Action = { kind: 'accuse'; i: number; guess: 'criminal' | 'innocent' };

export const initialState = (p: Puzzle): GameState => ({
  flipped: [...p.initialReveals],
  mistakes: [],
  startedAt: Date.now(),
});

/**
 * Whether `i` can be worked out from what is already face up.
 *
 * The generator wrote every route to every card, so this is a lookup rather
 * than a solve: a card is open when one of its paths is entirely on the table.
 * A card with no paths was never deducible and starts revealed.
 */
export function isDeducible(p: Puzzle, s: GameState, i: number): boolean {
  const paths = p.people[i]?.paths;
  if (!paths?.length) return false;
  const flipped = new Set(s.flipped);
  return paths.some((path) => path.every((j) => flipped.has(j)));
}

export function reduce(p: Puzzle, s: GameState, a: Action): GameState {
  // Already face up: not a move, and returning the same object keeps React
  // from re-rendering the scene for a tap that changed nothing.
  if (s.flipped.includes(a.i)) return s;

  const right = p.people[a.i].criminal === (a.guess === 'criminal');
  if (right && isDeducible(p, s, a.i)) {
    return { ...s, flipped: [...s.flipped, a.i] };
  }
  // A wrong guess and a guess at a card nothing yet proves are the same move
  // and cost the same thing. Distinguishing them here would leak, through the
  // screen, whether the guess itself was right.
  return { ...s, mistakes: [...s.mistakes, a.i] };
}

export const isWon = (_p: Puzzle, s: GameState): boolean => s.flipped.length === CARD_COUNT;
