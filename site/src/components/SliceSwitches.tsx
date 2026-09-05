import { LAYER_FILL } from '../scene/constants';

const SIZES = [32, 23, 16]; // near to far, left to right: the near slice is closest
const LABELS = ['front slice', 'middle slice', 'back slice'];
const css = (colour: number) => `#${colour.toString(16).padStart(6, '0')}`;

/**
 * Three independent switches. They are DOM, not scene objects, so they stay the
 * same size however the cube is turned or zoomed and stay within thumb reach at
 * the bottom of the frame.
 */
export default function SliceSwitches({
  value,
  onChange,
}: {
  value: boolean[];
  onChange: (next: boolean[]) => void;
}) {
  const shown = value.map((on, k) => (on ? k + 1 : 0)).filter(Boolean);
  return (
    <div className="slices">
      <p role="status" className="slices-readout">
        {shown.length ? `layers ${shown.join(' ')}` : 'no layers'}
      </p>
      <div className="slices-row">
        {value.map((on, k) => (
          <button
            key={k}
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={LABELS[k]}
            title={LABELS[k]}
            data-on={on ? '1' : '0'}
            style={{
              width: SIZES[k],
              height: SIZES[k],
              background: on ? css(LAYER_FILL[k]) : '#2a3242',
            }}
            onClick={() => onChange(value.map((v, j) => (j === k ? !v : v)))}
          />
        ))}
      </div>
    </div>
  );
}
