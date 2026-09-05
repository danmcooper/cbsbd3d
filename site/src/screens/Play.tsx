import { useState } from 'react';
import { validatePuzzle } from '../../../shared/puzzle';
import SliceSwitches from '../components/SliceSwitches';
import Scene from '../scene/Scene';
import { useFetch } from '../useFetch';

export default function Play({ date }: { date: string }) {
  const { data: puzzle, error, retry } = useFetch(`puzzles/${date}.json`, validatePuzzle);
  // Opens on the front slice alone: 27 faces at once is unreadable, and the
  // first thing to learn about the cube is that it has depth you switch into.
  const [slices, setSlices] = useState([true, false, false]);

  if (error) {
    return (
      <main>
        <p role="alert">This puzzle could not be read: {error}</p>
        <p>
          <button onClick={retry}>Retry</button> <a href="#/">Back to the archive</a>
        </p>
      </main>
    );
  }
  if (!puzzle) return <p>Loading…</p>;
  return (
    <main className="play">
      <header className="play-head">
        <a href="#/">← archive</a>
        <span>
          {puzzle.date} · {puzzle.difficulty}
        </span>
      </header>
      <Scene puzzle={puzzle} slices={slices} />
      <SliceSwitches value={slices} onChange={setSlices} />
    </main>
  );
}
