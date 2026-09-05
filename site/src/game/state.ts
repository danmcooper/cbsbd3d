import { CARD_COUNT, type Puzzle } from '../../../shared/puzzle';

export interface GameState {
  flipped: number[];
  /** One entry per wrong or refused accusation; the count is the score. */
  mistakes: number[];
  /**
   * Clues the player has struck off. Purely a book-keeping aid — a spent clue
   * is greyed, not removed, and muting one proves nothing and costs nothing.
   */
  muted: number[];
  startedAt: number;
}

export type Action =
  | { kind: 'accuse'; i: number; guess: 'criminal' | 'innocent' }
  | { kind: 'mute'; i: number }
  | { kind: 'reset' };

export const initialState = (p: Puzzle): GameState => ({
  flipped: [...p.initialReveals],
  mistakes: [],
  muted: [],
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
  // Back to the cards the generator chose to reveal, and a fresh clock.
  if (a.kind === 'reset') return initialState(p);

  if (a.kind === 'mute') {
    // Only a clue on show can be struck off, and striking off is its own
    // inverse: a clue you decide you are not done with comes back.
    if (!s.flipped.includes(a.i)) return s;
    return s.muted.includes(a.i)
      ? { ...s, muted: s.muted.filter((i) => i !== a.i) }
      : { ...s, muted: [...s.muted, a.i] };
  }

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

/**
 * The slices a game opens with: only those holding a card the generator turned
 * face up. The first clue is the only thing a player has to go on, so the cube
 * opens on the slice carrying it rather than on the front slice, which may be
 * empty of anything to read.
 */
export function openingSlices(p: Puzzle): boolean[] {
  const on = [false, false, false];
  for (const i of p.initialReveals) on[Math.floor(i / 9)] = true;
  // A puzzle with no reveals at all would open on a blank cube; show the front.
  return on.some(Boolean) ? on : [true, false, false];
}

export const isWon = (_p: Puzzle, s: GameState): boolean => s.flipped.length === CARD_COUNT;
