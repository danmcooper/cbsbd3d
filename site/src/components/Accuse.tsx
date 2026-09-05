import type { Person } from '../../../shared/puzzle';

/**
 * The verdict prompt. It sits over the frame rather than in the scene, so it
 * stays the same size however the cube is turned or zoomed.
 */
export default function Accuse({
  person,
  onChoose,
  onCancel,
}: {
  person: Person;
  onChoose: (guess: 'criminal' | 'innocent') => void;
  onCancel: () => void;
}) {
  return (
    <div className="accuse" role="dialog" aria-label="Accuse a suspect">
      <span>
        {person.name.toLowerCase()} the {person.profession} is…
      </span>
      <button type="button" className="accuse-criminal" onClick={() => onChoose('criminal')}>
        Criminal
      </button>
      <button type="button" className="accuse-innocent" onClick={() => onChoose('innocent')}>
        Innocent
      </button>
      <button type="button" className="accuse-cancel" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
