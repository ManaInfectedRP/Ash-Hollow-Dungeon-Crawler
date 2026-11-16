import type { EnemyType, Theme } from '../world/builder';

/** floors per band; the last floor of every band is a boss floor */
export const BAND = 3;

export interface BandDef {
  theme: Theme;
  name: string;
  /** enemy pool for ordinary rooms: [type, weight] */
  enemies: [EnemyType, number][];
  /** the band's guardian (Boss.ts makeBoss type) */
  boss: string;
  bossName: string;
  /** light props used to dress rooms */
  lights: string[];
  /** floor clutter */
  clutter: string[];
}

export const BANDS: BandDef[] = [
  {
    theme: 'crypt', name: 'The Sunken Crypts', boss: 'warden', bossName: 'The Ashen Warden',
    enemies: [['hollow', 5], ['ghoul', 3], ['archer', 2]],
    lights: ['candle', 'wall_torch', 'lantern'], clutter: ['skull', 'bone', 'coffin', 'tombstone'],
  },
  {
    theme: 'tomb', name: 'The Ossuary Halls', boss: 'shepherd', bossName: 'The Bone Shepherd',
    enemies: [['hollow', 3], ['ghoul', 3], ['mummy', 3], ['archer', 2], ['knight', 1]],
    lights: ['wall_torch', 'candle'], clutter: ['skull', 'bone', 'urn', 'coffin'],
  },
  {
    theme: 'lava', name: 'The Molten Deep', boss: 'colossus', bossName: 'The Molten Colossus',
    enemies: [['ghoul', 3], ['slime', 3], ['knight', 2], ['hollow', 2]],
    lights: ['wall_torch', 'torch'], clutter: ['skull', 'barrel', 'crate'],
  },
  {
    theme: 'frost', name: 'The Rimed Vaults', boss: 'matriarch', bossName: 'The Frost Matriarch',
    enemies: [['monk', 4], ['wraith', 3], ['knight', 1]],
    lights: ['lantern', 'wall_torch'], clutter: ['pillar', 'tombstone', 'gargoyle'],
  },
  {
    theme: 'mire', name: 'The Drowned Warrens', boss: 'mother', bossName: 'The Mire Mother',
    enemies: [['leech', 4], ['carrier', 3], ['ghoul', 2]],
    lights: ['glow_mushroom', 'lantern'], clutter: ['bone', 'skull', 'glow_mushroom'],
  },
  {
    theme: 'desert', name: 'The Sunken Sands', boss: 'sphinx', bossName: 'The Sphinx',
    enemies: [['mummy', 4], ['legionary', 3], ['archer', 1]],
    lights: ['torch'], clutter: ['urn', 'cactus', 'scrub'],
  },
  {
    theme: 'keep', name: 'The Gladiators’ Pit', boss: 'gladiator', bossName: 'The Gladiator',
    enemies: [['legionary', 4], ['knight', 3], ['archer', 2], ['monk', 1]],
    lights: ['wall_torch', 'torch'], clutter: ['banner', 'barrel', 'crate', 'pillar'],
  },
  {
    theme: 'sky', name: 'The Hollow Sky', boss: 'leviathan', bossName: 'The Sky Leviathan',
    enemies: [['wisp', 4], ['cloudslime', 4]],
    lights: [], clutter: ['pillar'],
  },
  {
    theme: 'shrine', name: 'The Weeping Halls', boss: 'ayame', bossName: 'Ayame',
    enemies: [['maiden', 3], ['lantern', 2], ['faceless', 2], ['hair', 3]],
    lights: ['paperlantern', 'stonelantern'], clutter: ['bamboo', 'stonelantern'],
  },
  {
    theme: 'ash', name: 'The Ashen Abyss', boss: 'king', bossName: 'The Ashen King',
    enemies: [['knight', 3], ['legionary', 3], ['wraith', 2], ['monk', 2], ['hollow', 2]],
    lights: ['wall_torch', 'torch'], clutter: ['skull', 'tombstone_cracked', 'pillar'],
  },
];

/** the band for a depth (1-based). Past the last band the cycle repeats, harder each time. */
export function bandFor(depth: number): BandDef {
  return BANDS[Math.floor((depth - 1) / BAND) % BANDS.length];
}

export const isBossFloor = (depth: number) => depth % BAND === 0;

/** how many times the band cycle has looped (0 on the first descent) */
export const cycleFor = (depth: number) => Math.floor((depth - 1) / (BAND * BANDS.length));

/** enemy HP / soul multiplier for a depth */
export function hpScale(depth: number) {
  return 1 + (depth - 1) * 0.07 + cycleFor(depth) * 0.6;
}

/** damage dealt to the player */
export function dmgScale(depth: number) {
  return 1 + (depth - 1) * 0.045 + cycleFor(depth) * 0.4;
}

export function soulScale(depth: number) {
  return 1 + (depth - 1) * 0.12;
}

/** floor grid size in room cells */
export function gridFor(depth: number): { w: number; h: number } {
  const d = Math.min(depth, 24);
  return { w: Math.min(8, 4 + Math.floor(d / 4)), h: Math.min(4, 2 + Math.floor(d / 7)) };
}

/** chance that an ordinary enemy spawns as an elite */
export function eliteChance(depth: number) {
  return depth < 2 ? 0 : Math.min(0.28, 0.06 + depth * 0.012);
}

/** waystones: you can start a run at the first floor after every boss you have felled */
export const waystoneDepth = (bossDepth: number) => bossDepth + 1;
