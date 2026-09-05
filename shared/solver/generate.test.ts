import bandsData from '../../config/difficulty.json' with { type: 'json' };
import mixData from '../../config/clue-mix.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';
import { validatePuzzle } from '../puzzle';
import { candidateHints } from './candidates';
import { type LabelBand, bandsFor, classify, loadBands } from './difficulty';
import { SIZE } from './enumerate';
import { formatHint, parseHint } from './hint';
import { indexOfAddress } from './lattice';
import { loadMix, mixFor3d } from './mix';
import { hintFeatures, makeBoard, unitMembers } from './predicates';
import { render } from './render';
import { isUniquelySolvable, parseClues, solveChain } from './solve';
import { TITLES, faceOf } from './vocab';
import {
  GenerationError,
  castOf,
  generatePuzzle,
  makeRng,
  orderPool,
  pickCriminals,
  professionShapesFor,
  shuffled,
} from './generate';

/**
 * The real calibrated bands and the real vendored mix, not synthetic fixtures.
 *
 * 2D's generator could reject an attempt for missing its band, so its tests
 * needed a band wide enough not to, and a second one narrow enough to always
 * fail. Neither exists here: `labelOf` is required, nothing is rejected for its
 * metrics, and `band` only shapes an attempt. So the fixture is the shipped
 * configuration, driven the way `scripts/generate.mts` drives it.
 */
const bands = loadBands(bandsData);
const band: LabelBand = bands.Medium;
const mix = mixFor3d(loadMix(mixData));

/**
 * `generatePuzzle` refits the band it is handed from the archive's twenty cards
 * to the cube's 27, so callers pass a band straight out of `config`. Reading a
 * label back off a cube's metrics is the other side of that refit and has to be
 * done here.
 */
const cubeBands = bandsFor(bands, SIZE);
const labelOf = (m: Parameters<typeof classify>[1]) => classify(cubeBands, m);

const input = { date: '2026-09-05', difficulty: 'Medium', band, seed: 1, mix, labelOf };

const shapes = professionShapesFor(mix.professionShapes, SIZE);

describe('castOf', () => {
  // Alphabetical order is address order on the cube — `ada` at A1a, `zola` at
  // C3c — so a clue that names someone says roughly where they stand. With 27
  // cards and 26 letters one initial is dealt twice; everything else is
  // distinct.
  it('names the cast alphabetically, with 26 distinct initials over 27 cards', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const cast = castOf(makeRng(seed), shapes);
      expect(cast.names.length, `seed ${seed}`).toBe(27);
      expect(cast.names, `seed ${seed}`).toEqual([...cast.names].sort());
      expect(new Set(cast.names).size, `seed ${seed}`).toBe(27);
      expect(new Set(cast.names.map((n) => n[0])).size, `seed ${seed}`).toBe(26);
    }
  });

  it('varies the cast between seeds', () => {
    const a = castOf(makeRng(1), shapes).names.join(',');
    const b = castOf(makeRng(2), shapes).names.join(',');
    expect(a).not.toBe(b);
  });

  it("gives the cast one of the refitted archive's ragged profession shapes", () => {
    // Not nine professions of three apiece, which is what an `i % 9` fill gives
    // and what no real puzzle has ever looked like.
    const known = new Set(shapes.map((s) => s.join(',')));
    const seen = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
      const cast = castOf(makeRng(seed), shapes);
      const counts = new Map<string, number>();
      for (const p of cast.professions) counts.set(p, (counts.get(p) ?? 0) + 1);
      const shape = [...counts.values()].sort((a, b) => b - a).join(',');
      expect(known.has(shape), `seed ${seed}: ${shape}`).toBe(true);
      seen.add(shape);
    }
    expect(seen.size).toBeGreaterThan(3);
  });

  it('refuses a profession shape that does not cover the cube', () => {
    // The vendored shapes all sum to twenty, so a caller who forgets
    // `professionShapesFor` would otherwise deal a cast with holes in it.
    expect(() => castOf(makeRng(1), mix.professionShapes)).toThrow(GenerationError);
  });

  it("keeps each card's face agreeing with its own gender and profession", () => {
    const cast = castOf(makeRng(9), shapes);
    for (let i = 0; i < cast.names.length; i++) {
      expect(cast.faces[i], cast.names[i]).toBe(faceOf(cast.professions[i], cast.genders[i]));
    }
  });
});

describe('professionShapesFor', () => {
  it('covers all 27 cards with every shape', () => {
    expect(shapes.length).toBe(mix.professionShapes.length);
    for (const s of shapes) {
      expect(s.reduce((a, b) => a + b, 0)).toBe(27);
      expect(Math.min(...s)).toBeGreaterThan(0);
    }
  });

  it('keeps the archive raggedness rather than dealing equal groups', () => {
    const ragged = shapes.filter((s) => new Set(s).size > 1);
    expect(ragged.length).toBeGreaterThan(shapes.length / 2);
  });
});

describe('pickCriminals', () => {
  it('draws uniformly, with no inward bias', () => {
    // 2D biases the draw inward to reproduce the source archive's 65.8% edge
    // share. On a cube 26 of 27 cells are on the outer shell, so that statistic
    // has nothing to measure and the draw is flat: the core comes up as often
    // as a corner.
    const rng = makeRng(1);
    const counts = new Array(SIZE).fill(0);
    for (let t = 0; t < 4000; t++) for (const i of pickCriminals(rng, 6)) counts[i]++;
    const core = counts[indexOfAddress('B2b')];
    const corner = counts[indexOfAddress('A1a')];
    expect(Math.abs(core - corner) / corner).toBeLessThan(0.15);
  });

  it('draws distinct cards, as many as asked for', () => {
    const rng = makeRng(3);
    for (let t = 0; t < 50; t++) {
      const picked = pickCriminals(rng, 12);
      expect(picked.length).toBe(12);
      expect(new Set(picked).size).toBe(12);
      expect(Math.min(...picked)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...picked)).toBeLessThan(SIZE);
    }
  });
});

describe('orderPool', () => {
  const poolBoard = makeBoard(
    Array.from({ length: 27 }, (_, i) => ['cook', 'cop', 'pilot', 'painter', 'sleuth'][i % 5]),
    Array.from({ length: 27 }, (_, i) => [0, 3, 6, 9, 13, 19, 22, 26].includes(i)),
  );
  const pool = candidateHints(poolBoard);
  // buildChain walks the pool in order and takes the first candidate that makes
  // progress, so what the ordering puts near the front is what a puzzle ends up
  // made of. Measure the head of the ordering, not the whole thing.
  const HEAD = 400;
  // Ordering a 130k-candidate pool is about a second, so every case here reads
  // the same head rather than paying for one of its own.
  const head = orderPool(makeRng(11), poolBoard, pool, mix).slice(0, HEAD);

  const sharesOf = (hints: typeof pool) => {
    const pred = new Map<string, number>();
    const feature = new Map<string, number>();
    for (const h of hints) {
      pred.set(h.pred, (pred.get(h.pred) ?? 0) + 1);
      for (const f of hintFeatures(poolBoard, h)) feature.set(f, (feature.get(f) ?? 0) + 1);
    }
    const norm = (m: Map<string, number>) => {
      const total = [...m.values()].reduce((a, b) => a + b, 0);
      return (k: string) => (m.get(k) ?? 0) / total;
    };
    return { pred: norm(pred), feature: norm(feature), raw: feature };
  };
  // The mix is measured on a flat 4x5 board and asks for things a cube has no
  // cells for — `unit:between:4` and `:5` are 14% of its feature mass, and the
  // longest line here is three. `fitFeatureWeights` never sees those keys,
  // because it only ranges over features the pool actually carries, so they cost
  // the ordering nothing; but left in a distance they read as error the fitter
  // could not have avoided. So compare against the mix restricted to what this
  // pool can produce, renormalised.
  const restricted = (target: Record<string, number>, keys: Iterable<string>) => {
    const kept = [...new Set(keys)].filter((k) => (target[k] ?? 0) > 0);
    const total = kept.reduce((a, k) => a + target[k], 0);
    return (k: string) => (kept.includes(k) ? target[k] / total : 0);
  };
  const poolFeatures = new Set(pool.flatMap((h) => hintFeatures(poolBoard, h)));
  const poolPreds = new Set(pool.map((h) => h.pred));
  const wantFeature = restricted(mix.feature, poolFeatures);
  const wantPred = restricted(mix.pred, poolPreds);

  /** Total variation distance from the mix: 0 is a perfect match, 1 is disjoint. */
  const distance = (hints: typeof pool) => {
    const s = sharesOf(hints);
    let d = 0;
    for (const p of new Set([...poolPreds, ...hints.map((h) => h.pred)]))
      d += Math.abs(s.pred(p) - wantPred(p));
    for (const k of poolFeatures) d += Math.abs(s.feature(k) - wantFeature(k));
    return d / 2;
  };

  it('puts a head that resembles the mix far more than a uniform shuffle does', () => {
    // Measured: about 0.2 weighted against 1.18 uniform, out of a maximum of 2
    // (predicates and features each contribute a distribution of their own).
    // The uniform figure is that bad because the cube's pool is nearly all wide
    // units and two-unit predicates, which is exactly what `orderPool` exists
    // to correct.
    const weighted = distance(head);
    const uniform = distance(shuffled(makeRng(4), pool).slice(0, HEAD));
    expect(uniform).toBeGreaterThan(1);
    expect(weighted).toBeLessThan(0.3);
  });

  it('rarely picks two units that share a single card', () => {
    // When a clue's two units overlap in exactly one card, the second unit is
    // scaffolding: "only 1 of the 3 criminals neighbouring Jonas is in row 2"
    // reduces to "that one shared card is criminal" the moment you notice the
    // overlap, and the row does no work. The archive keeps this to 14% of its
    // two-unit clues; the cube's pool is fuller of near-disjoint pairs than the
    // grid's, so the weighting has more to pull against.
    const overlaps = head.flatMap((h) => {
      const us = h.args.filter((a) => a.t === 'unit');
      if (us.length !== 2 || us[0].t !== 'unit' || us[1].t !== 'unit') return [];
      const first = new Set(unitMembers(poolBoard, us[0].unit));
      return [unitMembers(poolBoard, us[1].unit).filter((i) => first.has(i)).length];
    });
    expect(overlaps.length).toBeGreaterThan(20);
    const ones = overlaps.filter((n) => n === 1).length / overlaps.length;
    expect(ones).toBeLessThan(0.25);
  });

  it('lands the rare unit kinds near their share instead of overshooting', () => {
    // Scaling each feature once by mixShare/poolShare does not reach the mix's
    // marginals: a hint carrying the same feature twice gets the factor squared,
    // and profession groups are a fraction of a percent of the pool's unit slots
    // against the mix's 7%, so that factor is large. Every feature should land
    // near its target, not merely on the right side of the pool's own share.
    const s = sharesOf(head);
    for (const k of ['unit:profession', 'unit:hneighbor', 'unit:row', 'unit:slice']) {
      expect(s.feature(k), k).toBeGreaterThan(wantFeature(k) * 0.5);
      expect(s.feature(k), k).toBeLessThan(wantFeature(k) * 1.6);
    }
  });

  it('holds the wide units back and lets the rarer ones through', () => {
    // `between` and `reach` between them are most of the pool: 108 non-empty
    // reaches against one core and six face centres. Uniformly they take the
    // head and the position groups are never seen.
    const s = sharesOf(head);
    const wide =
      [2, 3].reduce((a, n) => a + s.feature(`unit:between:${n}`), 0) + s.feature('unit:reach');
    expect(wide).toBeLessThan(0.5);
    expect(s.feature('unit:profession')).toBeGreaterThan(0.02);
    expect(s.feature('unit:corner')).toBeGreaterThan(0.01);
  });

  it('spreads directional clues over all six directions', () => {
    const dirs = [...sharesOf(orderPool(makeRng(11), poolBoard, pool, mix).slice(0, HEAD * 4)).raw]
      .filter(([k]) => k.startsWith('dir:'))
      .map(([, v]) => v);
    expect(dirs.length).toBe(6);
    expect(Math.max(...dirs)).toBeLessThan(Math.min(...dirs) * 3);
  });

  it('keeps every candidate — it reorders the pool, it does not filter it', () => {
    const ordered = orderPool(makeRng(2), poolBoard, pool, mix);
    expect(ordered.length).toBe(pool.length);
    expect(new Set(ordered).size).toBe(pool.length);
  });

  it('is deterministic for a given seed', () => {
    const a = orderPool(makeRng(5), poolBoard, pool, mix).slice(0, 50).map(formatHint);
    const b = orderPool(makeRng(5), poolBoard, pool, mix).slice(0, 50).map(formatHint);
    expect(a).toEqual(b);
    expect(orderPool(makeRng(6), poolBoard, pool, mix).slice(0, 50).map(formatHint)).not.toEqual(a);
  });
}, 60_000);

describe('makeRng', () => {
  it('is deterministic and in range', () => {
    const a = makeRng(7);
    const b = makeRng(7);
    for (let i = 0; i < 5; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe('generatePuzzle', () => {
  // One cube, many assertions. Unlike the 2D suite there is no cheaper board to
  // fall back on — 3x3x3 is the only size this repo generates — so a generation
  // costs tens of seconds and every case that can share one does.
  const result = generatePuzzle(input);
  const puzzle = result.puzzle;
  const shape = { professions: puzzle.people.map((p) => p.profession) };
  const clues = parseClues(puzzle.people.map((p) => p.origHint));
  const truth = puzzle.people.map((p) => p.criminal);

  it('produces a valid, uniquely solvable, fully chained cube', () => {
    expect(() => validatePuzzle(puzzle)).not.toThrow();
    expect(puzzle.date).toBe('2026-09-05');
    expect(puzzle.people.length).toBe(27);
    expect(isUniquelySolvable(shape, clues, truth)).toBe(true);
    expect(solveChain(shape, clues, truth, puzzle.initialReveals).solvedAll).toBe(true);
  });

  it('deals the cast alphabetically in address order', () => {
    const names = puzzle.people.map((p) => p.name);
    expect([...names].sort()).toEqual(names);
    expect(names[0][0] < names[26][0]).toBe(true);
  });

  it('keeps whatever difficulty it generates', () => {
    // Unaimed: nothing is rejected for its metrics, so the label is read off the
    // finished cube rather than aimed at. The stored label has to be
    // reproducible from the puzzle's own metrics — the invariant
    // `scripts/audit.mts` enforces across the archive, asserted here at the
    // point the label is assigned.
    expect(Object.keys(cubeBands)).toContain(puzzle.difficulty);
    expect(puzzle.difficulty).toBe(classify(cubeBands, result.metrics));
  });

  it('round-trips every generated clue exactly', () => {
    for (const person of puzzle.people) {
      if (!person.origHint) continue;
      expect(render(parseHint(person.origHint), { professionTotals: true })).toBe(person.clue);
    }
  });

  it('never puts a clue on a card the clue talks about', () => {
    // Enforced by construction; assert on the rendered markup, which names cards.
    // The trailing (?!\d) matters: a plain substring test for "#NAMES:1" also
    // matches "#NAMES:11", and card 1 hosting a clue about card 11 is legal.
    puzzle.people.forEach((person, i) => {
      if (!person.clue) return;
      expect(person.clue).not.toMatch(new RegExp(`#NAMES?:${i}(?!\\d)`));
    });
  });

  it('gives every non-initial card at least one sufficient path', () => {
    puzzle.people.forEach((person, i) => {
      if (puzzle.initialReveals.includes(i)) return;
      expect(person.paths, `people[${i}]`).not.toBeNull();
      expect((person.paths as number[][]).length).toBeGreaterThan(0);
    });
  });

  it('ships hints a player can act on', () => {
    // Every non-initial card is hintable, every card a step claims is one the
    // player does not already hold, and the clues it outlines are the ones the
    // deduction actually needs.
    const hints = puzzle.hints as NonNullable<typeof puzzle.hints>;
    for (const step of hints) {
      expect(step.reveals.length).toBeGreaterThan(0);
      for (const i of step.clues) {
        expect(step.flipped).toContain(i);
        expect(clues[i]).not.toBeNull();
      }
      for (const i of step.reveals) expect(step.flipped).not.toContain(i);
    }
    const hintable = new Set(hints.flatMap((s) => s.reveals));
    puzzle.people.forEach((_, i) => {
      if (!puzzle.initialReveals.includes(i)) expect(hintable, `card ${i}`).toContain(i);
    });
  });

  it('offers a hint from the opening position', () => {
    // The prerequisite of a step is the minimal path, not the solve state it was
    // found in, so the first hint has to be reachable with only the cards the
    // player is handed. A wave-shaped step whose prerequisite is a dozen cards
    // leaves the button dead on move one.
    const hints = puzzle.hints as NonNullable<typeof puzzle.hints>;
    const opening = hints.filter((s) => s.flipped.every((i) => puzzle.initialReveals.includes(i)));
    expect(opening.length).toBeGreaterThan(0);
  });

  it('spreads its clues over predicates instead of leaning on one', () => {
    // The archive averages 9.4 distinct predicates per puzzle over ~12 clues,
    // and its worst repeat across all 54 is 7. Weighting the pool toward the
    // archive's mix is a property of the whole pool, not of one puzzle, so
    // nothing there stops a chain taking the same predicate eight times because
    // it kept working; `buildChain`'s repeat penalty is what does. Measured as
    // distinct predicates per clue, which holds still as the clue count moves:
    // 0.78 across the archive, 0.73 at 4x5.
    const m = new Map<string, number>();
    for (const person of puzzle.people) {
      if (!person.origHint) continue;
      m.set(parseHint(person.origHint).pred, (m.get(parseHint(person.origHint).pred) ?? 0) + 1);
    }
    const total = [...m.values()].reduce((a, b) => a + b, 0);
    expect(m.size / total).toBeGreaterThanOrEqual(0.6);
    expect(Math.max(...m.values())).toBeLessThanOrEqual(3);
  });

  it('uses only original titles and flavour text', () => {
    expect(puzzle.source).toBe('generated');
    expect(TITLES).toContain(puzzle.title);
    for (const person of puzzle.people) {
      if (person.origHint === null) expect(person.clue).not.toBeNull();
    }
  });

  it(
    'is deterministic in its seed',
    () => {
      expect(generatePuzzle(input).puzzle).toEqual(puzzle);
    },
    120_000,
  );

  it(
    'scales the band it was given to the cube it is filling',
    () => {
      // The bands are calibrated on the archive's twenty-card board, so a count
      // in one means "out of twenty". Sampling straight from an unscaled band
      // gives the cube a thinner puzzle than any real one. min === max, so the
      // criminal count here is decided entirely by the scaling: ten of twenty
      // rounds to fourteen of 27.
      const tenOfTwenty: LabelBand = { ...band, criminals: { min: 10, max: 10 } };
      const { puzzle: p } = generatePuzzle({ ...input, band: tenOfTwenty, seed: 5 });
      expect(p.people.filter((q) => q.criminal).length).toBe(14);
    },
    120_000,
  );
}, 240_000);
