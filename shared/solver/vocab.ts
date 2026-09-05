/**
 * The cast, the professions and the incidental copy a puzzle is dressed in.
 *
 * Forked from the 2D generator with its size tiers removed. There, `NAMES` and
 * `PROFESSIONS` were base lists and `EXTRA_*` were held back, so that adding a
 * name for a 10x10 board would not re-roll the cast of every 4x5 already
 * generated. This repo has one board size and no archive to keep bit for bit,
 * so the tiers are folded into one list each. `namesFor` and `professionsFor`
 * survive as functions only so ported call sites do not have to change.
 */

export interface VocabPerson {
  name: string;
  gender: 'male' | 'female';
}

export interface VocabProfession {
  key: string;
  male: string;
  female: string;
}

/**
 * Four or five names under each of the 26 initials, listed alphabetically
 * because that is how they are read back: `castOf` shuffles each initial's
 * bucket, deals one name per card and sorts, so a suspect's initial says where
 * they stand - `ada` at A1a through `zola` at C3c. 27 cards against 26 letters
 * means exactly one letter is dealt twice.
 */
export const NAMES: VocabPerson[] = [
  { name: 'Ada', gender: 'female' }, { name: 'Anouk', gender: 'female' }, { name: 'Anton', gender: 'male' }, { name: 'Alma', gender: 'female' }, { name: 'Arno', gender: 'male' },
  { name: 'Bram', gender: 'male' }, { name: 'Boris', gender: 'male' }, { name: 'Bea', gender: 'female' }, { name: 'Balint', gender: 'male' }, { name: 'Britt', gender: 'female' },
  { name: 'Cleo', gender: 'female' }, { name: 'Carys', gender: 'female' }, { name: 'Ciaran', gender: 'male' }, { name: 'Cora', gender: 'female' }, { name: 'Casper', gender: 'male' },
  { name: 'Desmond', gender: 'male' }, { name: 'Dmitri', gender: 'male' }, { name: 'Delia', gender: 'female' }, { name: 'Dario', gender: 'male' },
  { name: 'Elin', gender: 'female' }, { name: 'Esme', gender: 'female' }, { name: 'Emre', gender: 'male' }, { name: 'Edda', gender: 'female' },
  { name: 'Fabio', gender: 'male' }, { name: 'Ferran', gender: 'male' }, { name: 'Fenna', gender: 'female' }, { name: 'Felix', gender: 'male' },
  { name: 'Greta', gender: 'female' }, { name: 'Golda', gender: 'female' }, { name: 'Gustav', gender: 'male' }, { name: 'Gwen', gender: 'female' },
  { name: 'Hugo', gender: 'male' }, { name: 'Hamish', gender: 'male' }, { name: 'Hilde', gender: 'female' }, { name: 'Henrik', gender: 'male' },
  { name: 'Ines', gender: 'female' }, { name: 'Iris', gender: 'female' }, { name: 'Ivo', gender: 'male' }, { name: 'Ilse', gender: 'female' },
  { name: 'Jonas', gender: 'male' }, { name: 'Janko', gender: 'male' }, { name: 'Juno', gender: 'female' }, { name: 'Jarek', gender: 'male' },
  { name: 'Kira', gender: 'female' }, { name: 'Katia', gender: 'female' }, { name: 'Kai', gender: 'male' }, { name: 'Kaisa', gender: 'female' },
  { name: 'Lorenzo', gender: 'male' }, { name: 'Lucian', gender: 'male' }, { name: 'Lise', gender: 'female' }, { name: 'Lasse', gender: 'male' },
  { name: 'Mira', gender: 'female' }, { name: 'Maud', gender: 'female' }, { name: 'Marek', gender: 'male' }, { name: 'Mette', gender: 'female' },
  { name: 'Nils', gender: 'male' }, { name: 'Novak', gender: 'male' }, { name: 'Nadia', gender: 'female' }, { name: 'Nuno', gender: 'male' },
  { name: 'Odette', gender: 'female' }, { name: 'Orla', gender: 'female' }, { name: 'Oskar', gender: 'male' }, { name: 'Oona', gender: 'female' },
  { name: 'Piet', gender: 'male' }, { name: 'Pavel', gender: 'male' }, { name: 'Petra', gender: 'female' }, { name: 'Prosper', gender: 'male' },
  { name: 'Quinn', gender: 'female' }, { name: 'Quenby', gender: 'female' }, { name: 'Quentin', gender: 'male' }, { name: 'Quirin', gender: 'male' },
  { name: 'Rafael', gender: 'male' }, { name: 'Rosa', gender: 'female' }, { name: 'Radek', gender: 'male' }, { name: 'Renata', gender: 'female' },
  { name: 'Suri', gender: 'female' }, { name: 'Stefan', gender: 'male' }, { name: 'Sanna', gender: 'female' }, { name: 'Sander', gender: 'male' },
  { name: 'Tomas', gender: 'male' }, { name: 'Tessa', gender: 'female' }, { name: 'Tibor', gender: 'male' }, { name: 'Thea', gender: 'female' },
  { name: 'Ulla', gender: 'female' }, { name: 'Ulrich', gender: 'male' }, { name: 'Ursa', gender: 'female' }, { name: 'Umberto', gender: 'male' },
  { name: 'Viktor', gender: 'male' }, { name: 'Vera', gender: 'female' }, { name: 'Vasco', gender: 'male' }, { name: 'Vanja', gender: 'female' },
  { name: 'Wren', gender: 'female' }, { name: 'Wim', gender: 'male' }, { name: 'Willa', gender: 'female' }, { name: 'Wolfe', gender: 'male' },
  { name: 'Xavi', gender: 'male' }, { name: 'Xenia', gender: 'female' }, { name: 'Xander', gender: 'male' }, { name: 'Ximena', gender: 'female' },
  { name: 'Yara', gender: 'female' }, { name: 'Yusuf', gender: 'male' }, { name: 'Yelena', gender: 'female' }, { name: 'Yannick', gender: 'male' },
  { name: 'Zeno', gender: 'male' }, { name: 'Zola', gender: 'female' }, { name: 'Zoran', gender: 'male' }, { name: 'Zuza', gender: 'female' },
];

/** The whole list, whatever the size. See the note at the top of the file. */
export function namesFor(_size: number): VocabPerson[] {
  return NAMES;
}

/**
 * Keys and emoji from the profession face map (`site/src/faces.ts`). Each key
 * pluralises with a plain -s, which is the only thing `render.ts` assumes about
 * them.
 *
 * 21 professions against 27 cards is deliberately more than one cube needs.
 * `professionShapesFor` decides how many groups a cube gets and how big they
 * are; this list only decides how much variety it has to draw them from.
 */
export const PROFESSIONS: VocabProfession[] = [
  { key: 'cop', male: '👮‍♂️', female: '👮‍♀️' },
  { key: 'sleuth', male: '🕵️‍♂️', female: '🕵️‍♀️' },
  { key: 'guard', male: '💂‍♂️', female: '💂‍♀️' },
  { key: 'builder', male: '👷‍♂️', female: '👷‍♀️' },
  { key: 'farmer', male: '👨‍🌾', female: '👩‍🌾' },
  { key: 'cook', male: '👨‍🍳', female: '👩‍🍳' },
  { key: 'doctor', male: '👨‍⚕️', female: '👩‍⚕️' },
  { key: 'clerk', male: '👨‍💼', female: '👩‍💼' },
  { key: 'coder', male: '👨‍💻', female: '👩‍💻' },
  { key: 'singer', male: '👨‍🎤', female: '👩‍🎤' },
  { key: 'teacher', male: '👨‍🏫', female: '👩‍🏫' },
  { key: 'painter', male: '👨‍🎨', female: '👩‍🎨' },
  { key: 'pilot', male: '👨‍✈️', female: '👩‍✈️' },
  { key: 'judge', male: '👨‍⚖️', female: '👩‍⚖️' },
  { key: 'mechanic', male: '👨‍🔧', female: '👩‍🔧' },
  { key: 'student', male: '👨‍🎓', female: '👩‍🎓' },
  { key: 'scientist', male: '👨‍🔬', female: '👩‍🔬' },
  { key: 'firefighter', male: '👨‍🚒', female: '👩‍🚒' },
  { key: 'astronaut', male: '👨‍🚀', female: '👩‍🚀' },
  { key: 'ninja', male: '🥷', female: '🥷' },
  { key: 'superhero', male: '🦸‍♂️', female: '🦸' },
];

/** The whole list, whatever the size. See the note at the top of the file. */
export function professionsFor(_size: number): VocabProfession[] {
  return PROFESSIONS;
}

export function faceOf(profession: string, gender: 'male' | 'female'): string {
  const entry = PROFESSIONS.find((p) => p.key === profession);
  if (!entry) return '😬';
  return gender === 'female' ? entry.female : entry.male;
}

/**
 * The 2D titles counted their board out loud - "Twenty Faces, Five Lies",
 * "Four Rows, One Confession" - and those numbers are wrong on a cube, so the
 * ones that leaned on the grid were rewritten rather than ported.
 */
export const TITLES: string[] = [
  'The Glass Cube at Lantern Street',
  'Twenty-Seven Faces, Some Lies',
  'A Quiet Morning at the Depot',
  'Nobody Left the Courtyard',
  'The Ferry Was Late',
  'Someone Signed the Ledger Twice',
  'Three Slices, One Confession',
  'The Greenhouse Roster',
  'Names Called at Dawn',
  'The Second Shift',
  'Everyone Says They Were Reading',
  'A Draft in the Archive Room',
  'The Bell Rang Anyway',
  'Chalk Marks on the Platform',
  'Whose Coat Is on the Hook',
  'Nobody in the Middle Will Say',
  'Nine Alibis and a Gap',
  'Sunday Inventory',
  'The Stairwell Census',
  'One Story Does Not Fit',
  'The Kettle Was Still Warm',
  'Line Up by the Fence',
  'Front Row, Back Row, Neither',
  'The Corner Table Knows',
  'Eight Corners and a Core',
  'Someone Moved a Slice',
];

export const FLAVOUR: string[] = [
  'I was tying my shoelace the whole time.',
  'I only work weekends, so ask someone on shift.',
  'I have nothing useful to add, sorry.',
  'Ask someone with a better view.',
  'I was facing the other way.',
  'My glasses were in my pocket.',
  'I heard something, but that is all.',
  'I keep out of other people’s business.',
  'You will have to ask the others.',
  'I lost track of everyone after lunch.',
  'It was too loud to notice anything.',
  'I had my hands full at the time.',
  'I only just got here myself.',
  'I never remember faces.',
  'I was counting crates, not people.',
  'Somebody moved my chair, that is all I know.',
  'I would rather not guess.',
  'Nothing to report from where I stood.',
  'I was halfway out the door.',
  'My shift had already ended.',
  'I was looking for my keys.',
  'The window was fogged over.',
  'I stepped outside for some air.',
  'I was on the phone with my sister.',
  'Everyone looks the same in that light.',
  'I did not check the clock once.',
  'I stayed where I was told to stay.',
  'I was reading the noticeboard.',
  'I had a headache and closed my eyes.',
  'The kettle needed watching.',
  'I was sorting the post.',
  'I could not hear a thing over the fan.',
];
