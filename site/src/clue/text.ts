import type { Person } from '../../../shared/puzzle';
import { addressOf } from '../../../shared/solver/lattice';
import { tokenizeClue, type ClueSegment } from './tokenize';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * String-level rewrites the source game applies before token expansion: a card
 * talks about itself in the first person, and "exactly 0" reads as "no".
 *
 * The clue is read on the face of the card carrying it, so the card naming
 * itself in the third person reads as a sentence about somebody else.
 */
function prepass(clue: string, self: number): string {
  let s = clue.replace(' exactly 0 ', ' no ');
  s = s.replace(new RegExp(`^#NAMES:${self}\\b`), 'My');
  s = s.replace(new RegExp(`#NAMES:${self}\\b`, 'g'), 'my');
  s = s.replace(/#NAME:(\d+) and #NAME:(\d+)\b/g, (m, x: string, y: string) => {
    if (Number(x) === self) return `#NAME:${y} and I`;
    if (Number(y) === self) return `#NAME:${x} and I`;
    return m;
  });
  s = s.replace(new RegExp(`^#NAME:${self} (is|has)\\b`), (_m, verb: string) =>
    verb === 'is' ? 'I am' : 'I have',
  );
  s = s.replace(new RegExp(`^#NAME:${self}\\b`), 'I');
  s = s.replace(new RegExp(`#NAME:${self}\\b`, 'g'), 'me');
  return s;
}

function segmentText(seg: ClueSegment, people: Person[]): string {
  switch (seg.kind) {
    case 'name': {
      const p = people[seg.index];
      if (!p) return `#${seg.possessive ? 'NAMES' : 'NAME'}:${seg.index}`;
      const name = capitalize(p.name);
      return seg.possessive ? (name.endsWith('s') ? `${name}'` : `${name}'s`) : name;
    }
    case 'prof': {
      // A counted profession takes its number from the board, and its plural
      // from that number rather than from the token — a cast of one reads
      // "1 cook". Twenty-seven suspects is more than you can count at a glance.
      const n = seg.counted ? people.filter((p) => p.profession === seg.word).length : null;
      const plural = n === null ? seg.plural : n !== 1;
      const word = plural ? (seg.word === 'witch' ? 'witches' : `${seg.word}s`) : seg.word;
      return n === null ? word : `${n} ${word}`;
    }
    case 'between':
      // Every cell wears its address, so a range names its own ends rather
      // than describing a route to them the way the flat game had to.
      return `from ${addressOf(seg.a)} to ${addressOf(seg.b)}`;
    case 'text':
      return seg.text;
  }
}

/** A clue as it is read on the face of card `self`. */
export function clueText(clue: string, people: Person[], self: number): string {
  const segments = tokenizeClue(prepass(clue, self));
  return capitalize(segments.map((seg) => segmentText(seg, people)).join(''));
}

/**
 * Breaks a clue into short lines. The clue is drawn as 3D text on a cell face,
 * so it is laid out here rather than by anything that knows about wrapping:
 * geometry has no line box.
 */
export function wrapClue(text: string, maxChars = 16): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (!line) line = word;
    else if (line.length + 1 + word.length <= maxChars) line += ` ${word}`;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}
