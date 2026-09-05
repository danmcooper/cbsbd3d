import { MAX_ENUMERATED_UNIT } from './encode';
import { type Hint, type HintArg, type Trait, type Unit, formatHint } from './hint';
import {
  type Dir,
  DIRS,
  adjacent,
  hNeighbors,
  indexOf,
  offsetIndex,
  reachMembers,
  vNeighbors,
} from './lattice';
import { type Board, countTrait, evaluate, hasTrait, unitMembers, unitsOfKind } from './predicates';
import { canRender } from './render';

const TRAITS: Trait[] = ['criminal', 'innocent'];
const DIR_LIST: Dir[] = Object.values(DIRS);

const u = (unit: Unit): HintArg => ({ t: 'unit', unit });
const t = (trait: Trait): HintArg => ({ t: 'trait', trait });
const n = (value: number): HintArg => ({ t: 'num', n: value });
const idx = (i: number): HintArg => ({ t: 'index', i });
const k = (kind: Unit['kind']): HintArg => ({ t: 'kind', kind });
const pr = (name: string): HintArg => ({ t: 'profession', name });

/**
 * The adjacency *relation*: sharing a face, either axis. Only the neighbour
 * *units* are split horizontal/vertical, because only those are named in clue
 * text — the four predicates that use adjacency as a relation mean both.
 */
const allNeighbors = (b: Board, i: number): number[] => [
  ...hNeighbors(b.lattice, i),
  ...vNeighbors(b.lattice, i),
];

/** The 27 axis-aligned lines of three, as endpoint pairs for `between`. */
function betweenUnits(): Unit[] {
  const out: Unit[] = [];
  const line = (f: (n: number) => number) => {
    for (let a = 0; a < 3; a++) {
      for (let b = a + 1; b < 3; b++) out.push({ kind: 'between', a: f(a), b: f(b) });
    }
  };
  for (let y = 0; y < 3; y++) {
    for (let z = 0; z < 3; z++) line((x) => indexOf(x, y, z));
  }
  for (let x = 0; x < 3; x++) {
    for (let z = 0; z < 3; z++) line((y) => indexOf(x, y, z));
  }
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) line((z) => indexOf(x, y, z));
  }
  return out;
}

export function candidateUnits(b: Board): Unit[] {
  const units: Unit[] = [
    ...unitsOfKind(b, 'row'),
    ...unitsOfKind(b, 'col'),
    ...unitsOfKind(b, 'slice'),
    ...unitsOfKind(b, 'hneighbor'),
    ...unitsOfKind(b, 'vneighbor'),
    ...unitsOfKind(b, 'profession'),
    ...unitsOfKind(b, 'corner'),
    ...unitsOfKind(b, 'edge'),
    ...unitsOfKind(b, 'face'),
    ...unitsOfKind(b, 'core'),
  ];
  // A reach is anchored, so `unitsOfKind` has nothing to enumerate (it returns
  // [] for reach, as it does for between). An empty one — everything above a
  // card already in row 1 — is never offered: it holds no cards, so every
  // count over it is zero on every conceivable board.
  for (let i = 0; i < b.lattice.size; i++) {
    for (const dir of DIR_LIST) {
      if (reachMembers(b.lattice, i, dir).length > 0) units.push({ kind: 'reach', i, dir });
    }
  }
  units.push(...betweenUnits());
  return units;
}

const isAnchored = (u: Unit) =>
  u.kind === 'hneighbor' || u.kind === 'vneighbor' || u.kind === 'between' || u.kind === 'reach';

/** Pairs worth comparing member-by-member: at least one side has to be anchored. */
const isCross = (a: Unit, c: Unit) => isAnchored(a) || isAnchored(c);

/**
 * `has_most_traits` and `only_unit_has_exactly_n_traits` are implemented in predicates.ts
 * as `unitsOfKind(b, u.kind).every(other => sameUnit(other, u) || ...)`. When a unit kind
 * has fewer than two units (each position group always has exactly one; between and reach
 * always have zero, since unitsOfKind returns [] for them), that `.every()` only ever
 * compares the unit to itself and is satisfied trivially, regardless of the board's
 * assignment. Such a clue constrains nothing, so it must never be emitted even though it
 * would evaluate to `true` and render into confident-sounding English.
 */
const hasMultipleUnitsOfKind = (b: Board, unit: Unit): boolean =>
  unitsOfKind(b, unit.kind).length >= 2;

/**
 * True when no member of `members` has a cell in direction `d` — e.g. every member of the
 * unit is already in row 1 and `d` is up. Since offset validity depends only on lattice
 * position, never on the criminal/innocent assignment, this makes the count structurally 0
 * for every conceivable board, not just the actual one.
 */
const dirIsStructurallyEmpty = (b: Board, members: number[], d: Dir): boolean =>
  members.every((i) => offsetIndex(b.lattice, i, d) === null);

/**
 * True when every pair of `members` shares a face — vacuously true with 0 or 1 members. In
 * that case ANY subset is automatically connected, so `all_traits_are_neighbors_in_unit` is
 * true regardless of which cards carry the trait, for every conceivable assignment.
 *
 * `both_traits_are_neighbors_in_unit` is not a tautology on such a unit (it also demands
 * exactly two of the trait, which can fail), but it is worse than useless as a clue: it
 * degenerates into `number_of_traits_in_unit(unit, trait, 2)` wearing a connectedness
 * clause that costs the solver nothing. "Both innocents between B1a and B2a are connected"
 * — there are only two cards there and they are side by side.
 */
const isCompleteAdjacencyGraph = (b: Board, members: number[]): boolean => {
  for (let x = 0; x < members.length; x++) {
    for (let y = x + 1; y < members.length; y++) {
      if (!adjacent(b.lattice, members[x], members[y])) return false;
    }
  }
  return true;
};

/**
 * Connectedness is asked only of units small enough to encode. `encode.ts` walks the
 * subsets of the unit to build the clause, so it refuses anything past
 * `MAX_ENUMERATED_UNIT` — which is every 18-cell reach, and nothing else the cube offers.
 *
 * The 2D generator went further and restricted the question to straight lines, because
 * there adjacency includes diagonals and "connected" has two defensible readings on a
 * scattered set. On the cube adjacency is sharing a face and nothing else, so the question
 * has one answer and any unit small enough to encode can be asked it.
 */
const isConnectableUnit = (b: Board, members: number[]): boolean =>
  members.length <= MAX_ENUMERATED_UNIT && !isCompleteAdjacencyGraph(b, members);

export function candidateHints(b: Board): Hint[] {
  const units = candidateUnits(b);
  const seen = new Set<string>();
  const out: Hint[] = [];

  const push = (pred: string, args: HintArg[]) => {
    const hint: Hint = { pred, args };
    const key = formatHint(hint);
    if (seen.has(key)) return;
    if (!canRender(hint)) return;
    if (!evaluate(b, hint)) return;
    seen.add(key);
    out.push(hint);
  };

  const memberCache = new Map<Unit, number[]>();
  const membersOf = (unit: Unit): number[] => {
    let m = memberCache.get(unit);
    if (m === undefined) {
      m = unitMembers(b, unit);
      memberCache.set(unit, m);
    }
    return m;
  };
  const setCache = new Map<Unit, Set<number>>();
  const setOf = (unit: Unit): Set<number> => {
    let s = setCache.get(unit);
    if (s === undefined) {
      s = new Set(membersOf(unit));
      setCache.set(unit, s);
    }
    return s;
  };

  const count = (unit: Unit, trait: Trait) => countTrait(b, membersOf(unit), trait);
  const overlap = (u1: Unit, u2: Unit, trait: Trait) => {
    const first = setOf(u1);
    return membersOf(u2).filter((i) => first.has(i) && hasTrait(b, i, trait)).length;
  };
  /**
   * Whether u1 and u2's raw memberships (trait-independent) actually overlap. Membership is
   * fixed once the lattice and profession assignment are fixed — it never depends on the
   * criminal/innocent assignment — so when this is false, `overlap` is 0 for every
   * conceivable assignment, and `units_share_n_traits(u1, u2, trait, 0)` is a tautology.
   */
  const membersIntersect = (u1: Unit, u2: Unit) => {
    const first = setOf(u1);
    return membersOf(u2).some((i) => first.has(i));
  };
  /**
   * Two differently-named units can cover exactly the same cards: the vertical neighbors of
   * A1a and of A3a are both the single card A2a. Every two-unit predicate then compares a
   * membership against itself, which no assignment can make false. Cached by unit because the
   * pair loop is O(units^2).
   */
  const sigCache = new Map<Unit, string>();
  const sigOf = (unit: Unit): string => {
    let s = sigCache.get(unit);
    if (s === undefined) {
      s = [...membersOf(unit)].sort((x, y) => x - y).join(',');
      sigCache.set(unit, s);
    }
    return s;
  };
  const dirCount = (members: number[], trait: Trait, d: Dir) =>
    members.filter((i) => {
      const j = offsetIndex(b.lattice, i, d);
      return j !== null && hasTrait(b, j, trait);
    }).length;

  for (let i = 0; i < b.lattice.size; i++) {
    for (const trait of TRAITS) push('has_trait', [idx(i), t(trait)]);
  }
  for (const trait of TRAITS) {
    push('number_of_traits', [t(trait), n(countTrait(b, [...b.criminal.keys()], trait))]);
  }

  for (const unit of units) {
    const members = membersOf(unit);
    const connectable = isConnectableUnit(b, members);
    for (const trait of TRAITS) {
      const c = count(unit, trait);
      push('number_of_traits_in_unit', [u(unit), t(trait), n(c)]);
      // "at least 0 Ts" is true of every conceivable board — counts are never negative.
      if (c >= 1) push('min_number_of_traits_in_unit', [u(unit), t(trait), n(c)]);
      if (c >= 2) push('min_number_of_traits_in_unit', [u(unit), t(trait), n(c - 1)]);
      push('odd_number_of_traits_in_unit', [u(unit), t(trait)]);
      if (hasMultipleUnitsOfKind(b, unit)) {
        push('has_most_traits', [u(unit), t(trait)]);
        push('only_unit_has_exactly_n_traits', [u(unit), t(trait), n(c)]);
      }
      if (connectable) {
        push('both_traits_are_neighbors_in_unit', [u(unit), t(trait)]);
        push('all_traits_are_neighbors_in_unit', [u(unit), t(trait)]);
      }

      const nbrCounts = members.map((i) => countTrait(b, allNeighbors(b, i), trait));
      if (nbrCounts.length > 0) {
        // A cell's trait-neighbor count can never exceed its own degree, which depends only
        // on lattice position, never on the assignment. So whenever the threshold is >= the
        // largest degree among the unit's members, "no one has more than N trait neighbors"
        // is true of every conceivable board — every corner cell has exactly 3 neighbours,
        // so "no one in the corners has more than 3 innocent neighbors" always holds.
        const maxCount = Math.max(...nbrCounts);
        const maxDegree = Math.max(...members.map((i) => allNeighbors(b, i).length));
        if (maxCount < maxDegree) {
          push('max_number_of_traits_in_neighbors_in_unit', [u(unit), t(trait), n(maxCount)]);
        }
      }
      for (const value of new Set(nbrCounts)) {
        push('only_one_person_in_unit_has_exactly_n_trait_neighbors', [u(unit), t(trait), n(value)]);
      }

      for (const i of members) {
        // Two floors. c === 1 renders as "#NAME:1 is one of 1 criminals in row 2" — the
        // same slip as "only 1 of the 1", and the case better worded as "is the only
        // criminal there". c === members.length says every member has the trait, and since
        // unit membership is visible on the board, naming one of them adds nothing.
        if (c >= 2 && c < members.length) {
          push('is_one_of_n_traits_in_unit', [u(unit), idx(i), t(trait), n(c)]);
        }
        push('is_not_only_trait_in_unit', [u(unit), idx(i), t(trait)]);
      }

      for (const d of DIR_LIST) {
        // Skip when no member of the unit even has a cell in this direction — the count
        // would be structurally 0 for every conceivable assignment. `sources` below is
        // always a subset of `members`, so this covers both predicates.
        if (dirIsStructurallyEmpty(b, members, d)) continue;
        // A zero count is contingent, not a tautology — the structural check above already
        // dropped the always-zero shapes — but "0 persons in a corner have an innocent
        // directly above them" is not a sentence worth reading.
        const inDir = dirCount(members, trait, d);
        if (inDir > 0) {
          push('n_in_unit_have_trait_in_dir', [u(unit), t(trait), ...d.map(n), n(inDir)]);
        }
        for (const other of TRAITS) {
          const sources = members.filter((i) => hasTrait(b, i, other));
          const inDirFrom = dirCount(sources, trait, d);
          if (inDirFrom > 0) {
            push('n_t_in_unit_have_trait_in_dir', [
              u(unit),
              t(other),
              t(trait),
              ...d.map(n),
              n(inDirFrom),
            ]);
          }
        }
      }
    }
    for (const [t1, t2] of [
      ['criminal', 'innocent'],
      ['innocent', 'criminal'],
    ] as [Trait, Trait][]) {
      push('more_traits_than_traits_in_unit', [u(unit), t(t1), t(t2)]);
      push('equal_traits_and_traits_in_unit', [u(unit), t(t1), t(t2)]);
    }
  }

  for (const kind of ['row', 'col', 'slice', 'profession', 'hneighbor', 'vneighbor'] as const) {
    const group = unitsOfKind(b, kind);
    if (group.length === 0) continue;
    for (const trait of TRAITS) {
      const counts = group.map((unit) => count(unit, trait));
      const minCount = Math.min(...counts);
      // Same "at least 0" tautology as above.
      if (minCount >= 1) push('all_units_have_at_least_n_traits', [k(kind), t(trait), n(minCount)]);
      if (kind === 'row' || kind === 'col' || kind === 'slice') {
        for (const value of new Set(counts)) {
          push('only_one_unit_has_exactly_n_traits', [k(kind), t(trait), n(value)]);
        }
      }
    }
  }

  for (const u1 of units) {
    for (const u2 of units) {
      if (u1 === u2) continue;
      if (sigOf(u1) === sigOf(u2)) continue;
      const cross = isCross(u1, u2);
      // Trait-independent, so compute once per unit pair rather than once per (pair, trait).
      const intersects = cross && membersIntersect(u1, u2);
      for (const trait of TRAITS) {
        if (u1.kind === u2.kind) {
          push('more_traits_in_unit_than_unit', [u(u1), u(u2), t(trait)]);
          push('equal_number_of_traits_in_units', [u(u1), u(u2), t(trait)]);
          // The cross-trait pair: "as many innocent cooks as criminal cops". Only the
          // opposite trait, since matching traits would just be the two predicates above
          // with a longer sentence. Same kind for the same reason they are: the renderer
          // has words for row/row, not for row/profession.
          const other = trait === 'criminal' ? 'innocent' : 'criminal';
          push('more_traits_in_unit_than_traits_in_unit', [u(u1), t(trait), u(u2), t(other)]);
          push('equal_traits_in_unit_and_traits_in_unit', [u(u1), t(trait), u(u2), t(other)]);
        }
        if (!cross) continue;
        const ov = overlap(u1, u2, trait);
        // Drop when u1/u2 are structurally disjoint (see membersIntersect above) — that
        // shape is always shares-0 regardless of the board, a tautology. Keep n=0 when the
        // units do intersect: "they share none of this trait" is then a real, contingent
        // fact.
        if (intersects) push('units_share_n_traits', [u(u1), u(u2), t(trait), n(ov)]);
        push('units_share_odd_n_traits', [u(u1), u(u2), t(trait)]);
        // A shared count of 0 reads as if the 0 were meaningful when it is often
        // structurally guaranteed. shared === total is just both_traits_in_unit_are_in_unit
        // in worse words.
        const total = count(u1, trait);
        if (ov > 0 && ov < total) {
          push('unit_shares_n_out_of_n_traits_with_unit', [u(u1), u(u2), t(trait), n(ov), n(total)]);
        }
        push('both_traits_in_unit_are_in_unit', [u(u1), u(u2), t(trait)]);
        push('only_trait_in_unit_is_in_unit', [u(u1), u(u2), t(trait)]);
      }
    }
  }

  for (const unit of unitsOfKind(b, 'profession')) {
    const name = (unit as { name: string }).name;
    const members = membersOf(unit);
    for (const trait of TRAITS) {
      for (const d of DIR_LIST) {
        // Same structural boundary check as above: profession membership is fixed given the
        // board, so if every card of this profession structurally lacks a cell in this
        // direction, the count is always 0.
        if (dirIsStructurallyEmpty(b, members, d)) continue;
        const inDir = dirCount(members, trait, d);
        if (inDir > 0) {
          push('n_professions_have_trait_in_dir', [pr(name), t(trait), ...d.map(n), n(inDir)]);
        }
      }
    }
  }

  return out;
}

/**
 * Every card a clue touches, including cards it only reaches through unit membership. This
 * is the strict superset of `namedCards` below; generation uses `namedCards`, because "a
 * clue may not sit on a card it names" is about the rendered text, not about membership.
 */
export function referencedCards(b: Board, h: Hint): Set<number> {
  const cards = new Set<number>();
  for (const arg of h.args) {
    if (arg.t === 'unit') {
      for (const i of unitMembers(b, arg.unit)) cards.add(i);
      // A neighbour or reach unit's anchor is never one of its own members, but every
      // rendering names it explicitly ("among the horizontal neighbors of #NAME:5",
      // "behind #NAME:4"), so the clue references it.
      if (isAnchored(arg.unit) && arg.unit.kind !== 'between') cards.add(arg.unit.i);
    } else if (arg.t === 'index') cards.add(arg.i);
    else if (arg.t === 'profession') {
      for (const i of unitMembers(b, { kind: 'profession', name: arg.name })) cards.add(i);
    }
  }
  return cards;
}

/**
 * Cards a clue's *rendering* actually names, as opposed to every card that happens to be a
 * member of a unit the clue mentions. Ordinary unit membership (a row, a slice, a
 * profession, the corners) never surfaces a card index in the rendered text — only a
 * locative phrase like "in row 3" or "in the corners". Only four shapes put a literal card
 * in the text: a direct `index` argument (renders as `#NAME:i`), a neighbour unit's anchor,
 * a reach's anchor, and a `between` unit's two endpoints (`#BETWEEN:pair(a,b)`).
 */
export function namedCards(b: Board, h: Hint): Set<number> {
  const cards = new Set<number>();
  for (const arg of h.args) {
    if (arg.t === 'index') {
      cards.add(arg.i);
    } else if (arg.t === 'unit') {
      const unit = arg.unit;
      if (unit.kind === 'between') {
        cards.add(unit.a);
        cards.add(unit.b);
      } else if (isAnchored(unit)) {
        cards.add(unit.i);
      }
    }
  }
  return cards;
}
