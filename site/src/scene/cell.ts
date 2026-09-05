import type { Person } from '../../../shared/puzzle';
import {
  ADDR_COL,
  ADDR_SIZE,
  ADDR_X,
  ADDR_Y,
  BIG_NAME,
  BIG_NAME_Y,
  BIG_PROF,
  BIG_PROF_Y,
  CLUE_H,
  CLUE_W,
  CLUE_Y,
  GREEN,
  HEAD_SMALL,
  HEAD_Y,
  LAYER_FILL,
  RED,
  TOP_NAME_Y,
  TOP_PROF_Y,
} from './constants';

export interface HeadLayout {
  scale: number;
  y: number;
}

export interface TextLayout {
  text: string;
  size: number;
  y: number;
  /** The box the text grows to fill, or null to draw it at `size`. */
  fit: [number, number] | null;
}

export interface ClueLayout {
  y: number;
  size: number;
  /** Line spacing, and the padding of the black bar around the block. */
  leading: number;
  pad: number;
  maxW: number;
  maxH: number;
}

export interface AddressLayout {
  x: number;
  y: number;
  size: number;
  colour: number;
}

export interface CellLayout {
  head: HeadLayout | null;
  name: TextLayout;
  profession: TextLayout;
  clue: ClueLayout | null;
  address: AddressLayout;
  /** The colour of the name and profession: the verdict, or the slice fill. */
  colour: number;
  /** The slice's own shade, which an unsolved cell wears. */
  fill: number;
}

/**
 * Where everything on one cell face goes, as plain data.
 *
 * The two states are quite different faces — unsolved, the type carries the
 * cell under a small head; solved, the head goes and the clue takes the space
 * it left — and both are here so the rules can be read, and tested, without a
 * canvas. The clue's *words* are not: expanding the markup needs the whole
 * cast, which a single cell does not have.
 */
export function cellLayout(person: Person, flipped: boolean, z: number): CellLayout {
  const fill = LAYER_FILL[z];
  return {
    head: flipped ? null : { scale: HEAD_SMALL, y: HEAD_Y },
    name: {
      text: person.name.toLowerCase(),
      size: flipped ? 0.3 : 0.27,
      y: flipped ? TOP_NAME_Y : BIG_NAME_Y,
      // Solved, the name is one of three things sharing the face and holds a
      // fixed size; unsolved it is the face, and grows to fill it.
      fit: flipped ? null : BIG_NAME,
    },
    profession: {
      text: person.profession,
      size: flipped ? 0.21 : 0.2,
      y: flipped ? TOP_PROF_Y : BIG_PROF_Y,
      fit: flipped ? null : BIG_PROF,
    },
    clue:
      flipped && person.clue
        ? { y: CLUE_Y, size: 0.2, leading: 0.28, pad: 0.12, maxW: CLUE_W, maxH: CLUE_H }
        : null,
    address: { x: ADDR_X, y: ADDR_Y, size: ADDR_SIZE, colour: ADDR_COL },
    colour: flipped ? (person.criminal ? RED : GREEN) : fill,
    fill,
  };
}
