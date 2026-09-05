import type { GameState } from './state';

const keyOf = (id: string) => `cbsbd3d:game:${id}`;

const isGame = (v: unknown): v is Omit<GameState, 'muted'> & { muted?: number[] } => {
  const g = v as GameState | null;
  return (
    typeof g === 'object' &&
    g !== null &&
    Array.isArray(g.flipped) &&
    Array.isArray(g.mistakes) &&
    (g.muted === undefined || Array.isArray(g.muted)) &&
    typeof g.startedAt === 'number'
  );
};

/**
 * Every read and write is wrapped: Safari in private mode throws on `setItem`
 * rather than returning, and a game that cannot save its progress is still a
 * game. Storage failing must never be what ends someone's puzzle.
 */
export function load(id: string): GameState | null {
  try {
    const raw = localStorage.getItem(keyOf(id));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    // `muted` arrived after the game shipped, so a save from before it exists
    // is still a valid game — it simply has nothing struck off.
    return isGame(parsed) ? { ...parsed, muted: parsed.muted ?? [] } : null;
  } catch {
    return null;
  }
}

export function save(id: string, state: GameState): void {
  try {
    localStorage.setItem(keyOf(id), JSON.stringify(state));
  } catch {
    // Nothing to do and nothing worth saying: the game carries on in memory.
  }
}
