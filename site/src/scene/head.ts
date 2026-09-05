import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';

/**
 * Twemoji's own filename rule: keep FE0F when the sequence contains a ZWJ,
 * strip it otherwise. `🕵️‍♀️` keeps both of its variation selectors and `☺️`
 * loses its only one, which is why this cannot just be "strip FE0F".
 */
export function twemojiFile(emoji: string): string {
  const cps = [...emoji].map((c) => c.codePointAt(0)!.toString(16));
  const zwj = cps.includes('200d');
  return `${(zwj ? cps : cps.filter((c) => c !== 'fe0f')).join('-')}.svg`;
}

const paths = new Map<string, THREE.ShapePath[]>();
const loader = new SVGLoader();

/**
 * An extruded Twemoji, normalised so its longer side is one unit and its
 * centre is the group's origin. The caller scales and positions it; everything
 * here is about turning flat SVG paths into something with a lit edge.
 */
export async function loadHead(emoji: string, depth = 12): Promise<THREE.Group> {
  const file = twemojiFile(emoji);
  if (!paths.has(file)) {
    const res = await fetch(`${import.meta.env.BASE_URL}twemoji/${file}`);
    if (!res.ok) throw new Error(`missing head ${file}`);
    paths.set(file, loader.parse(await res.text()).paths);
  }
  const inner = new THREE.Group();
  paths.get(file)!.forEach((p, pi) => {
    const material = new THREE.MeshPhongMaterial({
      color: p.color,
      shininess: 42,
      specular: 0x222222,
      side: THREE.DoubleSide,
    });
    for (const shape of SVGLoader.createShapes(p)) {
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelThickness: depth * 0.28,
        bevelSize: 0.55,
        bevelSegments: 2,
        curveSegments: 5,
      });
      const mesh = new THREE.Mesh(geometry, material);
      // Twemoji stacks its paths back to front; separating them in depth keeps
      // that order instead of leaving coplanar faces to fight.
      mesh.position.z = pi * (depth * 0.02);
      inner.add(mesh);
    }
  });

  // Twemoji is a 36x36 viewBox with Y pointing down; normalise to a unit head.
  inner.scale.set(1, -1, 1);
  const box = new THREE.Box3().setFromObject(inner);
  inner.position.sub(box.getCenter(new THREE.Vector3()));
  const outer = new THREE.Group();
  outer.add(inner);
  outer.userData.norm = 1 / Math.max(box.max.x - box.min.x, box.max.y - box.min.y);
  return outer;
}
