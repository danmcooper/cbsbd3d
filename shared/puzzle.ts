/**
 * The on-disk puzzle format: one file per date under `puzzles/`.
 *
 * Every puzzle here is generated — there is no scraped archive to clone and no
 * variants to tell apart — so the format carries no `variant`, and no `width`
 * and `height` either: the board is always the 3x3x3 cube, 27 people in index
 * order.
 */

export interface Person {
  name: string;
  profession: string;
  gender: string;
  criminal: boolean;
  clue: string | null;
  origHint: string | null;
  paths: number[][] | null;
  /** The emoji this card's head is extruded from. */
  face?: string | null;
}

/** One precomputed deduction step: with `flipped` on the table, the clues on
 * `clues` cards suffice to deduce the `reveals` cards. */
export interface HintStep {
  flipped: number[];
  clues: number[];
  reveals: number[];
}

/** 3 columns, 3 rows, 3 slices. */
export const CARD_COUNT = 27;

export interface Puzzle {
  formatVersion: 1;
  id: string;
  date: string;
  title: string;
  /** Whatever `classify` said of the finished cube: descriptive, not aimed at. */
  difficulty: string;
  initialReveals: number[];
  /** Always the literal `'generated'`; there is no other kind of puzzle here. */
  source: string;
  people: Person[];
  /** Absent when the puzzle has no hints. */
  hints?: HintStep[];
}

export class PuzzleValidationError extends Error {}

function fail(msg: string): never {
  throw new PuzzleValidationError(msg);
}

export function validatePuzzle(data: unknown): Puzzle {
  if (typeof data !== 'object' || data === null) fail('puzzle is not an object');
  const p = data as Record<string, unknown>;
  if (p.formatVersion !== 1) fail(`unsupported formatVersion: ${String(p.formatVersion)}`);
  if (typeof p.id !== 'string' || !/^[0-9a-f]{12}$/.test(p.id)) {
    fail('id must be 12 lowercase hex chars');
  }
  if (typeof p.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(p.date)) {
    fail('date must be YYYY-MM-DD');
  }
  if (typeof p.title !== 'string') fail('title must be a string');
  if (typeof p.difficulty !== 'string') fail('difficulty must be a string');
  if (typeof p.source !== 'string') fail('source must be a string');
  const count = CARD_COUNT;
  if (!Array.isArray(p.people)) fail('people must be an array');
  if (p.people.length !== count) fail(`people length ${p.people.length} != ${count}`);
  const inRange = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < count;
  if (!Array.isArray(p.initialReveals) || !p.initialReveals.every(inRange)) {
    fail('initialReveals must be an array of in-range card indices');
  }
  if (p.hints !== undefined) {
    const indexArrayOk = (v: unknown) => Array.isArray(v) && v.every(inRange);
    const ok =
      Array.isArray(p.hints) &&
      p.hints.every(
        (raw) =>
          typeof raw === 'object' &&
          raw !== null &&
          indexArrayOk((raw as Record<string, unknown>).flipped) &&
          indexArrayOk((raw as Record<string, unknown>).clues) &&
          indexArrayOk((raw as Record<string, unknown>).reveals),
      );
    if (!ok) {
      fail('hints must be absent or an array of {flipped, clues, reveals} in-range index arrays');
    }
  }
  p.people.forEach((raw, i) => {
    const where = `people[${i}]`;
    if (typeof raw !== 'object' || raw === null) fail(`${where} is not an object`);
    const q = raw as Record<string, unknown>;
    if (typeof q.name !== 'string' || q.name === '') {
      fail(`${where}.name must be a non-empty string`);
    }
    if (typeof q.profession !== 'string' || q.profession === '') {
      fail(`${where}.profession must be a non-empty string`);
    }
    if (typeof q.gender !== 'string') fail(`${where}.gender must be a string`);
    if (typeof q.criminal !== 'boolean') fail(`${where}.criminal must be a boolean`);
    if (q.clue !== null && typeof q.clue !== 'string') fail(`${where}.clue must be a string or null`);
    if (q.origHint !== null && typeof q.origHint !== 'string') {
      fail(`${where}.origHint must be a string or null`);
    }
    if (q.face !== undefined && q.face !== null && typeof q.face !== 'string') {
      fail(`${where}.face must be a string, null, or absent`);
    }
    if (q.paths !== null) {
      const ok =
        Array.isArray(q.paths) &&
        q.paths.every((path) => Array.isArray(path) && path.every(inRange));
      if (!ok) fail(`${where}.paths must be null or an array of arrays of in-range indices`);
    }
  });
  return data as Puzzle;
}
