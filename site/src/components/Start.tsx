import type { Puzzle } from '../../../shared/puzzle';

/** "2026-09-04" → "Sep 4th 2026", as the 2D game bills a puzzle. */
export function formatDateOrdinal(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  const day = d.getDate();
  const suffix =
    day % 100 >= 11 && day % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][day % 10] ?? 'th');
  return `${d.toLocaleString('en-US', { month: 'short' })} ${day}${suffix} ${d.getFullYear()}`;
}

/**
 * The card a new puzzle opens on: what day it is and what it is likely to cost
 * you, then a button. It sits over the scene so the cube is already built and
 * turning behind it by the time the player taps Start.
 */
export default function Start({ puzzle, onStart }: { puzzle: Puzzle; onStart: () => void }) {
  return (
    <div className="overlay">
      <div role="dialog" aria-label="start" className="modal start-modal">
        <h2 className="start-title">Clues by Sam, in three dimensions</h2>
        <p className="start-date">{formatDateOrdinal(puzzle.date)}</p>
        {/* Nobody has played this cube, and no cube has ever been rated, so the
            label is our own classifier's estimate — billed as such. */}
        <p className="start-difficulty">
          Difficulty: <b>{puzzle.difficulty}</b>
        </p>
        <button className="btn-start" onClick={onStart}>
          Start
        </button>
      </div>
    </div>
  );
}
