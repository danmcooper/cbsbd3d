/**
 * The proportions a generated cube's clues are drawn in.
 *
 * This cannot be measured here. It comes from `archiveClueMix()` over cbs2's
 * scraped 4x5 archive, is committed as `config/clue-mix.json`, and is
 * translated to the cube's vocabulary by `mixFor3d`. There is no scraped 3D
 * archive and never will be, so re-deriving the JSON means going back to cbs2
 * and running its `archiveClueMix()` again.
 *
 * Everything past the predicate shares is an estimate. It exists to stop the
 * candidate pool's own combinatorial shape deciding the mix - which is how 2D's
 * generated puzzles once came out three times heavier on `between` than any
 * real one - not because anyone measured a cube.
 *
 * `ClueMix` is declared here rather than in `corpus.ts`, where 2D keeps it: it
 * no longer comes from an archive read, so it no longer belongs to one.
 */

export interface ClueMix {
  /** Share of clues per predicate name, summing to 1. */
  pred: Record<string, number>;
  /**
   * Share of unit slots per feature key, as `hintFeatures` emits them:
   * `unit:<kind>`, `unit:between:<length>`, `dir:<dx>,<dy>,<dz>`,
   * `overlap:<n>`.
   */
  feature: Record<string, number>;
  /** One entry per archived board: its profession group sizes, descending. */
  professionShapes: number[][];
}

export class MixFormatError extends Error {}

const shares = (raw: unknown, what: string): Record<string, number> => {
  if (typeof raw !== 'object' || raw === null) throw new MixFormatError(`${what} is not an object`);
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
      throw new MixFormatError(`${what}.${k} must be a non-negative number`);
    }
    out[k] = v;
  }
  return out;
};

/** Validate a parsed `config/clue-mix.json` into a `ClueMix`. */
export function loadMix(data: unknown): ClueMix {
  if (typeof data !== 'object' || data === null) throw new MixFormatError('mix is not an object');
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.professionShapes)) throw new MixFormatError('professionShapes is not an array');
  const professionShapes = d.professionShapes.map((shape, i) => {
    if (!Array.isArray(shape)) throw new MixFormatError(`professionShapes[${i}] is not an array`);
    return shape.map((n) => {
      if (!Number.isInteger(n) || (n as number) < 1) {
        throw new MixFormatError(`professionShapes[${i}] must be positive integers`);
      }
      return n as number;
    });
  });
  return { pred: shares(d.pred, 'pred'), feature: shares(d.feature, 'feature'), professionShapes };
}

/**
 * Translate the flat archive's mix into the cube's vocabulary.
 *
 * `orderPool` zeroes any feature the mix does not mention and never lifts it
 * again, so a key missing here does not merely go under-represented - the whole
 * family of clues carrying it sorts last and is never picked. Every feature
 * `hintFeatures` can emit on a cube therefore needs a share, even where the
 * number backing it is a guess.
 */
export function mixFor3d(flat: ClueMix): ClueMix {
  const f = flat.feature;
  const take = (k: string) => f[k] ?? 0;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(f)) {
    if (k === 'unit:neighbor') {
      // One 2D kind, split in two on the cube. Even halves: the cube's
      // horizontal neighbourhoods are twice the size of its vertical ones, but
      // that shows up in how often each is *available*, not in how often a
      // player should read one.
      out['unit:hneighbor'] = v / 2;
      out['unit:vneighbor'] = v / 2;
    } else if (k.startsWith('dir:')) {
      out[`${k},0`] = v;
    } else {
      out[k] = v;
    }
  }
  out['unit:slice'] = (take('unit:row') + take('unit:col')) / 2;
  // Reach takes the whole between share - both are wide multi-cell units, and
  // between's share is spread across one key per segment length
  // (`unit:between:2` and up), so no single key holds it.
  out['unit:reach'] = Object.entries(f)
    .filter(([k]) => k.startsWith('unit:between'))
    .reduce((acc, [, v]) => acc + v, 0);
  // The 2D board has corners and edges and nothing else; the cube's shell adds
  // face centres and a core. Nothing measured says how often either should be
  // named, so both take a corner's share.
  out['unit:face'] = take('unit:corner');
  out['unit:core'] = take('unit:corner');
  const depth =
    (take('dir:0,-1') + take('dir:0,1') + take('dir:-1,0') + take('dir:1,0')) / 4;
  out['dir:0,0,1'] = depth;
  out['dir:0,0,-1'] = depth;
  return {
    pred: { ...flat.pred },
    feature: out,
    professionShapes: flat.professionShapes.map((s) => [...s]),
  };
}
