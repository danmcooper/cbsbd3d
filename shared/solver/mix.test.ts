import { describe, expect, it } from 'vitest';
import mixData from '../../config/clue-mix.json' with { type: 'json' };
import { candidateHints } from './candidates';
import { MixFormatError, loadMix, mixFor3d } from './mix';
import { hintFeatures, makeBoard } from './predicates';

const flat = loadMix(mixData);
const cube = mixFor3d(flat);

describe('loadMix', () => {
  it('reads the vendored file', () => {
    expect(Object.keys(flat.pred).length).toBeGreaterThan(20);
    expect(flat.professionShapes.length).toBeGreaterThan(0);
  });

  it('rejects anything that is not a mix', () => {
    expect(() => loadMix(null)).toThrow(MixFormatError);
    expect(() => loadMix({ pred: {}, feature: {} })).toThrow(MixFormatError);
    expect(() => loadMix({ pred: { a: -1 }, feature: {}, professionShapes: [] })).toThrow(
      MixFormatError,
    );
    expect(() => loadMix({ pred: {}, feature: { a: 'x' }, professionShapes: [] })).toThrow(
      MixFormatError,
    );
    expect(() => loadMix({ pred: {}, feature: {}, professionShapes: [[0]] })).toThrow(
      MixFormatError,
    );
  });
});

describe('mixFor3d', () => {
  it('keeps the predicate shares verbatim', () => {
    expect(cube.pred).toEqual(flat.pred);
  });

  it('splits the 2D neighbour share between the two 3D kinds', () => {
    const half = (flat.feature['unit:neighbor'] ?? 0) / 2;
    expect(half).toBeGreaterThan(0);
    expect(cube.feature['unit:hneighbor']).toBeCloseTo(half);
    expect(cube.feature['unit:vneighbor']).toBeCloseTo(half);
    expect(cube.feature['unit:neighbor']).toBeUndefined();
  });

  it('gives slice the mean of row and column', () => {
    const mean = ((flat.feature['unit:row'] ?? 0) + (flat.feature['unit:col'] ?? 0)) / 2;
    expect(mean).toBeGreaterThan(0);
    expect(cube.feature['unit:slice']).toBeCloseTo(mean);
  });

  it('borrows reach from between, and face and core from corner', () => {
    // `hintFeatures` keys a between by its segment length, so between's share is
    // spread across `unit:between:2` and up rather than sitting under a bare
    // `unit:between` — reading that key alone would silently hand reach a share
    // of zero, which `orderPool` treats as "never generate one of these".
    const between = Object.entries(flat.feature)
      .filter(([k]) => k.startsWith('unit:between'))
      .reduce((a, [, v]) => a + v, 0);
    expect(between).toBeGreaterThan(0);
    expect(cube.feature['unit:reach']).toBeCloseTo(between);
    expect(cube.feature['unit:face']).toBeCloseTo(flat.feature['unit:corner'] ?? 0);
    expect(cube.feature['unit:core']).toBeCloseTo(flat.feature['unit:corner'] ?? 0);
    expect(cube.feature['unit:corner']).toBeGreaterThan(0);
  });

  it('extends every direction key with a depth component', () => {
    for (const k of Object.keys(cube.feature)) {
      if (k.startsWith('dir:')) expect(k.split(','), k).toHaveLength(3);
    }
    const twoD = ['0,-1', '0,1', '-1,0', '1,0'].map((d) => flat.feature[`dir:${d}`] ?? 0);
    const mean = twoD.reduce((a, b) => a + b, 0) / 4;
    expect(mean).toBeGreaterThan(0);
    expect(cube.feature['dir:0,0,1']).toBeCloseTo(mean);
    expect(cube.feature['dir:0,0,-1']).toBeCloseTo(mean);
  });

  it('leaves the professionShapes alone, and does not alias them', () => {
    // Refitting 20 cards to 27 is `professionShapesFor`'s job at generation
    // time, not this function's.
    expect(cube.professionShapes).toEqual(flat.professionShapes);
    cube.professionShapes[0][0] = 99;
    expect(flat.professionShapes[0][0]).not.toBe(99);
  });

  it('gives a share to every feature a cube can actually produce', () => {
    // `orderPool` zeroes a feature the mix does not mention and never lifts it
    // again, so an unmentioned key bans its whole family of clues rather than
    // merely thinning it. This is the test that would have caught reach going
    // to zero above.
    const board = makeBoard(
      Array.from({ length: 27 }, (_, i) => ['cook', 'cop', 'pilot'][i % 3]),
      Array.from({ length: 27 }, (_, i) => [0, 1, 6, 13, 19, 22, 25].includes(i)),
    );
    const produced = new Set(candidateHints(board).flatMap((h) => hintFeatures(board, h)));
    expect(produced.size).toBeGreaterThan(20);
    for (const key of produced) {
      expect(cube.feature[key], `${key} has no share in the cube mix`).toBeGreaterThan(0);
    }
  }, 60_000);
});
