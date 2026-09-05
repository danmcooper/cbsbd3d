import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CARD_COUNT, type Puzzle } from '../../../shared/puzzle';
import { addressOf } from '../../../shared/solver/lattice';
import { faceOf } from '../../../shared/solver/vocab';
import {
  ADDR_COL,
  ADDR_SIZE,
  ADDR_X,
  ADDR_Y,
  BACKGROUND,
  BIG_NAME,
  BIG_NAME_Y,
  BIG_PROF,
  BIG_PROF_Y,
  FACE_Z,
  FOV,
  GAP,
  HEAD_SMALL,
  HEAD_Y,
  LAYER_FILL,
  SPEED,
} from './constants';
import { loadHead } from './head';
import { pickCell } from './pick';
import { fitObject, loadFont, textMesh } from './text';
import { cellPosition, framingDistance } from './lattice';

export interface Cell {
  i: number;
  z: number;
  group: THREE.Group;
  hit: THREE.Mesh;
  head: THREE.Group | null;
  /** What the head is lerping towards: `HEAD_SMALL` open, 0 once solved. */
  headTarget: number;
  labels: THREE.Object3D[];
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
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
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
      this.cells.push({ i, z: Math.floor(i / 9), group, hit, head: null, headTarget: HEAD_SMALL, labels: [] });
    }

    this.frame = requestAnimationFrame(this.tick);
  }

  /**
   * Builds one extruded head per suspect. Heads are the slowest thing in the
   * scene to build, so they are built once per puzzle and never rebuilt; the
   * solve animation scales them away rather than removing them.
   */
  async setPuzzle(puzzle: Puzzle): Promise<void> {
    const font = loadFont().then(() => {
      if (!this.disposed) this.buildLabels(puzzle);
    });
    await Promise.all([font, this.buildHeads(puzzle)]);
  }

  private async buildHeads(puzzle: Puzzle): Promise<void> {
    await Promise.all(
      puzzle.people.map(async (person, i) => {
        const cell = this.cells[i];
        const emoji = person.face ?? faceOf(person.profession, person.gender === 'female' ? 'female' : 'male');
        const head = await loadHead(emoji);
        // A puzzle can change, or the component unmount, while 27 fetches are
        // in flight; a head that arrives late must not join a dead scene.
        if (this.disposed) return;
        if (cell.head) cell.group.remove(cell.head);
        head.scale.setScalar(head.userData.norm * cell.headTarget);
        head.position.y = HEAD_Y;
        cell.group.add(head);
        cell.head = head;
      }),
    );
  }

  /**
   * Name, profession and address on every face. Unsolved is the only state
   * this draws so far; the solved face arrives with the reveal.
   */
  private buildLabels(puzzle: Puzzle): void {
    for (const cell of this.cells) {
      for (const old of cell.labels) cell.group.remove(old);
      cell.labels = [];
      const person = puzzle.people[cell.i];
      const colour = LAYER_FILL[cell.z];

      const name = textMesh(person.name.toLowerCase(), 0.27, colour, true);
      fitObject(name, ...BIG_NAME);
      name.position.set(0, BIG_NAME_Y, FACE_Z);

      const prof = textMesh(person.profession, 0.2, colour, true);
      fitObject(prof, ...BIG_PROF);
      prof.position.set(0, BIG_PROF_Y, FACE_Z);

      // `textMesh` centres what it builds, so the address is hung off the left
      // edge by half its own width rather than positioned by its centre.
      const address = textMesh(addressOf(cell.i), ADDR_SIZE, ADDR_COL, false);
      const box = new THREE.Box3().setFromObject(address);
      address.position.set(ADDR_X + (box.max.x - box.min.x) / 2, ADDR_Y, FACE_Z);

      cell.labels = [name, prof, address];
      cell.group.add(name, prof, address);
    }
  }

  /**
   * Which slices are on screen. A hidden slice is removed from the scene, not
   * faded: a ghosted cell still reads as a suspect, and half the point of the
   * switches is to be able to say "these nine and no others".
   */
  setSlices(on: boolean[]): void {
    for (const cell of this.cells) cell.group.visible = on[cell.z];
  }

  /**
   * The board as it now stands. Called on every flip, so it does the least it
   * can: heads are already built, and solving retargets them rather than
   * rebuilding anything.
   */
  setState(flipped: number[]): void {
    const face = new Set(flipped);
    for (const cell of this.cells) cell.headTarget = face.has(cell.i) ? 0 : HEAD_SMALL;
  }

  /** The cell the verdict prompt is about, lifted slightly out of the board. */
  setSelected(i: number | null): void {
    for (const cell of this.cells) cell.group.userData.scaleTarget = cell.i === i ? 1.28 : 1;
  }

  /** The cell under a point in normalised device coordinates, or null. */
  pick(ndcX: number, ndcY: number): number | null {
    this.pointer.set(ndcX, ndcY);
    return pickCell(this.raycaster, this.cells, this.pointer, this.camera);
  }

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
      if (c.head) {
        // The face shrinks away on solve rather than vanishing, so the eye can
        // follow which cell just changed.
        const target = c.head.userData.norm * c.headTarget;
        const s = c.head.scale.x + (target - c.head.scale.x) * SPEED;
        c.head.scale.setScalar(s);
        c.head.visible = s > 0.002;
      }
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
