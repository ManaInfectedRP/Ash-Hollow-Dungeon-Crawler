import { describe, expect, it } from 'vitest';
import { Rng } from './rng';
import { rollBossDrop, rollChest, rollGear } from './loot';
import { ITEMS } from '../data/items';

describe('loot', () => {
  it('rolls repeatable gear and registers it', () => {
    const a = rollGear(new Rng(5), 6, 'x', { minRarity: 'rare' });
    const b = rollGear(new Rng(5), 6, 'x', { minRarity: 'rare' });
    expect(a.id).toEqual(b.id);
    expect(a.def?.name).toEqual(b.def?.name);
    expect(ITEMS[a.id]).toBeDefined();
    expect(a.def!.affixLines!.length).toBeGreaterThanOrEqual(2);
    expect(a.def!.base).toBeDefined();
  });
  it('never mutates the base item', () => {
    const before = JSON.stringify(ITEMS.knight_armor);
    for (let i = 0; i < 200; i++) rollGear(new Rng(i), 12, `k${i}`, { base: 'knight_armor', minRarity: 'relic' });
    expect(JSON.stringify(ITEMS.knight_armor)).toEqual(before);
  });
  it('chests and bosses hand out loot', () => {
    for (let i = 0; i < 100; i++) {
      expect(rollChest(new Rng(i), 1 + (i % 20), `c${i}`, i % 2).length).toBeGreaterThan(0);
      const boss = rollBossDrop(new Rng(i), 3, 'warden', `b${i}`);
      expect(['rare', 'relic', 'cursed']).toContain(boss[0].def?.rarity);
    }
  });
});
