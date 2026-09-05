import { expect, it } from 'vitest';
import type { Person } from '../../../shared/puzzle';
import { cellLayout, spentColour } from './cell';
import { BIG_NAME, GAP, GREEN, HEAD_SMALL, RED, SPENT, TOP_NAME_Y, TOP_PROF_Y } from './constants';

const person: Person = {
  name: 'ada',
  profession: 'cook',
  gender: 'female',
  criminal: false,
  clue: '#NAME:1 is a criminal',
  origHint: null,
  paths: null,
};

it('gives a criminal and an innocent identical geometry, differing only in colour', () => {
  const bad = cellLayout({ ...person, criminal: true }, true, 0);
  const good = cellLayout({ ...person, criminal: false }, true, 0);
  expect({ ...bad, colour: null }).toEqual({ ...good, colour: null });
  expect(bad.colour).toBe(0xff5a4f);
  expect(good.colour).toBe(0x5ad46a);
});

it('steps the head back above the name when solved, and shows the clue', () => {
  const solved = cellLayout(person, true, 0);
  const open = cellLayout(person, false, 0);
  expect(solved.head.scale).toBeLessThan(open.head.scale);
  expect(solved.head.y).toBeGreaterThan(solved.name.y);
  expect(solved.name.y).toBeCloseTo(TOP_NAME_Y);
  expect(solved.clue).not.toBeNull();
});

it('carries a big head over a big name when unsolved', () => {
  const open = cellLayout(person, false, 0);
  expect(open.head.scale).toBeCloseTo(HEAD_SMALL);
  expect(open.name.y).toBeCloseTo(0.14);
  expect(open.clue).toBeNull();
});

it('leaves room for the head above the name in both states', () => {
  // Text is centred and helvetiker's cap height is about 0.7 of its size, with
  // the shell dilating each glyph by a further 0.12. A head that overlaps the
  // name is the failure this catches.
  const halfText = (size: number) => (0.7 * size) / 2 + 0.12 * size;
  for (const flipped of [true, false]) {
    const { head, name } = cellLayout(person, flipped, 0);
    const nameTop = flipped ? name.y + halfText(name.size) : name.y + BIG_NAME[1] / 2;
    expect(head.y - head.scale / 2).toBeGreaterThan(nameTop);
  }
});

it('shades the label by slice, lightest at the front', () => {
  expect([0, 1, 2].map((z) => cellLayout(person, false, z).fill)).toEqual([
    0xd6fce9, 0xb8f7d9, 0x9ef2c9,
  ]);
});

it('shows the address on every cell, solved or not', () => {
  expect(cellLayout(person, true, 0).address).toEqual(cellLayout(person, false, 0).address);
});

it('leaves a suspect with nothing to say without a clue box', () => {
  // Flavour-line cards carry no clue at all; solving one must not open an
  // empty black bar where a clue would have been.
  expect(cellLayout({ ...person, clue: null }, true, 0).clue).toBeNull();
});

it('keeps the clue inside the card, clear of the profession above it', () => {
  const { clue, profession } = cellLayout(person, true, 0);
  // A clue fills whatever box it is given: the board-wide scale grows the
  // wordiest clue until it just fits, and every other clue rides that scale.
  // So the box is the card, and getting it wrong is not visible until a
  // seven-line clue turns up. The mockup's 2.95 was wider than the distance
  // between two cells, and its box reached up through the profession.
  expect(clue?.maxW).toBeLessThanOrEqual(BIG_NAME[0]);
  expect(clue?.maxW).toBeLessThan(GAP);
  expect(clue!.y + clue!.maxH / 2).toBeLessThan(TOP_PROF_Y - profession.size / 2);
});

it('darkens a struck-off clue by one factor, whichever verdict it carries', () => {
  const channel = (colour: number, shift: number) => (colour >> shift) & 0xff;
  for (const verdict of [RED, GREEN]) {
    for (const shift of [16, 8, 0]) {
      expect(channel(spentColour(verdict), shift)).toBe(
        Math.round(channel(verdict, shift) * SPENT),
      );
    }
  }
  // Still legible, still the verdict: a clue struck off by mistake has to be
  // readable again, and still has to say which way it went.
  expect(spentColour(RED)).not.toBe(spentColour(GREEN));
  expect(spentColour(RED)).toBeLessThan(RED);
});
