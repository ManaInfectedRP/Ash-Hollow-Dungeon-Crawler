import { describe, expect, it } from 'vitest';
import { generateFloor } from './generate';
import { validateFloor } from './validate';
import { BAND } from './tables';

describe('generateFloor', () => {
  it('is deterministic for a seed and depth', () => {
    const a = generateFloor(1234, 2);
    const b = generateFloor(1234, 2);
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
    expect(JSON.stringify(generateFloor(1235, 2))).not.toEqual(JSON.stringify(a));
  });

  it('builds a boss floor at the end of every band', () => {
    for (let d = BAND; d <= BAND * 10; d += BAND) {
      const f = generateFloor(7, d);
      expect(f.delve.boss).toBe(true);
      expect(f.boss).not.toBeNull();
      expect(f.doors.map((x) => x.id).sort()).toEqual(['descend', 'home']);
    }
  });

  it('every floor is traversable: stairs, chests, shrines, bonfires, NPCs and items reachable', () => {
    const failures: string[] = [];
    for (let seed = 1; seed <= 150; seed++) {
      for (const depth of [1, 2, 4, 5, 7, 8, 11, 14, 17, 20, 25, 31]) {
        const f = generateFloor(seed, depth);
        const v = validateFloor(f);
        if (!v.ok) failures.push(`seed ${seed} depth ${depth}: ${v.missing.join(', ')}`);
      }
    }
    expect(failures.slice(0, 15)).toEqual([]);
  }, 300000);

  it('every ordinary floor has stairs, a spawn and at least one chest', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const f = generateFloor(seed, 1 + (seed % 2));
      expect(f.delve.stairs).not.toBeNull();
      expect(f.spawn.x).toBeGreaterThan(0);
      expect(f.delve.chests.length).toBeGreaterThan(0);
      expect(f.doors.some((d) => d.to === '__descend')).toBe(true);
    }
  }, 60000);
});
