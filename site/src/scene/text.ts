import * as THREE from 'three';
import { FontLoader, type Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

let font: Font | null = null;
let loading: Promise<Font> | null = null;

/** The vendored typeface, loaded once for the life of the page. */
export function loadFont(): Promise<Font> {
  if (font) return Promise.resolve(font);
  loading ??= new Promise<Font>((resolve, reject) => {
    new FontLoader().load(
      `${import.meta.env.BASE_URL}font/helvetiker_bold.typeface.json`,
      (f) => {
        font = f;
        resolve(f);
      },
      undefined,
      reject,
    );
  });
  return loading;
}

/**
 * A line of text, centred on its own origin.
 *
 * `shell` puts a near-black copy behind the glyphs, dilated by a fatter bevel.
 * A flat fill always collides with some emoji underneath it, and the shell is
 * what keeps the label legible over any head.
 */
export function textMesh(str: string, size: number, colour: number, shell: boolean): THREE.Object3D {
  if (!font) throw new Error('loadFont() must resolve before any text is built');
  const options = {
    font,
    size,
    height: size * 0.3,
    curveSegments: 3,
    bevelEnabled: true,
    bevelThickness: size * 0.05,
    bevelSegments: 1,
  };
  const geo = new TextGeometry(str, { ...options, bevelSize: size * 0.035 });
  geo.center();
  const face = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: colour, shininess: 30 }));
  // Only the face carries the colour; the shell behind it is near-black and
  // must stay that way, so a later repaint has to be able to tell them apart.
  face.userData.paintable = true;
  if (!shell) return face;

  // The shell is a second TextGeometry with a fatter bevel, which dilates every
  // glyph evenly. Never make it by scaling a copy of the text: that spreads the
  // outer letters away from the inner ones and the outline stops tracking them.
  const shellGeo = new TextGeometry(str, { ...options, bevelSize: size * 0.12 });
  shellGeo.center();
  const back = new THREE.Mesh(shellGeo, new THREE.MeshBasicMaterial({ color: 0x05070b }));
  back.position.z = -size * 0.05;
  const group = new THREE.Group();
  group.add(back, face);
  return group;
}

/** How much to scale a box so it just fills `maxW` x `maxH`. */
export function fitScale(box: THREE.Box3, maxW: number, maxH: number): number {
  const w = box.max.x - box.min.x;
  const h = box.max.y - box.min.y;
  // An empty string measures zero; scaling it by infinity would take the whole
  // frame, so a box with no size gets no scaling at all.
  if (w <= 0 || h <= 0) return 1;
  return Math.min(maxW / w, maxH / h);
}

/** The tightest fit on the board, so a wordy clue never reads as a smaller one. */
export const uniformClueScale = (fits: number[]): number => (fits.length ? Math.min(...fits) : 1);

/** Scales `object` in place to fit a box, measuring it as it currently stands. */
export function fitObject(object: THREE.Object3D, maxW: number, maxH: number): number {
  const scale = fitScale(new THREE.Box3().setFromObject(object), maxW, maxH);
  object.scale.setScalar(scale);
  return scale;
}
