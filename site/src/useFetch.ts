import { useCallback, useEffect, useState } from 'react';

/**
 * Fetches JSON from a path relative to the site's base and hands it to `parse`.
 *
 * `parse` is where `validatePuzzle` goes. It throws on a file this build cannot
 * read, and a throw inside an effect would take the whole tree down, so it is
 * caught here and reported as an error the screen can render.
 */
export function useFetch<T>(
  relPath: string,
  parse: (raw: unknown) => T,
): { data: T | null; error: string | null; loading: boolean; retry: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setError(null);
    setData(null);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(import.meta.env.BASE_URL + relPath);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const parsed = parse(await res.json());
        if (!cancelled) setData(parsed);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
    // `parse` is a fresh closure on every render, so depending on it would
    // refetch forever. The path is what identifies the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relPath, attempt]);

  return { data, error, loading: data === null && error === null, retry };
}
