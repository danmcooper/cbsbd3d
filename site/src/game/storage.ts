import type { GameState } from './state';

const keyOf = (id: string) => `cbsbd3d:game:${id}`;

const isGame = (v: unknown): v is GameState => {
  const g = v as GameState | null;
  return (
    typeof g === 'object' &&
    g !== null &&
    Array.isArray(g.flipped) &&
    Array.isArray(g.mistakes) &&
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
    return isGame(parsed) ? parsed : null;
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
