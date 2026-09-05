/**
 * `puzzles/index.json`: the list the site fetches before it knows what exists.
 *
 * Rebuilt from the directory rather than appended to, so a puzzle file that is
 * deleted, renamed or added by hand cannot leave the manifest describing an
 * archive that is not there.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { validatePuzzle } from '../shared/puzzle.ts';

export interface ManifestEntry {
  date: string;
  id: string;
  difficulty: string;
}

export interface Manifest {
  puzzles: ManifestEntry[];
}

/** One puzzle file per date, and nothing else in the directory is one. */
const PUZZLE_FILE = /^\d{4}-\d{2}-\d{2}\.json$/;

export async function regenerateManifest(dir: string): Promise<ManifestEntry[]> {
  const files = (await readdir(dir)).filter((f) => PUZZLE_FILE.test(f)).sort();
  const entries: ManifestEntry[] = [];
  for (const file of files) {
    let puzzle: ReturnType<typeof validatePuzzle>;
    try {
      puzzle = validatePuzzle(JSON.parse(await readFile(path.join(dir, file), 'utf8')));
    } catch (e) {
      throw new Error(`${file}: ${String(e)}`);
    }
    // The filename is the claim; the puzzle's own date is checked against it
    // rather than trusted, because the site addresses a puzzle by its filename
    // and would otherwise serve one date's cube under another's name.
    if (`${puzzle.date}.json` !== file) {
      throw new Error(`${file}: puzzle says it is dated ${puzzle.date}`);
    }
    entries.push({ date: puzzle.date, id: puzzle.id, difficulty: puzzle.difficulty });
  }
  entries.sort((a, b) => b.date.localeCompare(a.date));
  const manifest: Manifest = { puzzles: entries };
  await writeFile(path.join(dir, 'index.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return entries;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  regenerateManifest(path.join(process.cwd(), 'puzzles')).then(
    (entries) => console.log(`index.json: ${entries.length} puzzles`),
    (e) => {
      console.error(String(e));
      process.exit(1);
    },
  );
}
