import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CARD_COUNT } from '../shared/puzzle.ts';
import { regenerateManifest } from './manifest.mts';

function puzzle(date: string, id: string, difficulty = 'Easy') {
  const person = {
    name: 'banda',
    profession: 'coder',
    gender: 'male',
    criminal: false,
    clue: null,
    origHint: null,
    paths: [],
  };
  return {
    formatVersion: 1,
    id,
    date,
    title: `Title ${date}`,
    difficulty,
    initialReveals: [],
    source: 'generated',
    people: Array.from({ length: CARD_COUNT }, () => person),
  };
}

const dir = () => mkdtemp(path.join(tmpdir(), 'cbsbd3d-manifest-'));

describe('regenerateManifest', () => {
  it('writes index.json newest first, ignoring everything that is not a puzzle', async () => {
    const d = await dir();
    await writeFile(path.join(d, '2026-07-01.json'), JSON.stringify(puzzle('2026-07-01', 'a'.repeat(12))));
    await writeFile(
      path.join(d, '2026-07-03.json'),
      JSON.stringify(puzzle('2026-07-03', 'b'.repeat(12), 'Hard')),
    );
    // A stale manifest, a note and a dateless file: none of them is a puzzle.
    await writeFile(path.join(d, 'index.json'), '{"puzzles":[]}');
    await writeFile(path.join(d, 'notes.json'), '{}');
    await writeFile(path.join(d, 'README.md'), 'ignore me');

    const entries = await regenerateManifest(d);

    expect(entries.map((e) => e.date)).toEqual(['2026-07-03', '2026-07-01']);
    expect(entries[0]).toEqual({ date: '2026-07-03', id: 'b'.repeat(12), difficulty: 'Hard' });
    const onDisk = JSON.parse(await readFile(path.join(d, 'index.json'), 'utf8'));
    expect(onDisk).toEqual({ puzzles: entries });
  });

  it('fails loudly on an invalid puzzle file, naming it', async () => {
    const d = await dir();
    await writeFile(path.join(d, '2026-07-01.json'), '{"formatVersion":1}');
    await expect(regenerateManifest(d)).rejects.toThrow(/2026-07-01\.json/);
  });

  it('rejects a file whose puzzle is dated something else', async () => {
    // The site addresses a puzzle by its filename, so a file that disagrees
    // with its own contents would serve one date's cube under another's name.
    const d = await dir();
    await writeFile(path.join(d, '2026-07-01.json'), JSON.stringify(puzzle('2026-07-02', 'a'.repeat(12))));
    await expect(regenerateManifest(d)).rejects.toThrow(/dated 2026-07-02/);
  });

  it('writes an empty manifest for an empty archive', async () => {
    const d = await dir();
    expect(await regenerateManifest(d)).toEqual([]);
    expect(JSON.parse(await readFile(path.join(d, 'index.json'), 'utf8'))).toEqual({ puzzles: [] });
  });
});
