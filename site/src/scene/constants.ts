/**
 * Layout constants, lifted verbatim from `docs/mockup-v34.html`.
 *
 * These are the settled output of thirty-four iterations of looking at the
 * thing, not values to re-derive: a name that fits `BIG_NAME` is a name that
 * was checked against every other cell at that size. Change one and check the
 * mockup, not the code.
 */

/** Distance between neighbouring cell centres. */
export const GAP = 3.0;

/** A small head is a portrait, not the whole cell. */
export const HEAD_SMALL = 0.42;
export const HEAD_Y = 0.74;

/** All text shares the plane the faces sit on. */
export const FACE_Z = 0.04;

/** Unsolved, the type carries the cell: name and profession grow to fill it. */
export const BIG_NAME: [number, number] = [2.1, 0.72];
export const BIG_PROF: [number, number] = [2.0, 0.5];
export const BIG_NAME_Y = 0.14;
export const BIG_PROF_Y = -0.52;

/** Solved, the head goes and both move to the top. */
export const TOP_NAME_Y = 0.78;
export const TOP_PROF_Y = 0.5;

/**
 * The clue grows to fill the space the face left behind: the width of the name
 * box, and the gap between the solved profession and the bottom of the face.
 *
 * These three are the one place the mockup's numbers did not survive contact
 * with generated clues. It carried 2.95 x 1.88 at y -0.28, sized against
 * hand-written two-liners that never came near the box; a real clue runs to
 * seven wrapped lines, fills whatever box it is given, and at 2.95 that put it
 * through the cards on either side — the cells are only GAP apart — and up
 * through the profession.
 */
export const CLUE_W = 2.1;
export const CLUE_H = 1.43;
export const CLUE_Y = -0.34;

/** Every cell wears its address, small, top left. */
export const ADDR_X = -1.16;
export const ADDR_Y = 1.2;
export const ADDR_SIZE = 0.15;
export const ADDR_COL = 0x8ea3bf;

/** Label fill by slice: lightest at the front. */
export const LAYER_FILL = [0xd6fce9, 0xb8f7d9, 0x9ef2c9];

/** The verdict is colour alone: these two differ in nothing else. */
export const RED = 0xff5a4f;
export const GREEN = 0x5ad46a;

/**
 * How far a struck-off clue is darkened. One factor for both verdicts, so a
 * spent red and a spent green stay identical in everything but hue — the same
 * rule the bright pair follow.
 */
export const SPENT = 0.32;

/** Fast, but still a move rather than a cut. */
export const SPEED = 0.45;

export const CAM_Y_MAX = 6;
export const ZOOM_MIN = 0.45;
export const ZOOM_MAX = 1.7;

export const FOV = 45;
export const BACKGROUND = 0x0f1116;
