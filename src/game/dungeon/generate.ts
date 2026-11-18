import { TILE } from '../constants';
import { Builder, type EnemyType, type LevelData, type Theme } from '../world/builder';
import { Rng, floorSeed } from './rng';
import { bandFor, eliteChance, gridFor, isBossFloor, type BandDef } from './tables';
import type { ChestDef, FloorMeta, RoomKind, RoomMeta, ShrineDef, Side } from './types';

/**
 * Procedural floors for the Deep.
 *
 * A floor is a grid of room cells (CW × CH tiles each). A Spelunky-style walk lays a main path from the
 * start cell (top row) down to the stairs (bottom row); side branches hang off it and end in treasure,
 * shrines, merchants and vaults. Every cell is built from a small hand-made template; the stitcher then
 * cuts the doorways (sideways: a 4-tall gap at floor level; up/down: a shaft with a plank ladder) so any
 * two templates fit together. The result is one ordinary LevelData – GameScene runs it like any area.
 *
 * Cell layout (local rows): 0 = ceiling, 1..10 = air, 11 = floor surface, 12..13 = rock.
 */
export const CW = 24;
export const CH = 14;
const FLOOR = 11;
/** vertical shaft: hole columns and the ladder planks' columns */
const SHAFT = [9, 14] as const;
const LADDER = [10, 13] as const;

type CellCh = Builder['g'][number][number];
const key = (x: number, y: number) => `${x},${y}`;
const OPP: Record<Side, Side> = { L: 'R', R: 'L', U: 'D', D: 'U' };
const STEP: Record<Side, [number, number]> = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] };

// ------------------------------------------------------------------ layout
interface LCell {
  gx: number;
  gy: number;
  exits: Set<Side>;
  kind: RoomKind;
  onPath: boolean;
}

export interface Layout {
  w: number;
  h: number;
  cells: Map<string, LCell>;
  path: LCell[];
}

function connect(a: LCell, b: LCell) {
  const dx = b.gx - a.gx;
  const dy = b.gy - a.gy;
  const s: Side = dx === 1 ? 'R' : dx === -1 ? 'L' : dy === 1 ? 'D' : 'U';
  a.exits.add(s);
  b.exits.add(OPP[s]);
}

export function makeLayout(rng: Rng, w: number, h: number, depth: number): Layout {
  const cells = new Map<string, LCell>();
  const add = (gx: number, gy: number, onPath: boolean) => {
    const c: LCell = { gx, gy, exits: new Set(), kind: 'combat', onPath };
    cells.set(key(gx, gy), c);
    return c;
  };
  // --- the main path: top row → bottom row, never revisiting a cell
  let x = rng.int(0, w - 1);
  let y = 0;
  let dir = rng.chance(0.5) ? 1 : -1;
  const path: LCell[] = [add(x, y, true)];
  const minLen = Math.max(4, Math.floor(w * h * 0.45));
  const free = (nx: number) => nx >= 0 && nx < w && !cells.has(key(nx, y));
  for (let guard = 0; guard < 200; guard++) {
    if (y === h - 1) {
      if (path.length >= minLen && rng.chance(0.45)) break;
      if (free(x + dir)) x += dir;
      else if (free(x - dir)) {
        dir = -dir;
        x += dir;
      } else break;
    } else if (rng.chance(0.28) || !free(x + dir)) {
      if (!free(x + dir) && free(x - dir) && rng.chance(0.35)) {
        dir = -dir;
        x += dir;
      } else {
        y += 1;
        dir = rng.chance(0.5) ? 1 : -1;
      }
    } else x += dir;
    const c = add(x, y, true);
    connect(path[path.length - 1], c);
    path.push(c);
  }
  path[0].kind = 'start';
  path[path.length - 1].kind = 'stairs';

  // --- side branches
  const target = Math.min(w * h - path.length, Math.round(path.length * 0.7) + rng.int(0, 2));
  let added = 0;
  for (let guard = 0; guard < 400 && added < target; guard++) {
    const all = [...cells.values()];
    const from = rng.pick(all);
    const s = rng.pick(['L', 'R', 'U', 'D'] as Side[]);
    const [dx, dy] = STEP[s];
    const nx = from.gx + dx;
    const ny = from.gy + dy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h || cells.has(key(nx, ny))) continue;
    // keep the start and the stairs simple: one way in, one way out
    if (from.kind === 'start' || from.kind === 'stairs') continue;
    const c = add(nx, ny, false);
    connect(from, c);
    added++;
  }
  // a few sideways loops so the floor isn't a pure tree
  for (const c of cells.values()) {
    const r = cells.get(key(c.gx + 1, c.gy));
    if (!r || c.exits.has('R') || c.kind === 'start' || c.kind === 'stairs' || r.kind === 'start' || r.kind === 'stairs') continue;
    if (rng.chance(0.25)) connect(c, r);
  }

  // --- room kinds: dead ends off the path hold the rewards
  const ends = rng.shuffle([...cells.values()].filter((c) => !c.onPath && c.exits.size === 1));
  const others = rng.shuffle([...cells.values()].filter((c) => !c.onPath && c.exits.size > 1));
  const specials: RoomKind[] = ['treasure'];
  if (rng.chance(0.65)) specials.push('shrine');
  if (depth >= 2 && rng.chance(0.4)) specials.push('vault');
  if (rng.chance(depth % 3 === 2 ? 0.85 : 0.35)) specials.push('merchant');
  if (ends.length > 3 && rng.chance(0.5)) specials.push('treasure');
  for (const k of specials) {
    const c = ends.shift() ?? others.shift();
    if (c) c.kind = k;
  }
  // a bonfire part-way down the main path (not every floor)
  if (path.length >= 5 && rng.chance(0.55)) path[Math.floor(path.length / 2)].kind = 'rest';
  // no branch room left for the treasure: it goes on the path
  if (![...cells.values()].some((c) => c.kind === 'treasure')) {
    const spare = path.filter((c) => c.kind === 'combat');
    if (spare.length) rng.pick(spare).kind = 'treasure';
  }
  return { w, h, cells, path };
}

// ------------------------------------------------------------------ templates
interface Ctx {
  b: Builder;
  rng: Rng;
  ox: number;
  oy: number;
  theme: Theme;
  exits: Set<Side>;
  /** fill in cell-local tiles */
  L: (x1: number, y1: number, x2: number, y2: number, c?: CellCh) => void;
}

interface Template {
  id: string;
  weight: number;
  themes?: Theme[];
  build: (c: Ctx) => void;
}

const TEMPLATES: Template[] = [
  {
    id: 'hall',
    weight: 3,
    build: (c) => {
      if (c.rng.chance(0.5)) c.L(c.rng.int(5, 9), 10, c.rng.int(13, 17), 10, c.theme === 'keep' || c.theme === 'tomb' ? 's' : '#');
    },
  },
  {
    id: 'steps',
    weight: 3,
    build: (c) => {
      c.L(5, 9, 8, 10);
      c.L(15, 8, 18, 10);
      if (c.rng.chance(0.5)) c.L(11, 6, 13, 6, '=');
    },
  },
  {
    id: 'pit',
    weight: 2,
    build: (c) => {
      const x = c.rng.int(9, 11);
      c.L(x, 11, x + 2, 12, '.');
      c.L(x, 12, x + 2, 12, '^');
    },
  },
  {
    id: 'planks',
    weight: 3,
    build: (c) => {
      c.L(3, 8, 7, 8, '=');
      c.L(16, 8, 20, 8, '=');
      c.L(9, 5, 14, 5, '=');
    },
  },
  {
    id: 'low',
    weight: 2,
    build: (c) => {
      c.L(1, 1, 22, 4);
      if (c.rng.chance(0.5)) c.L(10, 9, 13, 10);
    },
  },
  {
    id: 'pillars',
    weight: 2,
    build: (c) => {
      c.L(7, 9, 8, 10);
      c.L(15, 9, 16, 10);
    },
  },
  {
    id: 'crumble',
    weight: 1,
    build: (c) => {
      c.L(7, 11, 16, 12, '.');
      c.b.crumble(c.ox + 8, c.oy + 11, 3);
      c.b.crumble(c.ox + 13, c.oy + 11, 3);
    },
  },
  {
    id: 'ledges',
    weight: 2,
    build: (c) => {
      c.L(4, 7, 6, 7);
      c.L(17, 7, 19, 7);
      c.L(7, 9, 9, 9, '=');
      c.L(14, 9, 16, 9, '=');
    },
  },
  // --- themed
  {
    id: 'lavapool',
    weight: 4,
    themes: ['lava'],
    build: (c) => {
      c.L(6, 11, 17, 11, '.');
      c.L(6, 12, 17, 12, '~');
      c.L(9, 11, 10, 12);
      c.L(13, 11, 14, 12);
    },
  },
  {
    id: 'bogpool',
    weight: 4,
    themes: ['mire'],
    build: (c) => c.L(5, 11, 18, 11, '%'),
  },
  {
    id: 'icefloor',
    weight: 4,
    themes: ['frost'],
    build: (c) => {
      c.L(3, 11, 20, 11, 'i');
      for (const col of [5, 17, 19]) if (c.rng.chance(0.6)) c.b.icicle(c.ox + col, c.oy + 1);
    },
  },
  {
    id: 'cloudsteps',
    weight: 3,
    themes: ['sky'],
    build: (c) => {
      c.L(6, 11, 17, 12, '.');
      c.b.crumble(c.ox + 7, c.oy + 11, 2);
      c.L(10, 10, 13, 12);
      c.b.crumble(c.ox + 15, c.oy + 11, 2);
    },
  },
  {
    id: 'paved',
    weight: 3,
    themes: ['keep', 'tomb', 'desert', 'shrine', 'ash'],
    build: (c) => {
      c.L(1, 11, 22, 11, 's');
      c.L(9, 9, 14, 10, 's');
    },
  },
];

const FLAT: Template = { id: 'flat', weight: 1, build: () => {} };

function pickTemplate(rng: Rng, theme: Theme): Template {
  const pool = TEMPLATES.filter((t) => !t.themes || t.themes.includes(theme));
  return rng.weighted(pool.map((t) => [t, t.weight] as const));
}

// ------------------------------------------------------------------ grid queries
const isFloorCh = (c: CellCh | undefined) => c === '#' || c === '=' || c === 'i' || c === 's';
const isAirCh = (c: CellCh | undefined) => c === '.' || c === '%';

function standable(b: Builder, col: number, row: number) {
  if (row < 2 || row >= b.rows || col < 0 || col >= b.cols) return false;
  return isFloorCh(b.g[row][col]) && isAirCh(b.g[row - 1][col]) && isAirCh(b.g[row - 2][col]) && b.g[row - 1][col] !== '%';
}

/** standing spots in a cell: [local col, global row], solid ground only unless planks are allowed */
function spotsIn(b: Builder, ox: number, oy: number, planks = false) {
  const out: { c: number; row: number; plank: boolean }[] = [];
  for (let c = 2; c <= CW - 3; c++)
    for (let r = 2; r <= CH - 1; r++) {
      const row = oy + r;
      if (!standable(b, ox + c, row)) continue;
      const plank = b.g[row][ox + c] === '=';
      if (plank && !planks) continue;
      out.push({ c, row, plank });
    }
  return out;
}

// ------------------------------------------------------------------ the floor
export interface FloorResult extends LevelData {
  delve: FloorMeta;
}

export function generateFloor(runSeed: number, depth: number): FloorResult {
  const seed = floorSeed(runSeed, depth);
  const band = bandFor(depth);
  return isBossFloor(depth) ? buildBossFloor(seed, depth, band) : buildFloor(seed, depth, band);
}

function buildFloor(seed: number, depth: number, band: BandDef): FloorResult {
  const rng = new Rng(seed);
  const { w, h } = gridFor(depth);
  const lay = makeLayout(rng.fork('layout'), w, h, depth);
  const b = new Builder(w * CW, h * CH, 'deep', band.name, band.theme);
  b.fill(0, 0, b.cols - 1, b.rows - 1);
  const rooms: RoomMeta[] = [];
  const chests: ChestDef[] = [];
  const shrines: ShrineDef[] = [];
  const notes: FloorMeta['notes'] = [];
  const trng = rng.fork('templates');

  // 1) carve every used cell and run its template
  const tpl = new Map<string, string>();
  for (const cell of lay.cells.values()) {
    const ox = cell.gx * CW;
    const oy = cell.gy * CH;
    const L = (x1: number, y1: number, x2: number, y2: number, ch: CellCh = '#') => b.fill(ox + x1, oy + y1, ox + x2, oy + y2, ch);
    L(1, 1, CW - 2, FLOOR - 1, '.');
    const t = cell.kind === 'combat' ? pickTemplate(trng, band.theme) : cell.kind === 'vault' ? TEMPLATES[0] : FLAT;
    t.build({ b, rng: trng, ox, oy, theme: band.theme, exits: cell.exits, L });
    tpl.set(key(cell.gx, cell.gy), t.id);
  }

  // 2) cut the doorways (after every template, so they always win)
  for (const cell of lay.cells.values()) {
    const ox = cell.gx * CW;
    const oy = cell.gy * CH;
    const L = (x1: number, y1: number, x2: number, y2: number, ch: CellCh = '#') => b.fill(ox + x1, oy + y1, ox + x2, oy + y2, ch);
    const ground = band.theme === 'keep' || band.theme === 'tomb' ? 's' : '#';
    if (cell.exits.has('L')) {
      L(0, 7, 3, 10, '.');
      L(0, FLOOR, 3, CH - 1, ground);
    }
    if (cell.exits.has('R')) {
      L(CW - 4, 7, CW - 1, 10, '.');
      L(CW - 4, FLOOR, CW - 1, CH - 1, ground);
    }
    if (cell.exits.has('U')) {
      // the shaft up: clear its column, open the ceiling, hang a plank ladder
      L(SHAFT[0] - 1, 1, SHAFT[1] + 1, FLOOR - 1, '.');
      L(SHAFT[0], 0, SHAFT[1], 0, '.');
      if (!cell.exits.has('D')) L(SHAFT[0] - 1, FLOOR, SHAFT[1] + 1, CH - 1, ground);
    }
    if (cell.exits.has('D')) {
      // the hole down, with firm ground on both lips and the ladder's top rung inside it
      L(SHAFT[0] - 3, FLOOR - 3, SHAFT[1] + 3, FLOOR - 1, '.');
      L(SHAFT[0] - 3, FLOOR, SHAFT[0] - 1, CH - 1, ground);
      L(SHAFT[1] + 1, FLOOR, SHAFT[1] + 3, CH - 1, ground);
      L(SHAFT[0], FLOOR - 2, SHAFT[1], CH - 1, '.');
      L(LADDER[0], CH - 1, LADDER[1], CH - 1, '=');
      if (cell.exits.has('U')) L(LADDER[0], FLOOR, LADDER[1], FLOOR, '=');
    }
    // the ladder last: nothing above may cut a rung out
    if (cell.exits.has('U')) for (const r of [2, 5, 8]) L(LADDER[0], r, LADDER[1], r, '=');
  }

  // 3) contents
  const crng = rng.fork('contents');
  let itemN = 0;
  let spawn = { x: 0, y: 0 };
  let stairs: { x: number; y: number } | null = null;
  const pool = band.enemies.map(([t, wgt]) => [t, wgt] as const);
  const prefer = [17, 6, 18, 5, 16, 7, 19, 4, 12, 11];
  for (const cell of lay.cells.values()) {
    const ox = cell.gx * CW;
    const oy = cell.gy * CH;
    const ground = spotsIn(b, ox, oy);
    const at = (c: number, row: number) => ({ x: (ox + c) * TILE + TILE / 2, y: row * TILE });
    const hole = cell.exits.has('D');
    // lowest spots first: a column's floor beats a ledge above it
    const usable = ground.filter((s) => !(hole && s.c >= SHAFT[0] - 1 && s.c <= SHAFT[1] + 1)).sort((a, b) => b.row - a.row);
    const take = (prefs: number[] = prefer) => {
      for (const p of prefs) {
        const i = usable.findIndex((s) => s.c === p);
        if (i >= 0) return usable.splice(i, 1)[0];
      }
      return usable.length ? usable.splice(Math.floor(crng.next() * usable.length), 1)[0] : null;
    };
    const id = `f${depth}-${cell.gx}-${cell.gy}`;
    switch (cell.kind) {
      case 'start': {
        const s = take([4, 5, 19, 18, 6]);
        if (s) spawn = at(s.c, s.row);
        break;
      }
      case 'stairs': {
        const s = take([18, 5, 17, 6, 19, 4]);
        if (s) {
          stairs = at(s.c, s.row);
          b.door({ id: 'stairs', to: '__descend', entry: '', look: 'well' }, ox + s.c, s.row);
          b.prop('torch', ox + s.c - 2, s.row, { light: true });
          b.prop('torch', ox + s.c + 2, s.row, { light: true });
        }
        break;
      }
      case 'treasure':
      case 'vault': {
        const s = take([12, 11, ...prefer]);
        if (s) {
          chests.push({ id, ...at(s.c, s.row), tier: cell.kind === 'vault' || crng.chance(0.2) ? 1 : 0 });
          b.prop('candle', ox + s.c - 2, s.row, { light: true });
          b.prop('candle', ox + s.c + 2, s.row, { light: true });
        }
        if (cell.kind === 'vault') spawnEnemies(2, true);
        break;
      }
      case 'rest': {
        const s = take([12, 11, 13, ...prefer]);
        if (s) b.data.bonfires.push({ id: `${id}-fire`, ...at(s.c, s.row) });
        spawnEnemies(1, false);
        break;
      }
      case 'merchant': {
        const s = take();
        if (s) {
          b.data.npcs.push({ id: 'wanderer', ...at(s.c, s.row) });
          b.prop('lantern', ox + s.c, oy + 2, { hang: true, light: true });
        }
        break;
      }
      case 'shrine': {
        const s = take([12, 11, ...prefer]);
        if (s) shrines.push({ id, ...at(s.c, s.row) });
        break;
      }
      default:
        spawnEnemies(depth === 1 ? crng.int(1, 2) : crng.int(2, depth > 4 ? 4 : 3), false);
        if (crng.chance(0.3)) {
          // on the floor itself: ledges may have lost their way up to a doorway cut
          const low = usable.filter((p) => p.row === oy + FLOOR);
          const s = low.length ? crng.pick(low) : null;
          if (s) {
            const it = crng.weighted([['bread', 4], ['ember_herb', 3], ['titanite', 3], ['soul_lost_knight', 2], ['return_ember', 1]] as const);
            b.item(`f${depth}-i${itemN++}`, it, ox + s.c, s.row, it === 'bread' ? 2 : 1);
          }
        } else if (notes.length < 2 && crng.chance(0.22)) {
          // a document on the floor (a torn page, a letter, a scholar's note)
          const low = usable.filter((p) => p.row === oy + FLOOR);
          const s = low.length ? crng.pick(low) : null;
          if (s) notes.push({ id: `${id}-note`, ...at(s.c, s.row) });
        }
    }
    function spawnEnemies(n: number, guaranteeElite: boolean) {
      const spots = spotsIn(b, ox, oy, true).filter((s) => s.c >= 3 && s.c <= CW - 4 && !(hole && s.c >= SHAFT[0] - 1 && s.c <= SHAFT[1] + 1));
      crng.shuffle(spots);
      const used: number[] = [];
      for (let i = 0; i < n; i++) {
        const type: EnemyType = crng.weighted(pool);
        const s = spots.find((p) => (p.plank ? type === 'archer' : true) && used.every((u) => Math.abs(u - p.c) >= 4));
        if (!s) break;
        used.push(s.c);
        const elite = (guaranteeElite && i === 0) || crng.chance(eliteChance(depth)) ? crng.pick(ELITES) : undefined;
        b.data.enemies.push({ type, ...at(s.c, s.row), elite });
      }
    }
    decorate(b, crng, band, ox, oy, cell.exits);
    rooms.push({ gx: cell.gx, gy: cell.gy, kind: cell.kind, exits: [...cell.exits], template: tpl.get(key(cell.gx, cell.gy)) ?? 'flat' });
  }
  b.data.spawn = spawn;
  const mid = lay.path[Math.floor(lay.path.length / 2)];
  const midSpots = spotsIn(b, mid.gx * CW, mid.gy * CH);
  const ms = midSpots[Math.floor(midSpots.length / 2)];
  const stainSpot = ms ? { x: (mid.gx * CW + ms.c) * TILE + 8, y: ms.row * TILE } : spawn;
  const level = b.build() as FloorResult;
  level.delve = {
    depth, seed, boss: false, title: band.name, gw: w, gh: h, cellW: CW, cellH: CH,
    rooms, chests, shrines, notes, stainSpot, stairs,
  };
  return level;
}

export const ELITES = ['hulking', 'frenzied', 'frostbound', 'venomous', 'vampiric'] as const;
export type EliteKind = (typeof ELITES)[number];

/** lights on the walls, a little clutter on the floor */
function decorate(b: Builder, rng: Rng, band: BandDef, ox: number, oy: number, exits: Set<Side>) {
  const light = band.lights.length ? rng.pick(band.lights) : null;
  if (light) {
    if (light === 'wall_torch') {
      const side = rng.chance(0.5) ? 2 : CW - 3;
      b.prop('wall_torch', ox + side, oy + 8, { light: true });
    } else if (light === 'lantern' || light === 'paperlantern') {
      const col = exits.has('U') ? rng.pick([4, 19]) : rng.int(4, 19);
      b.prop(light, ox + col, oy + 2, { hang: true, light: true });
    } else b.prop(light, ox + rng.int(3, 20), oy + FLOOR, { light: true });
  }
  const n = rng.int(0, 2);
  for (let i = 0; i < n; i++) b.prop(rng.pick(band.clutter), ox + rng.int(3, 20), oy + FLOOR);
  if (band.theme === 'crypt' || band.theme === 'tomb' || band.theme === 'keep')
    if (rng.chance(0.4)) b.prop('chain', ox + (exits.has('U') ? rng.pick([5, 18]) : rng.int(4, 19)), oy + 2, { hang: true });
}

// ------------------------------------------------------------------ boss floors
/**
 * A boss floor is one long hall: the landing, an antechamber with a bonfire, then the arena behind its
 * fog gate. The arena runs to the right edge of the map (the arena mechanics – collapsing lava floors,
 * freezing ice, the breaking platform – all assume that). Once the guardian falls, two doors in the far
 * wall open: down to the next floor, or home to the camp.
 */
const BOSS_FLOOR = 17;
const BOSS_COLS = 100;
const BOSS_ROWS = 20;

function buildBossFloor(seed: number, depth: number, band: BandDef): FloorResult {
  const rng = new Rng(seed);
  const b = new Builder(BOSS_COLS, BOSS_ROWS, 'deep', band.name, band.theme);
  const F = BOSS_FLOOR;
  b.fill(0, 0, BOSS_COLS - 1, BOSS_ROWS - 1);
  b.fill(2, 2, BOSS_COLS - 3, F - 1, '.');
  // the landing and the antechamber sit under a lower vault; the arena gets the full height
  b.fill(2, 2, 47, 7);
  b.fill(22, 8, 23, 12);
  b.fill(46, 8, 47, 12);
  if (band.theme === 'keep' || band.theme === 'tomb') b.fill(48, F, BOSS_COLS - 3, F, 's');
  b.data.spawn = b.at(5, F);
  b.data.bonfires.push({ id: `f${depth}-boss-fire`, ...b.at(34, F) });
  const flag = `run:boss${depth}`;
  b.data.boss = {
    type: band.boss,
    ...b.at(80, F),
    fogX: 50 * TILE,
    flag,
    banner: `${band.bossName.replace(/^The /, '').toUpperCase()} FELLED`,
    sub: `Depth ${depth} is yours`,
  };
  b.door({ id: 'descend', to: '__descend', entry: '', requires: flag, sealed: true, look: 'well', lockedMsg: 'Chains bind the well while the guardian lives.' }, 89, F);
  b.door({ id: 'home', to: '__camp', entry: '', requires: flag, sealed: true, look: 'ladder', lockedMsg: 'The ladder home hangs out of reach while the guardian lives.' }, 94, F);
  // a couple of foes on the landing to wake you up
  const pool = band.enemies.map(([t, wgt]) => [t, wgt] as const);
  b.enemy(rng.weighted(pool), 15, F);
  // dressing
  const lights = band.lights.length ? band.lights : ['torch'];
  for (const col of [8, 28, 40]) {
    const l = rng.pick(lights);
    if (l === 'lantern' || l === 'paperlantern') b.prop(l, col, 9, { hang: true, light: true });
    else if (l === 'wall_torch') b.prop('torch', col, F, { light: true });
    else b.prop(l, col, F, { light: true });
  }
  for (const col of [56, 70, 84]) b.prop(band.theme === 'sky' ? 'pillar' : 'torch', col, F, { light: band.theme !== 'sky' });
  for (let i = 0; i < 4; i++) b.prop(rng.pick(band.clutter), rng.int(4, 44), F);
  const level = b.build() as FloorResult;
  const cw = 25;
  level.delve = {
    depth, seed, boss: true, title: band.name, gw: 4, gh: 1, cellW: cw, cellH: BOSS_ROWS,
    rooms: [
      { gx: 0, gy: 0, kind: 'start', exits: ['R'], template: 'landing' },
      { gx: 1, gy: 0, kind: 'antechamber', exits: ['L', 'R'], template: 'antechamber' },
      { gx: 2, gy: 0, kind: 'arena', exits: ['L', 'R'], template: 'arena' },
      { gx: 3, gy: 0, kind: 'arena', exits: ['L'], template: 'arena' },
    ],
    chests: [],
    shrines: [],
    notes: [],
    stainSpot: b.at(26, F),
    stairs: b.at(89, F),
  };
  return level;
}
