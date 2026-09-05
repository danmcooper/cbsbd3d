import { validatePuzzle } from '../../../shared/puzzle';
import { useFetch } from '../useFetch';

export default function Play({ date }: { date: string }) {
  const { data: puzzle, error, retry } = useFetch(`puzzles/${date}.json`, validatePuzzle);

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
      <h1>
        {puzzle.date} · {puzzle.difficulty}
      </h1>
      {/* The cube goes here. */}
      <p>
        <a href="#/">Back to the archive</a>
      </p>
    </main>
  );
}
