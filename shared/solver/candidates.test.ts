import { describe, expect, it } from 'vitest';
import { candidateHints, candidateUnits, namedCards, referencedCards } from './candidates';
import { MAX_ENUMERATED_UNIT } from './encode';
import { type Hint, formatHint, formatUnit, parseHint } from './hint';
import { DIRS, LATTICE, adjacent, indexOfAddress, reachMembers } from './lattice';
import { type Board, evaluate, makeBoard, unitMembers } from './predicates';
import { canRender, render } from './render';

const PROFESSIONS = Array.from({ length: 27 }, (_, i) =>
  i % 3 === 0 ? 'cook' : i % 3 === 1 ? 'cop' : 'pilot',
);
const CRIMINALS = [0, 1, 6, 13, 19, 22, 25];
const board = makeBoard(
  PROFESSIONS,
  Array.from({ length: 27 }, (_, i) => CRIMINALS.includes(i)),
);

describe('candidateUnits', () => {
  const units = candidateUnits(board);

  it('offers every unit kind the cube has', () => {
    const kinds = new Set(units.map((u) => u.kind));
    expect(kinds).toEqual(
      new Set([
        'row',
        'col',
        'slice',
        'hneighbor',
        'vneighbor',
        'reach',
        'between',
        'profession',
        'corner',
        'edge',
        'face',
        'core',
      ]),
    );
  });

  it('offers between segments along all three axes, endpoints in order', () => {
    const betweens = units.filter((u) => u.kind === 'between');
    // 9 lines per axis * C(3,2) pairs = 27 per axis, three axes.
    expect(betweens.length).toBe(81);
    for (const u of betweens) {
      const seg = u as { a: number; b: number };
      expect(seg.a).toBeLessThan(seg.b);
      expect(unitMembers(board, u).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('never offers an empty reach', () => {
    const reaches = units.filter((u) => u.kind === 'reach');
    // Along each direction, the 18 cards that are not already in the far slab.
    expect(reaches.length).toBe(108);
    for (const u of reaches) expect(unitMembers(board, u).length).toBeGreaterThan(0);
  });
});

describe('candidateHints', () => {
  const hints = candidateHints(board);

  it('produces a large pool covering many predicates', () => {
    expect(hints.length).toBeGreaterThan(5000);
    expect(new Set(hints.map((h) => h.pred)).size).toBeGreaterThanOrEqual(25);
  });

  it('produces only true, renderable hints', () => {
    for (const h of hints) {
      expect(evaluate(board, h), formatHint(h)).toBe(true);
      expect(canRender(h), formatHint(h)).toBe(true);
    }
  });

  it('contains no duplicates', () => {
    const strings = hints.map(formatHint);
    expect(new Set(strings).size).toBe(strings.length);
  });

  it('offers only the six single steps as directions', () => {
    const dirs = new Set(
      hints
        .filter((h) => h.pred.endsWith('_in_dir'))
        .map((h) =>
          h.args
            .slice(-4, -1)
            .map((a) => (a as { n: number }).n)
            .join(','),
        ),
    );
    expect([...dirs].sort()).toEqual([
      '-1,0,0',
      '0,-1,0',
      '0,0,-1',
      '0,0,1',
      '0,1,0',
      '1,0,0',
    ]);
  });

  it('never counts zero in a directional clue', () => {
    // These read as a template that never got its "no one" branch: "Only one
    // person in a corner has an innocent above them", never "0 persons in a
    // corner have ...".
    const families = new Set([
      'n_in_unit_have_trait_in_dir',
      'n_t_in_unit_have_trait_in_dir',
      'n_professions_have_trait_in_dir',
    ]);
    let seen = 0;
    for (const h of hints) {
      if (!families.has(h.pred)) continue;
      seen++;
      const count = h.args[h.args.length - 1];
      expect(count.t).toBe('num');
      if (count.t === 'num') expect(count.n, formatHint(h)).toBeGreaterThan(0);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('offers cross-trait comparisons between two units, but only where they say something new', () => {
    const cross = hints.filter(
      (h) =>
        h.pred === 'more_traits_in_unit_than_traits_in_unit' ||
        h.pred === 'equal_traits_in_unit_and_traits_in_unit',
    );
    expect(cross.length).toBeGreaterThan(0);
    for (const h of cross) {
      const [u1, t1, u2, t2] = h.args;
      if (u1.t !== 'unit' || u2.t !== 'unit') throw new Error('expected two units');
      // Same kind, because that is the only shape the renderer has words for, and
      // because "as many criminals in row 2 as innocent cooks" reads as two clues
      // glued together.
      expect(u1.unit.kind, formatHint(h)).toBe(u2.unit.kind);
      expect(formatUnit(u1.unit)).not.toBe(formatUnit(u2.unit));
      // Equal traits would make this the existing same-trait comparison in longer
      // words; equal units would make it the existing same-unit one.
      expect(t1.t === 'trait' && t2.t === 'trait' && t1.trait !== t2.trait, formatHint(h)).toBe(
        true,
      );
    }
  });

  it('never shares all of a unit\'s traits', () => {
    // "Only 1 of the 1 criminals ..." is both bad phrasing and a duplicate of
    // both_traits_in_unit_are_in_unit.
    let seen = 0;
    for (const h of hints) {
      if (h.pred !== 'unit_shares_n_out_of_n_traits_with_unit') continue;
      seen++;
      const [shared, total] = h.args.slice(3);
      if (shared.t !== 'num' || total.t !== 'num') throw new Error('expected two numbers');
      expect(shared.n, formatHint(h)).toBeGreaterThan(0);
      expect(shared.n, formatHint(h)).toBeLessThan(total.n);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('never singles out one member of a unit whose members all share the trait', () => {
    let seen = 0;
    for (const h of hints) {
      if (h.pred !== 'is_one_of_n_traits_in_unit') continue;
      const unit = h.args[0];
      const count = h.args[3];
      if (unit.t !== 'unit' || count.t !== 'num') throw new Error('expected a unit and a number');
      seen++;
      expect(count.n, formatHint(h)).toBeGreaterThan(1);
      expect(count.n, formatHint(h)).toBeLessThan(unitMembers(board, unit.unit).length);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('asks about connectedness only where the answer is not free, and only where it encodes', () => {
    // A unit whose members are all mutually adjacent answers "are they connected"
    // before the board is even dealt. And `encode.ts` builds the clause by walking
    // the unit's subsets, so it refuses anything past MAX_ENUMERATED_UNIT — which
    // on the cube is exactly the 18-cell reaches.
    const connectedness = ['both_traits_are_neighbors_in_unit', 'all_traits_are_neighbors_in_unit'];
    let seen = 0;
    for (const h of hints) {
      if (!connectedness.includes(h.pred)) continue;
      seen++;
      const arg0 = h.args[0];
      if (arg0.t !== 'unit') throw new Error('expected a unit');
      const members = unitMembers(board, arg0.unit);
      expect(members.length, formatHint(h)).toBeLessThanOrEqual(MAX_ENUMERATED_UNIT);
      const clique = members.every((x) =>
        members.every((y) => x === y || adjacent(board.lattice, x, y)),
      );
      expect(clique, formatHint(h)).toBe(false);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('keeps structural predicates off an 18-cell reach', () => {
    const big = { kind: 'reach', i: indexOfAddress('B3b'), dir: DIRS.up } as const;
    expect(reachMembers(LATTICE, big.i, big.dir).length).toBe(18);
    const structural = hints.filter(
      (h) =>
        (h.pred === 'all_traits_are_neighbors_in_unit' ||
          h.pred === 'both_traits_are_neighbors_in_unit') &&
        formatHint(h).includes(formatUnit(big)),
    );
    expect(structural).toEqual([]);
  });

  it('never ranks a unit against a kind that has fewer than two units', () => {
    // has_most_traits and only_unit_has_exactly_n_traits compare a unit against
    // every other of its kind. Where there is no other, they are vacuously true.
    const vacuous = new Set(['between', 'reach', 'corner', 'edge', 'face', 'core']);
    for (const h of hints) {
      if (h.pred !== 'has_most_traits' && h.pred !== 'only_unit_has_exactly_n_traits') continue;
      const arg0 = h.args[0];
      if (arg0.t !== 'unit') throw new Error('expected a unit');
      expect(vacuous.has(arg0.unit.kind), formatHint(h)).toBe(false);
    }
  });
});

describe('candidateHints tautology regression', () => {
  it(
    'offers nothing that is true of every board',
    () => {
      // The 2D suite enumerated all 512 assignments of a 3x3 board; a cube's
      // 2^27 is out of reach, so this samples instead. Pools are built from
      // several assignments rather than one, because a filter that is wrong only
      // for some other assignment's pool would otherwise sail through untested —
      // that is exactly how the max_number_of_traits_in_neighbors_in_unit
      // tautology escaped detection in 2D. Falsification then runs against a
      // wider sample, short-circuiting on the first assignment that disagrees, so
      // only a genuine tautology pays for the whole sweep.
      const rng = mulberry32(20260904);
      const randomBoard = (rate: number): Board =>
        makeBoard(
          PROFESSIONS,
          Array.from({ length: 27 }, () => rng() < rate),
        );

      const pools = [0.2, 0.35, 0.5, 0.7].map(randomBoard);
      const distinct = new Map<string, Hint>();
      for (const b of pools) {
        for (const h of candidateHints(b)) {
          const key = formatHint(h);
          if (!distinct.has(key)) distinct.set(key, h);
        }
      }
      // Guards against a vacuous pass if candidateHints ever regressed to
      // emitting nothing, or near-nothing from an over-eager filter.
      expect(distinct.size).toBeGreaterThan(100_000);

      const sample = [
        board,
        ...pools,
        makeBoard(PROFESSIONS, Array.from({ length: 27 }, () => false)),
        makeBoard(PROFESSIONS, Array.from({ length: 27 }, () => true)),
        ...Array.from({ length: 200 }, () => randomBoard(0.2 + rng() * 0.6)),
      ];
      for (const h of distinct.values()) {
        expect(
          sample.some((other) => !evaluate(other, h)),
          formatHint(h),
        ).toBe(true);
      }
    },
    180_000,
  );
});

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('referencedCards', () => {
  it('collects unit members and bare indices', () => {
    // Row 2 is the whole y = 1 slab: nine cards across all three slices.
    expect(
      [...referencedCards(board, parseHint('number_of_traits_in_unit(unit(row,2),criminal,1)'))].sort(
        (a, b) => a - b,
      ),
    ).toEqual([3, 4, 5, 12, 13, 14, 21, 22, 23]);
    expect(referencedCards(board, parseHint('has_trait(11,innocent)'))).toEqual(new Set([11]));
  });

  it("includes an anchored unit's own anchor card, not just its members", () => {
    // A neighbour set never contains its own anchor and a reach never contains
    // its own origin — but every rendering names the anchor explicitly.
    expect(referencedCards(board, parseHint('has_most_traits(unit(hneighbor,5),criminal)'))).toContain(5);
    expect(
      referencedCards(board, parseHint('number_of_traits_in_unit(unit(reach,4:0,0,1),criminal,2)')),
    ).toContain(4);
  });
});

describe('namedCards', () => {
  it('names direct indices and anchors, never ordinary unit members', () => {
    // A slab renders as a locative phrase ("in row 2"), so none of its members
    // shows up here — unlike referencedCards, which deliberately includes them.
    expect(namedCards(board, parseHint('number_of_traits_in_unit(unit(row,2),criminal,1)'))).toEqual(
      new Set(),
    );
    expect(namedCards(board, parseHint('number_of_traits_in_unit(unit(core,void),criminal,1)'))).toEqual(
      new Set(),
    );
    expect(namedCards(board, parseHint('has_trait(11,innocent)'))).toEqual(new Set([11]));
    expect(
      namedCards(board, parseHint('is_one_of_n_traits_in_unit(unit(vneighbor,5),1,criminal,2)')),
    ).toEqual(new Set([5, 1]));
    expect(
      namedCards(board, parseHint('all_traits_are_neighbors_in_unit(unit(between,pair(0,6)),criminal)')),
    ).toEqual(new Set([0, 6]));
    expect(
      namedCards(board, parseHint('number_of_traits_in_unit(unit(reach,4:0,0,1),criminal,2)')),
    ).toEqual(new Set([4]));
    expect(namedCards(board, parseHint('has_most_traits(unit(profession,cook),criminal)'))).toEqual(
      new Set(),
    );
  });

  it('names exactly the cards the rendered text puts a marker on', () => {
    // The rendering is the ground truth: a card is named when its own index
    // shows up as a #NAME:/#NAMES: argument, or as an endpoint of a
    // #BETWEEN:pair(a,b), in the clue's text.
    let named = 0;
    for (const h of candidateHints(board)) {
      const text = render(h);
      for (let i = 0; i < 27; i++) {
        let regexSays = false;
        for (const m of text.matchAll(/#NAMES?:(\d+)/g)) if (Number(m[1]) === i) regexSays = true;
        for (const m of text.matchAll(/#BETWEEN:pair\((\d+),(\d+)\)/g)) {
          if (Number(m[1]) === i || Number(m[2]) === i) regexSays = true;
        }
        expect(namedCards(board, h).has(i), `${formatHint(h)} -> "${text}" card ${i}`).toBe(
          regexSays,
        );
        if (regexSays) named++;
      }
    }
    expect(named).toBeGreaterThan(0);
  }, 120_000);
});
