/**
 * Seeded PRNG for everything the dungeon generates. Same seed → same floor, same loot roll.
 * (Combat noise – particles, damage jitter – keeps using Math.random; only generation must repeat.)
 */
export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0 || 0x9e3779b9;
  }

  /** mulberry32: 0 ≤ n < 1 */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) | 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** integer in [min, max] (inclusive) */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(list: readonly T[]): T {
    return list[Math.floor(this.next() * list.length)];
  }

  /** pick by weight: [[value, weight], …] */
  weighted<T>(list: readonly (readonly [T, number])[]): T {
    const total = list.reduce((s, [, w]) => s + Math.max(0, w), 0);
    let r = this.next() * total;
    for (const [v, w] of list) {
      r -= Math.max(0, w);
      if (r < 0) return v;
    }
    return list[list.length - 1][0];
  }

  shuffle<T>(list: T[]): T[] {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  /** an independent stream derived from this seed and a label (so adding rolls in one place never shifts another) */
  fork(label: string | number): Rng {
    return new Rng(hashSeed(`${this.s}:${label}`));
  }
}

/** FNV-1a – turns any string (a seed typed by the player, "seed:depth") into a 32-bit seed */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function floorSeed(runSeed: number, depth: number) {
  return hashSeed(`${runSeed}:floor:${depth}`);
}

export function randomSeed() {
  return (Math.random() * 0xffffffff) >>> 0;
}
