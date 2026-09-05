import { expect, it } from 'vitest';
import type { Person } from '../../../shared/puzzle';
import { cellLayout } from './cell';
import { BIG_NAME, GAP, TOP_PROF_Y } from './constants';

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

it('drops the head and lifts the name when solved', () => {
  const solved = cellLayout(person, true, 0);
  expect(solved.head).toBeNull();
  expect(solved.name.y).toBeCloseTo(0.78);
  expect(solved.clue).not.toBeNull();
});

it('keeps the head small above a large name when unsolved', () => {
  const open = cellLayout(person, false, 0);
  expect(open.head?.scale).toBeCloseTo(0.42);
  expect(open.name.y).toBeCloseTo(0.14);
  expect(open.clue).toBeNull();
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
