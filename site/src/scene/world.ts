import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CARD_COUNT, type Puzzle } from '../../../shared/puzzle';
import { addressOf } from '../../../shared/solver/lattice';
import { faceOf } from '../../../shared/solver/vocab';
import { clueText, wrapClue } from '../clue/text';
import { cellLayout, spentColour, type ClueLayout, type TextLayout } from './cell';
import { BACKGROUND, FACE_Z, FOV, GAP, HEAD_SMALL, HEAD_Y, SPEED } from './constants';
import { loadHead } from './head';
import { pickCell } from './pick';
import { fitObject, fitScale, loadFont, textMesh, uniformClueScale } from './text';
import { cellPosition, framingDistance } from './lattice';

/** One line of a cell's text, centred, sitting on the faces' plane. */
function label(part: TextLayout, colour: number): THREE.Object3D {
  const mesh = textMesh(part.text, part.size, colour, true);
  if (part.fit) fitObject(mesh, ...part.fit);
  mesh.position.set(0, part.y, FACE_Z);
  return mesh;
}

/**
 * A wrapped clue, centred on its own origin. It carries the same per-glyph
 * shell the name and profession do and nothing else behind it — no bar. The
 * line meshes come back alongside it so the clue can be darkened when it is
 * struck off.
 */
function clueBlock(
  lines: string[],
  box: ClueLayout,
  colour: number,
): { group: THREE.Object3D; lines: THREE.Object3D[] } {
  const group = new THREE.Group();
  const meshes = lines.map((line, k) => {
    const mesh = textMesh(line, box.size, colour, true);
    mesh.position.y = ((lines.length - 1) / 2 - k) * box.leading;
    group.add(mesh);
    return mesh;
  });
  return { group, lines: meshes };
}

/** Recolours a built text mesh, leaving its shell alone. */
function paint(object: THREE.Object3D, colour: number): void {
  object.traverse((o) => {
    if (!o.userData.paintable) return;
    for (const m of [(o as THREE.Mesh).material].flat()) {
      if (m && 'color' in m) (m as THREE.MeshPhongMaterial).color.setHex(colour);
    }
  });
}

export interface Cell {
  i: number;
  z: number;
  group: THREE.Group;
  hit: THREE.Mesh;
  head: THREE.Group | null;
  /** What the head is lerping towards: `HEAD_SMALL` open, 0 once solved. */
  headTarget: number;
  /** Everything built for this cell, so a rebuild can clear it. */
  labels: THREE.Object3D[];
  /** The two faces. Solving swaps which one is on screen. */
  open: THREE.Object3D | null;
  solved: THREE.Object3D | null;
  clue: THREE.Object3D | null;
  /** The clue's own lines, repainted when it is struck off. */
  clueLines: THREE.Object3D[];
  /** The verdict colour a struck-off clue comes back to. */
  clueColour: number;
  /** The board-wide clue size this cell's clue opens to. */
  clueScale: number;
  /** Whether this cell was solved last time the state was applied. */
  wasSolved: boolean | null;
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
  private face = new Set<number>();
  private muted = new Set<number>();

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
      this.cells.push({
        i,
        z: Math.floor(i / 9),
        group,
        hit,
        head: null,
        headTarget: HEAD_SMALL,
        labels: [],
        open: null,
        solved: null,
        clue: null,
        clueLines: [],
        clueColour: 0xffffff,
        clueScale: 1,
        wasSolved: null,
      });
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
   * Both faces of every cell, built once per puzzle: solving swaps which one
   * is visible rather than rebuilding anything. Every clue on the board is
   * drawn at one shared size, the tightest fit across all of them, so a wordy
   * clue never reads as a smaller one.
   */
  private buildLabels(puzzle: Puzzle): void {
    const fits: number[] = [];
    for (const cell of this.cells) {
      for (const old of cell.labels) cell.group.remove(old);
      const person = puzzle.people[cell.i];
      const open = cellLayout(person, false, cell.z);
      const done = cellLayout(person, true, cell.z);

      const openFace = new THREE.Group();
      openFace.add(label(open.name, open.colour), label(open.profession, open.colour));

      const solvedFace = new THREE.Group();
      solvedFace.add(label(done.name, done.colour), label(done.profession, done.colour));
      let clue: THREE.Object3D | null = null;
      cell.clueLines = [];
      if (done.clue && person.clue) {
        const built = clueBlock(
          wrapClue(clueText(person.clue, puzzle.people, cell.i)),
          done.clue,
          done.colour,
        );
        clue = built.group;
        cell.clueLines = built.lines;
        clue.position.set(0, done.clue.y, FACE_Z);
        fits.push(fitScale(new THREE.Box3().setFromObject(clue), done.clue.maxW, done.clue.maxH));
        solvedFace.add(clue);
      }

      // `textMesh` centres what it builds, so the address is hung off the left
      // edge by half its own width rather than positioned by its centre.
      const address = textMesh(addressOf(cell.i), open.address.size, open.address.colour, false);
      const box = new THREE.Box3().setFromObject(address);
      address.position.set(
        open.address.x + (box.max.x - box.min.x) / 2,
        open.address.y,
        FACE_Z,
      );

      cell.open = openFace;
      cell.solved = solvedFace;
      cell.clue = clue;
      cell.clueColour = done.colour;
      cell.labels = [openFace, solvedFace, address];
      cell.group.add(openFace, solvedFace, address);
    }

    const uniform = uniformClueScale(fits);
    for (const cell of this.cells) {
      cell.clueScale = uniform;
      cell.clue?.scale.setScalar(uniform);
    }
    this.applyState();
    this.applyMuted();
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
    this.face = new Set(flipped);
    this.applyState();
  }

  /**
   * Puts the board into the state React last named. Separate from `setState`
   * because the labels finish loading after the first state arrives, and the
   * cells built then have to be caught up.
   */
  private applyState(): void {
    for (const cell of this.cells) {
      const on = this.face.has(cell.i);
      cell.headTarget = on ? 0 : HEAD_SMALL;
      if (cell.open) cell.open.visible = !on;
      if (cell.solved) cell.solved.visible = on;
      // A clue that has just been revealed pops open; one that was already
      // there — a game reloaded from storage — is simply there.
      if (cell.clue && on && cell.wasSolved === false) {
        cell.clue.scale.setScalar(cell.clueScale * 0.35);
      }
      cell.wasSolved = on;
    }
  }

  /**
   * Which clues the player has struck off. Darkening is the whole effect: the
   * clue stays where it is and stays readable, because a clue struck off by
   * mistake is one you need to be able to read again.
   */
  setMuted(muted: number[]): void {
    this.muted = new Set(muted);
    this.applyMuted();
  }

  private applyMuted(): void {
    for (const cell of this.cells) {
      const colour = this.muted.has(cell.i) ? spentColour(cell.clueColour) : cell.clueColour;
      for (const line of cell.clueLines) paint(line, colour);
    }
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
      if (c.clue) {
        const want = c.clueScale;
        c.clue.scale.setScalar(c.clue.scale.x + (want - c.clue.scale.x) * SPEED);
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
