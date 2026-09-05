import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { validatePuzzle, type Puzzle } from '../../../shared/puzzle';
import Accuse from '../components/Accuse';
import SliceSwitches from '../components/SliceSwitches';
import Start from '../components/Start';
import {
  initialState,
  isWon,
  openingSlices,
  reduce,
  type Action,
  type GameState,
} from '../game/state';
import { load, save } from '../game/storage';
import Scene from '../scene/Scene';
import { useFetch } from '../useFetch';

export function Board({ puzzle }: { puzzle: Puzzle }) {
  // A game in progress is restored before the first render, so a reload never
  // shows an empty board that then jumps.
  const [state, dispatch] = useReducer(
    (s: GameState, a: Action) => reduce(puzzle, s, a),
    puzzle,
    (p) => load(p.id) ?? initialState(p),
  );
  const [slices, setSlices] = useState(() => openingSlices(puzzle));
  const [selected, setSelected] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  // A game with nothing on it yet is a game not begun, so it opens on its card.
  // A game restored mid-solve goes straight back to the cube.
  const [starting, setStarting] = useState(
    () => state.flipped.length === puzzle.initialReveals.length && state.mistakes.length === 0,
  );

  useEffect(() => save(puzzle.id, state), [puzzle.id, state]);

  const flipped = useMemo(() => state.flipped, [state.flipped]);
  const onPick = useCallback(
    (i: number | null) => {
      // A card already face up has nothing left to accuse it of, so a tap on
      // one strikes its clue off instead — and a second tap puts it back.
      if (i !== null && state.flipped.includes(i)) {
        dispatch({ kind: 'mute', i });
        setSelected(null);
        return;
      }
      setSelected(i);
    },
    [state.flipped],
  );

  const won = isWon(puzzle, state);
  return (
    <>
      <header className="play-head">
        <a href="#/">← archive</a>
        <span>
          {puzzle.date} · {puzzle.difficulty}
        </span>
        <span>
          {state.flipped.length}/27 · {state.mistakes.length} wrong
        </span>
        {/* Reset throws a game away, and the header is easy to hit by
            accident on a phone, so it asks once. */}
        {confirming ? (
          <span className="reset-confirm">
            <button
              onClick={() => {
                dispatch({ kind: 'reset' });
                setSelected(null);
                setConfirming(false);
                setSlices(openingSlices(puzzle));
              }}
            >
              start over?
            </button>
            <button onClick={() => setConfirming(false)}>keep</button>
          </span>
        ) : (
          <button onClick={() => setConfirming(true)}>reset</button>
        )}
      </header>
      <div className="scene-frame">
        <Scene
          puzzle={puzzle}
          flipped={flipped}
          muted={state.muted}
          selected={selected}
          slices={slices}
          onPick={onPick}
        />
        {selected !== null && (
          <Accuse
            person={puzzle.people[selected]}
            onChoose={(guess) => {
              dispatch({ kind: 'accuse', i: selected, guess });
              setSelected(null);
            }}
            onCancel={() => setSelected(null)}
          />
        )}
      </div>
      <SliceSwitches value={slices} onChange={setSlices} />
      {starting && <Start puzzle={puzzle} onStart={() => setStarting(false)} />}
      {won && <p className="won">Solved — every suspect accounted for.</p>}
    </>
  );
}

export default function Play({ date }: { date: string }) {
  const { data: puzzle, error, retry } = useFetch(`puzzles/${date}.json`, validatePuzzle);

  if (error) {
    return (
      <main>
        <p role="alert">This puzzle could not be read: {error}</p>
        <p>
          <button onClick={retry}>Retry</button> <a href="#/">Back to the archive</a>
        </p>
      </main>
    );
  }
  if (!puzzle) return <p>Loading…</p>;
  return (
    <main className="play">
      <Board puzzle={puzzle} />
    </main>
  );
}
