import { CAM_Y_MAX, ZOOM_MAX, ZOOM_MIN } from './constants';

/**
 * Where the viewer is. There is deliberately no `rx`: nothing tilts. A sideways
 * drag turns the cube, an up-and-down drag rides the viewer up or down like a
 * lift, still facing straight ahead at the same distance. Tilting a cube of
 * text turns every label into a parallelogram and makes the addresses unreadable.
 */
export interface View {
  ry: number;
  camY: number;
  zoom: number;
}

/** Square on to the front slice, at the framing distance. */
export const INITIAL_VIEW: View = { ry: 0, camY: 0, zoom: 1 };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const applyDrag = (v: View, dx: number, dy: number): View => ({
  ...v,
  ry: v.ry + dx * 0.006,
  camY: clamp(v.camY + dy * 0.02, -CAM_Y_MAX, CAM_Y_MAX),
});

export const applyZoom = (v: View, factor: number): View => ({
  ...v,
  zoom: clamp(v.zoom * factor, ZOOM_MIN, ZOOM_MAX),
});

/** The wheel moves distance directly rather than by a ratio. */
export const applyWheel = (v: View, deltaY: number): View => ({
  ...v,
  zoom: clamp(v.zoom + deltaY * 0.0012, ZOOM_MIN, ZOOM_MAX),
});
