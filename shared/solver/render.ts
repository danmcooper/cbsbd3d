import type { Hint, HintArg, Trait, Unit, UnitKind } from './hint';

export class UnsupportedShapeError extends Error {}

const name = (i: number) => `#NAME:${i}`;
const names = (i: number) => `#NAMES:${i}`;
const prof = (p: string) => `#PROF:${p}`;
const profs = (p: string) => `#PROFS:${p}`;
/**
 * "3 teachers" — the profession's whole cast, not just the ones being counted.
 * Expanded by the site, which has the board and can count; the renderer works
 * from the hint alone and has no way to know.
 */
const profN = (p: string) => `#PROFN:${p}`;

/**
 * How much the renderer says beyond the bare claim.
 *
 * `professionTotals` turns "Exactly 1 cook has an innocent directly below them"
 * into "Exactly 1 of 3 cooks has …". Twenty-seven suspects is more than you can
 * count at a glance, so generation turns it on; it stays an option because the
 * shorter sentence is the one the clue vocabulary was written for.
 *
 * Only for clues that put a number on one profession's members. A comparison
 * between two professions ("more criminal judges than criminal mechanics") is
 * about the difference, and two totals in one sentence obscure it rather than
 * help.
 */
export interface RenderOptions {
  professionTotals?: boolean;
}

const NO_EXTRAS: RenderOptions = {};
const between = (a: number, b: number) => `#BETWEEN:pair(${a},${b})`;

/**
 * Slab names are the address itself: column 2 is column B, slice 2 is slice b.
 * The 2D game had to emit a `#C:` token because its column count varied with
 * the board; a cube has exactly three of each, always A-C, 1-3 and a-c.
 */
const colLetter = (n: number) => 'ABC'[n - 1];
const sliceLetter = (n: number) => 'abc'[n - 1];

/** The six directions, as the phrase that names everything past a card. */
const WIDE: Record<string, string> = {
  '0,-1,0': 'above',
  '0,1,0': 'below',
  '-1,0,0': 'to the left of',
  '1,0,0': 'to the right of',
  '0,0,-1': 'in front of',
  '0,0,1': 'behind',
};

const dirKey = (dx: number, dy: number, dz: number) => `${dx},${dy},${dz}`;

export function plural(t: Trait, n: number): string {
  return n === 1 ? t : `${t}s`;
}

const article = (t: Trait) => (t === 'innocent' ? 'an innocent' : 'a criminal');

type NeighborUnit = Extract<Unit, { kind: 'hneighbor' | 'vneighbor' }>;

/**
 * Only the two neighbour *units* carry an axis, because only they are named in
 * clue text. The adjacency *relation* — the plain "neighbor" of
 * `max_number_of_traits_in_neighbors_in_unit` and friends — is the union of
 * both, and says so with no adjective.
 */
const isNeighborUnit = (u: Unit): u is NeighborUnit =>
  u.kind === 'hneighbor' || u.kind === 'vneighbor';
const axisWord = (k: NeighborUnit['kind']) => (k === 'hneighbor' ? 'horizontal' : 'vertical');
const axisAdverb = (k: NeighborUnit['kind']) =>
  k === 'hneighbor' ? 'horizontally' : 'vertically';

/** "no criminals" / "only one criminal" / "exactly 3 criminals". */
function quantity(n: number, t: Trait): string {
  if (n === 0) return `no ${t}s`;
  if (n === 1) return `only one ${t}`;
  return `exactly ${n} ${t}s`;
}

/** "no criminals" / "one criminal" / "3 criminals" — for "with exactly …" contexts */
function bareQuantity(n: number, t: Trait): string {
  if (n === 0) return `no ${t}s`;
  if (n === 1) return `one ${t}`;
  return `${n} ${t}s`;
}

/** Locative phrase: where the members of this unit are. */
export function where(u: Unit): string {
  switch (u.kind) {
    case 'row':
      return `in row ${u.n}`;
    case 'col':
      return `in column ${colLetter(u.n)}`;
    case 'slice':
      return `in slice ${sliceLetter(u.n)}`;
    case 'hneighbor':
    case 'vneighbor':
      return `among the ${axisWord(u.kind)} neighbors of ${name(u.i)}`;
    case 'reach': {
      const wide = WIDE[dirKey(u.dir[0], u.dir[1], u.dir[2])];
      if (!wide) throw new UnsupportedShapeError(`no phrase for direction ${u.dir}`);
      return `${wide} ${name(u.i)}`;
    }
    case 'between':
      return between(u.a, u.b);
    case 'corner':
      return 'in the corners';
    case 'edge':
      return 'on the edges';
    case 'face':
      return 'at the face centers';
    case 'core':
      return 'in the core';
    case 'profession':
      throw new UnsupportedShapeError('profession has no locative phrase');
  }
}

/**
 * Locative phrase for a single person: the position groups go singular, because
 * "Only one person in the corners" is not a sentence.
 */
export function wherePerson(u: Unit): string {
  switch (u.kind) {
    case 'corner':
      return 'in a corner';
    case 'edge':
      return 'on an edge';
    case 'face':
      return 'at a face center';
    default:
      return where(u);
  }
}

/** The single step: "directly above them", "directly behind them". */
export function dirPhrase(dx: number, dy: number, dz: number): string {
  const wide = WIDE[dirKey(dx, dy, dz)];
  if (!wide) throw new UnsupportedShapeError(`no phrase for direction (${dx},${dy},${dz})`);
  return `directly ${wide} them`;
}

function kindWord(k: UnitKind): string {
  if (k === 'row') return 'row';
  if (k === 'col') return 'column';
  if (k === 'slice') return 'slice';
  throw new UnsupportedShapeError(`no noun for kind ${k}`);
}

function argUnit(a: HintArg[], k: number): Unit {
  const x = a[k];
  if (x.t !== 'unit') throw new UnsupportedShapeError(`arg ${k} is not a unit`);
  return x.unit;
}
function argKind(a: HintArg[], k: number): UnitKind {
  const x = a[k];
  if (x.t !== 'kind') throw new UnsupportedShapeError(`arg ${k} is not a kind`);
  return x.kind;
}
function argTrait(a: HintArg[], k: number): Trait {
  const x = a[k];
  if (x.t !== 'trait') throw new UnsupportedShapeError(`arg ${k} is not a trait`);
  return x.trait;
}
function argNum(a: HintArg[], k: number): number {
  const x = a[k];
  if (x.t !== 'num') throw new UnsupportedShapeError(`arg ${k} is not a number`);
  return x.n;
}
function argIndex(a: HintArg[], k: number): number {
  const x = a[k];
  if (x.t !== 'index') throw new UnsupportedShapeError(`arg ${k} is not an index`);
  return x.i;
}
function argProfession(a: HintArg[], k: number): string {
  const x = a[k];
  if (x.t !== 'profession') throw new UnsupportedShapeError(`arg ${k} is not a profession`);
  return x.name;
}

/** The "…is/are X" side of a two-unit clue, possessive where that reads better. */
function predicateTail(u: Unit, singular: boolean): string {
  if (isNeighborUnit(u)) {
    return `${names(u.i)} ${axisWord(u.kind)} neighbor${singular ? '' : 's'}`;
  }
  return where(u);
}

function pairOfSameKind<U extends Unit>(u1: U, u2: Unit): asserts u2 is U {
  if (u1.kind !== u2.kind) {
    throw new UnsupportedShapeError(`mixed unit kinds ${u1.kind}/${u2.kind}`);
  }
}

/** Subject phrase for direction clues: "3 persons in a corner" / "2 #PROFS:cook". */
function dirSubject(u: Unit, n: number, o: RenderOptions): string {
  if (u.kind === 'profession') {
    if (o.professionTotals) return `Exactly ${n} of ${profN(u.name)}`;
    return n === 1 ? `Only one ${prof(u.name)}` : `${n} ${profs(u.name)}`;
  }
  // One person stands on an edge; three of them stand on the edges.
  return n === 1 ? `Only one person ${wherePerson(u)}` : `${n} persons ${where(u)}`;
}

export const RENDERERS: Record<string, (a: HintArg[], o: RenderOptions) => string> = {
  has_trait: (a) => {
    const t = argTrait(a, 1);
    return `${name(argIndex(a, 0))} is ${t === 'innocent' ? 'innocent' : 'a criminal'}`;
  },

  number_of_traits: (a) => `There are ${argNum(a, 1)} ${argTrait(a, 0)}s in total`,

  number_of_traits_in_unit: (a) => {
    const u = argUnit(a, 0);
    const t = argTrait(a, 1);
    const n = argNum(a, 2);
    if (isNeighborUnit(u)) {
      const w = axisWord(u.kind);
      const q =
        n === 0
          ? `no ${t} ${w} neighbors`
          : n === 1
            ? `only one ${t} ${w} neighbor`
            : `exactly ${n} ${t} ${w} neighbors`;
      return `${name(u.i)} has ${q}`;
    }
    const verb = n === 1 ? 'There is' : 'There are';
    return `${verb} ${quantity(n, t)} ${where(u)}`;
  },

  min_number_of_traits_in_unit: (a) => {
    const t = argTrait(a, 1);
    const n = argNum(a, 2);
    const verb = n === 1 ? 'There is' : 'There are';
    return `${verb} at least ${bareQuantity(n, t)} ${where(argUnit(a, 0))}`;
  },

  odd_number_of_traits_in_unit: (a) => {
    const u = argUnit(a, 0);
    const t = argTrait(a, 1);
    if (u.kind === 'profession') return `There's an odd number of ${t} ${profs(u.name)}`;
    return `There's an odd number of ${t}s ${where(u)}`;
  },

  is_one_of_n_traits_in_unit: (a) => {
    const u = argUnit(a, 0);
    const i = argIndex(a, 1);
    const t = argTrait(a, 2);
    const n = argNum(a, 3);
    if (isNeighborUnit(u)) {
      return `${name(i)} is one of ${names(u.i)} ${n} ${t} ${axisWord(u.kind)} neighbors`;
    }
    return `${name(i)} is one of ${n} ${t}s ${where(u)}`;
  },

  is_not_only_trait_in_unit: (a) =>
    `${name(argIndex(a, 1))} is one of two or more ${argTrait(a, 2)}s ${where(argUnit(a, 0))}`,

  all_units_have_at_least_n_traits: (a) => {
    const k = argKind(a, 0);
    const t = argTrait(a, 1);
    const n = argNum(a, 2);
    if (k === 'profession') {
      if (n !== 1) throw new UnsupportedShapeError('profession form only attested for n=1');
      return `There is at least one ${t} among all professions`;
    }
    if (k === 'hneighbor' || k === 'vneighbor') {
      return `Everyone has at least ${n} ${t} ${axisWord(k)} neighbors`;
    }
    return `Each ${kindWord(k)} has at least ${bareQuantity(n, t)}`;
  },

  only_one_unit_has_exactly_n_traits: (a) => {
    const k = argKind(a, 0);
    const t = argTrait(a, 1);
    const n = argNum(a, 2);
    const tail = n === 0 ? `no ${t}s` : `exactly ${bareQuantity(n, t)}`;
    return `Only one ${kindWord(k)} has ${tail}`;
  },

  more_traits_in_unit_than_unit: (a) => {
    const u1 = argUnit(a, 0);
    const u2 = argUnit(a, 1);
    const t = argTrait(a, 2);
    if (isNeighborUnit(u1)) {
      pairOfSameKind(u1, u2);
      return `${name(u1.i)} has more ${t} ${axisWord(u1.kind)} neighbors than ${name(u2.i)}`;
    }
    switch (u1.kind) {
      case 'row':
        pairOfSameKind(u1, u2);
        return `There are more ${t}s in row ${u1.n} than row ${u2.n}`;
      case 'col':
        pairOfSameKind(u1, u2);
        return `There are more ${t}s in column ${colLetter(u1.n)} than column ${colLetter(u2.n)}`;
      case 'slice':
        pairOfSameKind(u1, u2);
        return `There are more ${t}s in slice ${sliceLetter(u1.n)} than slice ${sliceLetter(u2.n)}`;
      case 'profession':
        pairOfSameKind(u1, u2);
        return `There are more ${t} ${profs(u1.name)} than ${t} ${profs(u2.name)}`;
      default:
        throw new UnsupportedShapeError(`more_traits_in_unit_than_unit over ${u1.kind}`);
    }
  },

  equal_number_of_traits_in_units: (a) => {
    const u1 = argUnit(a, 0);
    const u2 = argUnit(a, 1);
    const t = argTrait(a, 2);
    if (isNeighborUnit(u1)) {
      pairOfSameKind(u1, u2);
      return `${name(u1.i)} and ${name(u2.i)} have an equal number of ${t} ${axisWord(u1.kind)} neighbors`;
    }
    switch (u1.kind) {
      case 'row':
        pairOfSameKind(u1, u2);
        return `There's an equal number of ${t}s in rows ${u1.n} and ${u2.n}`;
      case 'col':
        pairOfSameKind(u1, u2);
        return `There's an equal number of ${t}s in columns ${colLetter(u1.n)} and ${colLetter(u2.n)}`;
      case 'slice':
        pairOfSameKind(u1, u2);
        return `There's an equal number of ${t}s in slices ${sliceLetter(u1.n)} and ${sliceLetter(u2.n)}`;
      case 'profession':
        pairOfSameKind(u1, u2);
        return `There are as many ${t} ${profs(u1.name)} as there are ${t} ${profs(u2.name)}`;
      default:
        throw new UnsupportedShapeError(`equal_number_of_traits_in_units over ${u1.kind}`);
    }
  },

  more_traits_in_unit_than_traits_in_unit: (a) => {
    const u1 = argUnit(a, 0);
    const t1 = argTrait(a, 1);
    const u2 = argUnit(a, 2);
    const t2 = argTrait(a, 3);
    if (isNeighborUnit(u1)) {
      pairOfSameKind(u1, u2);
      const w = axisWord(u1.kind);
      return `${name(u1.i)} has more ${t1} ${w} neighbors than ${name(u2.i)} has ${t2} ones`;
    }
    switch (u1.kind) {
      case 'row':
        pairOfSameKind(u1, u2);
        return `There are more ${t1}s in row ${u1.n} than ${t2}s in row ${u2.n}`;
      case 'col':
        pairOfSameKind(u1, u2);
        return `There are more ${t1}s in column ${colLetter(u1.n)} than ${t2}s in column ${colLetter(u2.n)}`;
      case 'slice':
        pairOfSameKind(u1, u2);
        return `There are more ${t1}s in slice ${sliceLetter(u1.n)} than ${t2}s in slice ${sliceLetter(u2.n)}`;
      case 'profession':
        pairOfSameKind(u1, u2);
        return `There are more ${t1} ${profs(u1.name)} than ${t2} ${profs(u2.name)}`;
      default:
        throw new UnsupportedShapeError(`more_traits_in_unit_than_traits_in_unit over ${u1.kind}`);
    }
  },

  equal_traits_in_unit_and_traits_in_unit: (a) => {
    const u1 = argUnit(a, 0);
    const t1 = argTrait(a, 1);
    const u2 = argUnit(a, 2);
    const t2 = argTrait(a, 3);
    if (isNeighborUnit(u1)) {
      pairOfSameKind(u1, u2);
      const w = axisWord(u1.kind);
      return `${name(u1.i)} has as many ${t1} ${w} neighbors as ${name(u2.i)} has ${t2} ones`;
    }
    switch (u1.kind) {
      case 'row':
        pairOfSameKind(u1, u2);
        return `There are as many ${t1}s in row ${u1.n} as ${t2}s in row ${u2.n}`;
      case 'col':
        pairOfSameKind(u1, u2);
        return `There are as many ${t1}s in column ${colLetter(u1.n)} as ${t2}s in column ${colLetter(u2.n)}`;
      case 'slice':
        pairOfSameKind(u1, u2);
        return `There are as many ${t1}s in slice ${sliceLetter(u1.n)} as ${t2}s in slice ${sliceLetter(u2.n)}`;
      case 'profession':
        pairOfSameKind(u1, u2);
        return `There are as many ${t1} ${profs(u1.name)} as there are ${t2} ${profs(u2.name)}`;
      default:
        throw new UnsupportedShapeError(`equal_traits_in_unit_and_traits_in_unit over ${u1.kind}`);
    }
  },

  more_traits_than_traits_in_unit: (a) => {
    const u = argUnit(a, 0);
    const t1 = argTrait(a, 1);
    const t2 = argTrait(a, 2);
    if (isNeighborUnit(u)) {
      return `${name(u.i)} has more ${t1} than ${t2} ${axisWord(u.kind)} neighbors`;
    }
    return `There are more ${t1}s than ${t2}s ${where(u)}`;
  },

  equal_traits_and_traits_in_unit: (a) => {
    const u = argUnit(a, 0);
    const t1 = argTrait(a, 1);
    const t2 = argTrait(a, 2);
    if (u.kind === 'profession') {
      return `There's an equal number of ${t1} and ${t2} ${profs(u.name)}`;
    }
    return `There are as many ${t1}s as ${t2}s ${where(u)}`;
  },

  has_most_traits: (a) => {
    const u = argUnit(a, 0);
    const t = argTrait(a, 1);
    if (isNeighborUnit(u)) {
      return `${name(u.i)} has the most ${t} ${axisWord(u.kind)} neighbors`;
    }
    switch (u.kind) {
      case 'row':
        return `Row ${u.n} has more ${t}s than any other row`;
      case 'col':
        return `Column ${colLetter(u.n)} has more ${t}s than any other column`;
      case 'slice':
        return `Slice ${sliceLetter(u.n)} has more ${t}s than any other slice`;
      default:
        throw new UnsupportedShapeError(`has_most_traits over ${u.kind}`);
    }
  },

  only_unit_has_exactly_n_traits: (a) => {
    const u = argUnit(a, 0);
    const t = argTrait(a, 1);
    const n = argNum(a, 2);
    const tail = n === 0 ? `no ${t}s` : `exactly ${bareQuantity(n, t)}`;
    if (u.kind === 'row') return `Row ${u.n} is the only row with ${tail}`;
    if (u.kind === 'col') return `Column ${colLetter(u.n)} is the only column with ${tail}`;
    if (u.kind === 'slice') return `Slice ${sliceLetter(u.n)} is the only slice with ${tail}`;
    if (isNeighborUnit(u)) {
      const w = axisWord(u.kind);
      const q =
        n === 0
          ? `no ${t} ${w} neighbors`
          : n === 1
            ? `exactly one ${t} ${w} neighbor`
            : `exactly ${n} ${t} ${w} neighbors`;
      return `${name(u.i)} is the only one with ${q}`;
    }
    throw new UnsupportedShapeError(`only_unit_has_exactly_n_traits over ${u.kind}`);
  },

  units_share_n_traits: (a) => {
    const u1 = argUnit(a, 0);
    const u2 = argUnit(a, 1);
    const t = argTrait(a, 2);
    const n = argNum(a, 3);
    if (isNeighborUnit(u1) && isNeighborUnit(u2) && u1.kind === u2.kind) {
      const w = axisWord(u1.kind);
      const q =
        n === 0
          ? `no ${t} ${w} neighbors`
          : n === 1
            ? `only one ${t} ${w} neighbor`
            : `${n} ${t} ${w} neighbors`;
      return `${name(u1.i)} and ${name(u2.i)} have ${q} in common`;
    }
    const tail = predicateTail(u2, n === 1);
    if (n === 0) return `No ${t} ${where(u1)} is ${tail}`;
    const verb = n === 1 ? 'is' : 'are';
    return `Exactly ${n} ${plural(t, n)} ${where(u1)} ${verb} ${tail}`;
  },

  units_share_odd_n_traits: (a) => {
    const u1 = argUnit(a, 0);
    const u2 = argUnit(a, 1);
    const t = argTrait(a, 2);
    const nbr = isNeighborUnit(u1) ? u1 : isNeighborUnit(u2) ? u2 : null;
    if (nbr === null) {
      throw new UnsupportedShapeError('units_share_odd_n_traits needs a neighbor unit');
    }
    const other = nbr === u1 ? u2 : u1;
    if (isNeighborUnit(other)) {
      throw new UnsupportedShapeError('units_share_odd_n_traits over two neighbor units');
    }
    return `An odd number of ${t}s ${where(other)} ${axisAdverb(nbr.kind)} neighbor ${name(nbr.i)}`;
  },

  unit_shares_n_out_of_n_traits_with_unit: (a) => {
    const u1 = argUnit(a, 0);
    const u2 = argUnit(a, 1);
    const t = argTrait(a, 2);
    const n = argNum(a, 3);
    const m = argNum(a, 4);
    const head = n === 1 ? `Only 1 of the ${m} ${t}s` : `Exactly ${n} of the ${m} ${t}s`;
    const verb = n === 1 ? 'is' : 'are';
    return `${head} ${where(u1)} ${verb} ${predicateTail(u2, n === 1)}`;
  },

  max_number_of_traits_in_neighbors_in_unit: (a) => {
    const t = argTrait(a, 1);
    const n = argNum(a, 2);
    const tail = n === 1 ? `one ${t} neighbor` : `${n} ${t} neighbors`;
    return `No one ${where(argUnit(a, 0))} has more than ${tail}`;
  },

  both_traits_in_unit_are_in_unit: (a) =>
    `Both ${argTrait(a, 2)}s ${where(argUnit(a, 0))} are ${predicateTail(argUnit(a, 1), false)}`,

  only_trait_in_unit_is_in_unit: (a) =>
    `The only ${argTrait(a, 2)} ${where(argUnit(a, 0))} is ${predicateTail(argUnit(a, 1), true)}`,

  both_traits_are_neighbors_in_unit: (a) =>
    `Both ${argTrait(a, 1)}s ${where(argUnit(a, 0))} are connected`,

  all_traits_are_neighbors_in_unit: (a) =>
    `All ${argTrait(a, 1)}s ${where(argUnit(a, 0))} are connected`,

  only_one_person_in_unit_has_exactly_n_trait_neighbors: (a, o) => {
    const u = argUnit(a, 0);
    const t = argTrait(a, 1);
    const n = argNum(a, 2);
    const head =
      u.kind !== 'profession'
        ? `Only one person ${wherePerson(u)}`
        : o.professionTotals
          ? `Exactly 1 of ${profN(u.name)}`
          : `Only one ${prof(u.name)}`;
    const tail =
      n === 0
        ? `no ${t} neighbors`
        : n === 1
          ? `exactly one ${t} neighbor`
          : `exactly ${n} ${t} neighbors`;
    return `${head} has ${tail}`;
  },

  n_in_unit_have_trait_in_dir: (a, o) => {
    const u = argUnit(a, 0);
    const t = argTrait(a, 1);
    const n = argNum(a, 5);
    const verb = n === 1 ? 'has' : 'have';
    const d = dirPhrase(argNum(a, 2), argNum(a, 3), argNum(a, 4));
    return `${dirSubject(u, n, o)} ${verb} ${article(t)} ${d}`;
  },

  n_t_in_unit_have_trait_in_dir: (a) => {
    const u = argUnit(a, 0);
    const t1 = argTrait(a, 1);
    const t2 = argTrait(a, 2);
    const n = argNum(a, 6);
    const head = n === 1 ? `Only one ${t1}` : `Exactly ${n} ${t1}s`;
    const verb = n === 1 ? 'has' : 'have';
    const d = dirPhrase(argNum(a, 3), argNum(a, 4), argNum(a, 5));
    return `${head} ${where(u)} ${verb} ${article(t2)} ${d}`;
  },

  n_professions_have_trait_in_dir: (a, o) => {
    const p = argProfession(a, 0);
    const t = argTrait(a, 1);
    const n = argNum(a, 5);
    const head = o.professionTotals
      ? n === 0
        ? `None of ${profN(p)} has`
        : `Exactly ${n} of ${profN(p)} ${n === 1 ? 'has' : 'have'}`
      : n === 0
        ? `No ${prof(p)} has`
        : n === 1
          ? `Exactly 1 ${prof(p)} has`
          : `${n} ${profs(p)} have`;
    const d = dirPhrase(argNum(a, 2), argNum(a, 3), argNum(a, 4));
    return `${head} ${article(t)} ${d}`;
  },
};

export function render(h: Hint, options: RenderOptions = NO_EXTRAS): string {
  const fn = RENDERERS[h.pred];
  if (!fn) throw new UnsupportedShapeError(h.pred);
  return fn(h.args, options);
}

export function canRender(h: Hint): boolean {
  try {
    render(h);
    return true;
  } catch (e) {
    if (e instanceof UnsupportedShapeError) return false;
    throw e;
  }
}
