import { it } from 'vitest';
import { writeFileSync } from 'fs';
import { generateFloor } from '../../src/game/dungeon/generate';
import { validateFloor } from '../../src/game/dungeon/validate';
import { T } from '../../src/game/constants';
it.skipIf(!process.env.OUT)('dump map', () => {
  const [seed, depth] = (process.env.FLOOR ?? '2,1').split(',').map(Number);
  const f = generateFloor(seed, depth);
  const v = validateFloor(f);
  const ch: Record<number, string> = { [-1]: ' ', [T.TOP]: '#', [T.STONE]: '#', [T.PLANK]: '=', [T.SPIKE]: '^', [T.LAVA]: '~', [T.ICE]: 'i', [T.BOG]: '%' };
  const g = f.tiles.map((row) => row.map((t) => ch[t] ?? '?'));
  for (const k of v.seen) { const [c, r] = k.split(',').map(Number); if (r - 1 >= 0) g[r - 1][c] = '.'; }
  const mark = (x: number, y: number, s: string) => { g[Math.round(y / 16) - 1][Math.floor(x / 16)] = s; };
  for (const c of f.delve.chests) mark(c.x, c.y, 'C');
  for (const s of f.delve.shrines) mark(s.x, s.y, 'S');
  for (const n of f.npcs) mark(n.x, n.y, 'N');
  for (const d of f.doors) mark(d.x, d.y, 'D');
  for (const it of f.items) mark(it.x, it.y, 'I');
  for (const b of f.bonfires) mark(b.x, b.y, 'B');
  mark(f.spawn.x, f.spawn.y, 'P');
  const out = g.map((r) => r.join('')).join('\n');
  writeFileSync(process.env.OUT!, `${JSON.stringify(f.delve.rooms.map(r=>`${r.gx},${r.gy} ${r.kind} ${r.exits.join('')} ${r.template}`))}\n${v.missing.join('\n')}\n${out}\n`);
});
