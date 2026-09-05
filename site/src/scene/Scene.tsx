import { useEffect, useRef } from 'react';
import type { Puzzle } from '../../../shared/puzzle';
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

export default function Scene({ puzzle }: { puzzle: Puzzle }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<CubeWorld | null>(null);
  const supported = useRef(hasWebGL()).current;

  useEffect(() => {
    if (!supported || !canvasRef.current) return;
    const world = new CubeWorld(canvasRef.current);
    worldRef.current = world;
    const size = () => {
      const el = canvasRef.current;
      if (!el?.parentElement) return;
      world.resize(el.parentElement.clientWidth, Math.max(380, Math.round(window.innerHeight * 0.8)));
    };
    size();
    window.addEventListener('resize', size);
    return () => {
      window.removeEventListener('resize', size);
      world.dispose();
      worldRef.current = null;
    };
  }, [supported]);

  useEffect(() => {
    worldRef.current?.setPuzzle(puzzle);
  }, [puzzle]);

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
