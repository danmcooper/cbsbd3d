import type { ManifestEntry } from '../../../scripts/manifest.mts';
import { useFetch } from '../useFetch';

interface Manifest {
  puzzles: ManifestEntry[];
}

function parseManifest(raw: unknown): ManifestEntry[] {
  const puzzles = (raw as Manifest | null)?.puzzles;
  if (!Array.isArray(puzzles)) throw new Error('the archive index could not be read');
  // The generator writes it newest first; sorting here means a hand-edited or
  // half-written index still lists in the order the page promises.
  return [...puzzles].sort((a, b) => b.date.localeCompare(a.date));
}

export default function Archive() {
  const { data, error, retry } = useFetch('puzzles/index.json', parseManifest);

  if (error) {
    return (
      <main>
        <h1>cbsbd3d</h1>
        <p role="alert">Failed to load the archive: {error}</p>
        <button onClick={retry}>Retry</button>
      </main>
    );
  }
  if (!data) return <p>Loading…</p>;
  return (
    <main className="archive">
      <h1>cbsbd3d</h1>
      {data.length === 0 && <p>No puzzles yet — the generator runs nightly.</p>}
      <ul className="archive-list">
        {data.map((e) => (
          <li key={e.date}>
            <a href={`#/play/${e.date}`}>
              <span className="archive-date">{e.date}</span>
              <span className="archive-difficulty">{e.difficulty}</span>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
