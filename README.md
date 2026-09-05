# cbsbd3d

Twenty-seven suspects stand in a 3×3×3 cube. Each is a criminal or innocent.
Accuse them one at a time: a correct accusation you could have deduced flips
the suspect and reveals the clue they were carrying, and the clues get you the
rest. One puzzle a day, an archive behind it.

A fork of the flat game in `cbsbd` — same solver, same clue vocabulary, one
more axis and a different renderer.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | The game, at the base path from `config/site.json`, with `puzzles/` served from the repo root |
| `npm test` | Everything: solver, generator and site |
| `npm run generate` | Builds any missing cube from today through today+6 |
| `npm run generate 2026-09-04 --force` | Rebuilds named dates |
| `npm run audit` | Re-derives every committed puzzle from its filename and checks it matches |
| `npm run audit -- --recent=10` | The same, over the newest ten only — what CI runs |
| `npm run manifest` | Rewrites `puzzles/index.json` from the files on disk |
| `npm run build` | Production bundle into `site/dist` |

## Addressing

A cell is `(x, y, z)` with flat index `i = z*9 + y*3 + x`. Columns are `A`–`C`
left to right, rows `1`–`3` top to bottom, slices `a`–`c` front to back, so
`A1a` is the near top-left, `B2b` the core, `C3c` the far bottom-right. Every
cell wears its address in its top-left corner, which is why a clue about a run
of cells names its two ends rather than describing a route to them.

The cast is dealt alphabetically in index order, one name per initial: a
suspect's first letter tells you where they stand.

## Puzzle files

`puzzles/YYYY-MM-DD.json` is one cube; `puzzles/index.json` is the manifest the
archive screen reads. Generation is seeded from the date string alone, so any
file can be rebuilt from its own name — that is what `npm run audit` checks,
and it makes a lost or corrupted file a non-event.

There is no backfill. The archive starts on launch day and grows forwards.

## Vendored config

Two files in `config/` came out of the flat repo's scraped archive and cannot
be regenerated here, because this repo has no scraped archive and never will:

- **`clue-mix.json`** — the proportions of predicates, directions and units
  found in real puzzles. Without it the candidate pool's own combinatorial
  shape decides the mix, which is how generated puzzles once came out three
  times heavier on `between` than any human-authored one. `mixFor3d` translates
  it to the cube's vocabulary; every number in that translation past the
  predicate shares is an estimate, there to stop the pool running away with the
  mix rather than because anyone measured it on a cube.
- **`difficulty.json`** — bands fitted from human ratings of the flat game's
  4×5 archive, refitted to 27 cards by `bandsFor`. There is no rated 3D archive
  to fit against, so a cube's label is an estimate. Nothing is generated *at* a
  difficulty: each date produces one cube, `classify` reads a label off it, and
  that label is recorded and shown.

Regenerating either from this repo is not possible. Recompute them in `cbsbd`
and copy them across.

## Deployment

Pushing to `main` builds and deploys to GitHub Pages, under the UUID path in
`config/site.json`. Nothing is served at the repo root: the UUID is the whole
reason the game is not simply browsable.

One-time repo setup: **Settings → Pages → Source: GitHub Actions**. Never
regenerate the UUID — it is the URL people have.

A nightly workflow (`generate.yml`, 03:17 UTC) tops the archive back up to
seven days ahead and commits; that commit is itself a push to `main`, so the
deploy follows on its own.

## Requirements

WebGL. Without it the game says so rather than degrading.
