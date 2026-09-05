import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CARD_COUNT, type Puzzle } from '../../../shared/puzzle';
import { BACKGROUND, FOV, GAP, SPEED } from './constants';
import { cellPosition, framingDistance } from './lattice';

export interface Cell {
  i: number;
  z: number;
  group: THREE.Group;
  hit: THREE.Mesh;
}

/**
 * The three.js half of the game, and the only place three.js appears outside
 * `scene/`. It owns the renderer and every object in the scene, and holds no
 * game truth: React tells it what the board looks like, it draws that.
 */
export class CubeWorld {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly cells: Cell[] = [];
  private readonly world = new THREE.Group();
  private readonly pmrem: THREE.PMREMGenerator;
  private frame = 0;
  private disposed = false;

  /** Set by the React side each frame; the loop only reads them. */
  view = { ry: 0, camY: 0, zoom: 1 };

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene.background = new THREE.Color(BACKGROUND);
    this.scene.fog = new THREE.Fog(BACKGROUND, 30, 70);
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);

    this.scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x2a2417, 1.0));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(5, 8, 14);
    const fill = new THREE.DirectionalLight(0x9db9ff, 0.75);
    fill.position.set(-9, -3, -8);
    this.scene.add(key, fill);

    // A small room for the bevelled glyphs to reflect; without it the extruded
    // edges read as flat colour and the type stops looking like an object.
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    this.scene.add(this.world);
    for (let i = 0; i < CARD_COUNT; i++) {
      const group = new THREE.Group();
      const [x, y, z] = cellPosition(i, GAP);
      group.position.set(x, y, z);
      // An invisible box is what the raycaster hits: the head and the type are
      // full of holes, and a tap between two letters is still a tap on a cell.
      const hit = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 2.1, 1.7),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      hit.userData.cell = i;
      group.add(hit);
      this.world.add(group);
      this.cells.push({ i, z: Math.floor(i / 9), group, hit });
    }

    this.frame = requestAnimationFrame(this.tick);
  }

  /** Nothing yet reads the puzzle; heads and text arrive in later tasks. */
  setPuzzle(_puzzle: Puzzle): void {}

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private readonly tick = () => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.tick);
    this.world.rotation.y = this.view.ry;
    // The viewer rides up and down facing straight ahead, rather than orbiting:
    // no tilt, so the cube never reads as a diamond.
    this.camera.position.y = this.view.camY;
    this.camera.position.z = framingDistance(FOV, this.camera.aspect, GAP) * this.view.zoom;
    for (const c of this.cells) {
      const want = c.group.userData.scaleTarget ?? 1;
      c.group.scale.setScalar(c.group.scale.x + (want - c.group.scale.x) * SPEED);
    }
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      for (const m of [mesh.material].flat()) m?.dispose();
    });
    this.pmrem.dispose();
    this.renderer.dispose();
  }
}
