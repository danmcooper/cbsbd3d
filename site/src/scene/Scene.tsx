import { useEffect, useRef } from 'react';
import type { Puzzle } from '../../../shared/puzzle';
import { applyDrag, applyWheel, applyZoom, INITIAL_VIEW, type View } from './controls';
import { CubeWorld } from './world';

/** WebGL is required; without it the app says so rather than degrading. */
export const hasWebGL = (): boolean => {
  if (typeof WebGLRenderingContext === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
};

/** A drag this short is a tap: fingers move a little even when standing still. */
const TAP_SLOP = 6;

export default function Scene({
  puzzle,
  slices,
  onPick,
}: {
  puzzle: Puzzle;
  slices: boolean[];
  onPick?: (i: number | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<CubeWorld | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const supported = useRef(hasWebGL()).current;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!supported || !canvas) return;
    const world = new CubeWorld(canvas);
    worldRef.current = world;

    const size = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      world.resize(parent.clientWidth, Math.max(380, Math.round(window.innerHeight * 0.8)));
    };
    size();
    window.addEventListener('resize', size);

    let view: View = { ...INITIAL_VIEW };
    const set = (next: View) => {
      view = next;
      world.view = next;
    };
    // Pointers are tracked by id so a second finger becomes a pinch rather than
    // a second drag fighting the first.
    const active = new Map<number, { x: number; y: number }>();
    let down = false;
    let moved = 0;
    let px = 0;
    let py = 0;
    let pinchD: number | null = null;
    let pinchY: number | null = null;
    const spread = () => {
      const [a, b] = [...active.values()];
      return { d: Math.hypot(a.x - b.x, a.y - b.y), my: (a.y + b.y) / 2 };
    };

    const onDown = (e: PointerEvent) => {
      active.set(e.pointerId, { x: e.clientX, y: e.clientY });
      canvas.setPointerCapture(e.pointerId);
      if (active.size === 2) {
        const s = spread();
        pinchD = s.d;
        pinchY = s.my;
        down = false;
        return;
      }
      down = true;
      moved = 0;
      px = e.clientX;
      py = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (active.has(e.pointerId)) active.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (active.size === 2) {
        const s = spread();
        if (pinchD !== null && pinchY !== null) {
          // A two-finger slide zooms as well as a pinch does, because on a
          // phone the fingers rarely change separation cleanly.
          set(applyZoom(applyWheel(view, -(s.my - pinchY) * 1.7), pinchD / Math.max(s.d, 1)));
        }
        pinchD = s.d;
        pinchY = s.my;
        moved = 999;
        return;
      }
      if (!down) return;
      const dx = e.clientX - px;
      const dy = e.clientY - py;
      moved += Math.abs(dx) + Math.abs(dy);
      set(applyDrag(view, dx, dy));
      px = e.clientX;
      py = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      const wasPinch = active.size === 2;
      active.delete(e.pointerId);
      if (active.size < 2) pinchD = pinchY = null;
      down = false;
      if (wasPinch || moved > TAP_SLOP) return;
      const r = canvas.getBoundingClientRect();
      pickRef.current?.(
        world.pick(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1),
      );
    };
    const onCancel = (e: PointerEvent) => {
      active.delete(e.pointerId);
      down = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      set(applyWheel(view, e.deltaY));
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      window.removeEventListener('resize', size);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('wheel', onWheel);
      world.dispose();
      worldRef.current = null;
    };
  }, [supported]);

  useEffect(() => {
    void worldRef.current?.setPuzzle(puzzle);
  }, [puzzle]);

  useEffect(() => {
    worldRef.current?.setSlices(slices);
  }, [slices]);

  if (!supported) {
    return (
      <p role="alert" className="no-webgl">
        This game is a 3D cube and needs WebGL, which this browser is not offering.
      </p>
    );
  }
  return (
    <div className="scene">
      <canvas ref={canvasRef} />
    </div>
  );
}
