import { useEffect, useState } from 'react';

export type Route = { kind: 'archive' } | { kind: 'play'; date: string };

const PLAY = /^#\/play\/(\d{4}-\d{2}-\d{2})$/;

/** True only for a date that exists: `2026-02-30` is shaped like one and is not. */
function isRealDate(date: string): boolean {
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

export function parseRoute(hash: string): Route {
  const m = hash.match(PLAY);
  return m && isRealDate(m[1]) ? { kind: 'play', date: m[1] } : { kind: 'archive' };
}

/** Identifies a route, so a re-read that found no change can keep the old one. */
const keyOf = (route: Route) => (route.kind === 'play' ? `play/${route.date}` : route.kind);

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  useEffect(() => {
    const sync = () =>
      setRoute((prev) => {
        const next = parseRoute(window.location.hash);
        return keyOf(prev) === keyOf(next) ? prev : next;
      });
    // `hashchange` is the event for a hash that changes while the page is
    // watching. A tab on a phone is often not watching: it comes back from the
    // back/forward cache, or the browser hands an incoming link to a tab it had
    // frozen, and the page can find itself showing one route at an address that
    // says another. Neither fires `hashchange`; `pageshow` covers the first and
    // `visibilitychange` the second, so re-read on all three.
    //
    // Re-reading is only safe because it is cheap and idempotent: a parse and,
    // when the route has not moved, the same object back, so a tab merely being
    // switched to does not re-render and lose its game in progress.
    window.addEventListener('hashchange', sync);
    window.addEventListener('pageshow', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('pageshow', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);
  return route;
}
