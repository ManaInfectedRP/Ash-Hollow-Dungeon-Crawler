import { T, TILE } from '../constants';
import type { LevelData } from '../world/builder';

/**
 * Reachability check for a floor, on the tile grid, with the player's movement limits:
 * a jump rises ~3.5 tiles (so 3 rows up), a walking jump clears a 3-tile gap, one-way planks can be
 * jumped through from below and dropped through from above, spikes and lava kill.
 * Approximate on purpose – it catches floors that are broken, not every awkward jump.
 */
export interface Validation {
  ok: boolean;
  /** standing spots reached */
  reached: number;
  missing: string[];
  /** "col,row" of every standing spot reached (debug views) */
  seen: Set<string>;
}

export function validateFloor(level: LevelData): Validation {
  const { tiles, cols, rows } = level;
  const at = (c: number, r: number) => (r < 0 || r >= rows || c < 0 || c >= cols ? T.STONE : tiles[r][c]);
  const solid = (c: number, r: number) => {
    const t = at(c, r);
    return t === T.TOP || t === T.STONE || t === T.ICE;
  };
  const plank = (c: number, r: number) => at(c, r) === T.PLANK;
  const deadly = (c: number, r: number) => at(c, r) === T.SPIKE || at(c, r) === T.LAVA;
  /** a body can be in this tile */
  const open = (c: number, r: number) => r >= 0 && !solid(c, r) && !deadly(c, r);
  const stand = (c: number, r: number) => (solid(c, r) || plank(c, r)) && open(c, r - 1) && open(c, r - 2);
  // crumbling planks count as floor (you can always cross them at a run)
  const crumble = new Set<string>();
  for (const cr of level.crumbles) for (let i = 0; i < cr.w; i++) crumble.add(`${Math.floor(cr.x / TILE) + i},${Math.floor(cr.y / TILE)}`);
  const standAt = (c: number, r: number) => stand(c, r) || (crumble.has(`${c},${r}`) && open(c, r - 1) && open(c, r - 2));

  /** fall straight down from (c, r) (a body standing there with nothing under it): where it lands */
  const fall = (c: number, r: number): [number, number] | null => {
    for (let y = r; y < rows + 2; y++) {
      if (deadly(c, y)) return null;
      if (standAt(c, y)) return [c, y];
      if (solid(c, y)) return null;
    }
    return null; // off the bottom of the map
  };

  const seen = new Set<string>();
  const sx = Math.floor(level.spawn.x / TILE);
  const sy = Math.round(level.spawn.y / TILE);
  const queue: [number, number][] = [];
  const push = (c: number, r: number) => {
    const k = `${c},${r}`;
    if (seen.has(k)) return;
    seen.add(k);
    queue.push([c, r]);
  };
  if (standAt(sx, sy)) push(sx, sy);

  for (let qi = 0; qi < queue.length; qi++) {
    const [c, r] = queue[qi];
    for (const d of [-1, 1]) {
      // walk
      const n = c + d;
      if (standAt(n, r)) push(n, r);
      else if (open(n, r - 1) && open(n, r - 2) && !solid(n, r)) {
        // walk off the edge, drifting up to 3 columns while falling
        for (let k = 1; k <= 3; k++) {
          const fc = c + d * k;
          if (!open(fc, r - 1)) break;
          const l = fall(fc, r);
          if (l) push(l[0], l[1]);
        }
      }
      // jump: up to 3 rows up, up to 4 columns over (needs head room above the take-off spot)
      for (let up = 0; up <= 3; up++) {
        let clear = true;
        for (let y = r - 1; y >= r - up - 2; y--) if (solid(c, y)) clear = false;
        if (!clear) break;
        for (let dx = 1; dx <= 4; dx++) {
          const tc = c + d * dx;
          const tr = r - up;
          // the arc passes over every column between at the top of the jump
          let arc = true;
          for (let k = 1; k <= dx; k++) {
            const cc = c + d * k;
            if (solid(cc, tr - 1) || solid(cc, tr - 2)) arc = false;
          }
          if (!arc) break;
          if (standAt(tc, tr)) push(tc, tr);
          else if (up === 0 && dx >= 2) {
            const l = fall(tc, tr);
            if (l) push(l[0], l[1]);
          }
        }
      }
    }
    // straight up through planks
    for (let up = 1; up <= 3; up++) {
      if (solid(c, r - up - 1)) break;
      if (plank(c, r - up) && open(c, r - up - 1) && open(c, r - up - 2)) push(c, r - up);
    }
    // drop through a plank
    if (plank(c, r)) {
      const l = fall(c, r + 1);
      if (l) push(l[0], l[1]);
    }
  }

  const missing: string[] = [];
  const reach = (what: string, x: number, y: number) => {
    const c = Math.floor(x / TILE);
    const r = Math.round(y / TILE);
    if (!seen.has(`${c},${r}`)) missing.push(`${what} @${c},${r}`);
  };
  const m = level.delve;
  if (m?.stairs) reach('stairs', m.stairs.x, m.stairs.y);
  for (const ch of m?.chests ?? []) reach(`chest ${ch.id}`, ch.x, ch.y);
  for (const s of m?.shrines ?? []) reach(`shrine ${s.id}`, s.x, s.y);
  for (const bf of level.bonfires) reach(`bonfire ${bf.id}`, bf.x, bf.y);
  for (const n of level.npcs) reach(`npc ${n.id}`, n.x, n.y);
  for (const it of level.items) reach(`item ${it.id}`, it.x, it.y);
  for (const d of level.doors) reach(`door ${d.id}`, d.x, d.y);
  if (!seen.size) missing.push('spawn is not standable');
  return { ok: missing.length === 0, reached: seen.size, missing, seen };
}
