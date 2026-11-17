import { ITEMS, type ItemDef, type ItemMods, type Rarity } from '../data/items';
import { WEAPONS } from '../systems/attacks';
import { Rng, hashSeed } from './rng';

/**
 * Dungeon loot. A drop is either a plain consumable or a piece of gear rolled from a base item:
 * rarity decides how many affixes it gets, depth decides which bases can appear and how strong
 * the rolls are. Rolled gear becomes a new ItemDef (with `base` pointing at the item it looks like)
 * registered in ITEMS at runtime, so the inventory, equipment and sprites all work unchanged.
 */

type Slot = 'weapon' | 'armor' | 'shield';

/** bases and the first depth they can drop on */
const BASES: { id: string; slot: Slot; min: number }[] = [
  { id: 'shortsword', slot: 'weapon', min: 1 },
  { id: 'rapier', slot: 'weapon', min: 1 },
  { id: 'longsword', slot: 'weapon', min: 1 },
  { id: 'twin_daggers', slot: 'weapon', min: 2 },
  { id: 'fire_wand', slot: 'weapon', min: 1 },
  { id: 'frost_wand', slot: 'weapon', min: 2 },
  { id: 'poison_wand', slot: 'weapon', min: 3 },
  { id: 'greataxe', slot: 'weapon', min: 2 },
  { id: 'flame_shortsword', slot: 'weapon', min: 4 },
  { id: 'frost_spear', slot: 'weapon', min: 5 },
  { id: 'frost_shortsword', slot: 'weapon', min: 6 },
  { id: 'flame_longsword', slot: 'weapon', min: 7 },
  { id: 'frost_longsword', slot: 'weapon', min: 9 },
  { id: 'venom_rapier', slot: 'weapon', min: 10 },
  { id: 'venom_longsword', slot: 'weapon', min: 12 },
  { id: 'flame_greataxe', slot: 'weapon', min: 13 },
  { id: 'frost_greataxe', slot: 'weapon', min: 15 },
  { id: 'garb', slot: 'armor', min: 1 },
  { id: 'hunter_leathers', slot: 'armor', min: 1 },
  { id: 'knight_armor', slot: 'armor', min: 2 },
  { id: 'ember_robes', slot: 'armor', min: 5 },
  { id: 'mummy_wraps', slot: 'armor', min: 5 },
  { id: 'warden_plate', slot: 'armor', min: 7 },
  { id: 'frostbound_mantle', slot: 'armor', min: 10 },
  { id: 'mire_leathers', slot: 'armor', min: 13 },
  { id: 'legion_plate', slot: 'armor', min: 16 },
  { id: 'wooden_shield', slot: 'shield', min: 1 },
  { id: 'buckler', slot: 'shield', min: 1 },
  { id: 'kite_shield', slot: 'shield', min: 2 },
  { id: 'tower_shield', slot: 'shield', min: 5 },
  { id: 'obsidian_shield', slot: 'shield', min: 7 },
];

/** what each guardian leaves behind (rolled at least rare) */
export const BOSS_DROPS: Record<string, string[]> = {
  warden: ['warden_plate', 'greataxe'],
  shepherd: ['bone_scythe'],
  colossus: ['obsidian_shield', 'flame_greataxe'],
  matriarch: ['frostbound_mantle', 'frost_spear'],
  mother: ['mire_leathers', 'venom_longsword'],
  sphinx: ['sand_scepter', 'mummy_wraps'],
  gladiator: ['gladiator_blades', 'legion_plate'],
  leviathan: ['cloudbreaker', 'whale_scale', 'white_cloak'],
  ayame: ['bridal_knife', 'white_kimono'],
  king: ['ashen_greatsword', 'ashen_regalia'],
};

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#d8d0c0',
  fine: '#8fd27a',
  rare: '#6fa8ff',
  relic: '#ffb347',
  cursed: '#c76bff',
};

const RARITY_AFFIXES: Record<Rarity, number> = { common: 0, fine: 1, rare: 2, relic: 3, cursed: 2 };

export function rollRarity(rng: Rng, depth: number, tier: number): Rarity {
  const d = depth + tier * 5;
  return rng.weighted([
    ['common', Math.max(8, 50 - d * 2)],
    ['fine', 32],
    ['rare', 10 + d * 1.2],
    ['relic', tier >= 2 ? 10 + d * 0.5 : Math.max(0, d - 3) * 0.45],
    ['cursed', 3 + d * 0.3],
  ] as const);
}

// ------------------------------------------------------------------ affixes
interface Draft {
  def: ItemDef;
  slot: Slot;
  mods: ItemMods;
  lines: string[];
  rng: Rng;
}

interface Affix {
  id: string;
  slots: Slot[];
  /** adjective for the name */
  word: string;
  /** can it roll on this draft? */
  ok?: (d: Draft) => boolean;
  /** q: 0.5..1 quality, s: depth scale (≥1) */
  apply: (d: Draft, q: number, s: number) => void;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const r2 = (n: number) => Math.round(n * 100) / 100;

const AFFIXES: Affix[] = [
  {
    id: 'keen', slots: ['weapon'], word: 'Keen',
    apply: (d, q, s) => {
      const v = r2(0.06 + 0.1 * q * s);
      d.mods.dmg = r2((d.mods.dmg ?? 0) + v);
      d.lines.push(`+${pct(v)} damage`);
    },
  },
  {
    id: 'honed', slots: ['armor'], word: 'Honed',
    apply: (d, q, s) => {
      const v = r2(0.03 + 0.05 * q * s);
      d.mods.dmg = r2((d.mods.dmg ?? 0) + v);
      d.lines.push(`+${pct(v)} damage`);
    },
  },
  {
    id: 'infused', slots: ['weapon'], word: 'Infused',
    ok: (d) => !d.def.element && !WEAPONS[d.def.weapon ?? '']?.element,
    apply: (d, q, s) => {
      const type = d.rng.pick(['fire', 'cold', 'poison'] as const);
      const base = type === 'fire' ? 4 + 5 * q : type === 'cold' ? 16 + 14 * q : 14 + 10 * q;
      const power = Math.round(base * Math.min(1.8, s));
      d.def.element = { type, power };
      d.lines.push(type === 'fire' ? `Burns: +${power} fire per hit` : type === 'cold' ? `Frost build-up ${power} per hit` : `Poison build-up ${power} per hit`);
    },
  },
  {
    id: 'leeching', slots: ['weapon', 'armor'], word: 'Leeching',
    apply: (d, q, s) => {
      const v = Math.max(1, Math.round((d.slot === 'weapon' ? 2 + 3 * q : 1 + 2 * q) * Math.sqrt(s)));
      d.mods.lifeOnHit = (d.mods.lifeOnHit ?? 0) + v;
      d.lines.push(`Heals ${v} HP per hit`);
    },
  },
  {
    id: 'tireless', slots: ['weapon', 'armor', 'shield'], word: 'Tireless',
    apply: (d, q) => {
      const v = r2(0.1 + 0.18 * q);
      d.mods.stamina = r2((d.mods.stamina ?? 0) + v);
      d.lines.push(`+${pct(v)} stamina regen`);
    },
  },
  {
    id: 'greedy', slots: ['weapon', 'armor', 'shield'], word: 'Greedy',
    apply: (d, q) => {
      const v = r2(0.1 + 0.25 * q);
      d.mods.souls = r2((d.mods.souls ?? 0) + v);
      d.lines.push(`+${pct(v)} souls from kills`);
    },
  },
  {
    id: 'light', slots: ['weapon', 'armor', 'shield'], word: 'Featherweight',
    apply: (d) => {
      scaleWeight(d, 0.65);
      d.lines.push('35% lighter');
    },
  },
  {
    id: 'warded', slots: ['armor'], word: 'Warded',
    apply: (d, q, s) => {
      const a = d.def.armor!;
      const v = r2(0.03 + 0.04 * q * Math.min(s, 1.6));
      a.defense = r2(Math.min(0.7, a.defense + v));
      d.lines.push(`+${pct(v)} defense`);
    },
  },
  {
    id: 'steadfast', slots: ['armor'], word: 'Steadfast',
    apply: (d, q, s) => {
      const v = Math.round((5 + 10 * q) * Math.min(s, 1.8));
      d.def.armor!.poise += v;
      d.lines.push(`+${v} poise`);
    },
  },
  {
    id: 'fireproof', slots: ['armor', 'shield'], word: 'Fireproof',
    apply: (d, q) => {
      const v = r2(0.15 + 0.2 * q);
      if (d.def.armor) d.def.armor.fireRes = r2(Math.min(0.85, (d.def.armor.fireRes ?? 0) + v));
      if (d.def.shield) d.def.shield.fireAbsorb = r2(Math.min(1, (d.def.shield.fireAbsorb ?? d.def.shield.absorb) + v));
      d.lines.push(`+${pct(v)} fire ${d.def.armor ? 'resistance' : 'block'}`);
    },
  },
  {
    id: 'rimeproof', slots: ['armor'], word: 'Rimeproof',
    apply: (d, q) => {
      const v = r2(0.2 + 0.25 * q);
      d.def.armor!.frostRes = r2(Math.min(0.9, (d.def.armor!.frostRes ?? 0) + v));
      d.lines.push(`+${pct(v)} frost resistance`);
    },
  },
  {
    id: 'antivenom', slots: ['armor'], word: 'Purified',
    apply: (d, q) => {
      const v = r2(0.2 + 0.25 * q);
      d.def.armor!.poisonRes = r2(Math.min(0.9, (d.def.armor!.poisonRes ?? 0) + v));
      d.lines.push(`+${pct(v)} poison resistance`);
    },
  },
  {
    id: 'sturdy', slots: ['shield'], word: 'Sturdy',
    apply: (d, q) => {
      const sh = d.def.shield!;
      const v = r2(0.06 + 0.1 * q);
      sh.stability = r2(Math.min(0.95, sh.stability + v));
      d.lines.push(`+${pct(v)} stability`);
    },
  },
  {
    id: 'absorbing', slots: ['shield'], word: 'Bulwark',
    ok: (d) => d.def.shield!.absorb < 1,
    apply: (d, q) => {
      const sh = d.def.shield!;
      const v = r2(Math.min(1 - sh.absorb, 0.05 + 0.1 * q));
      sh.absorb = r2(sh.absorb + v);
      d.lines.push(`+${pct(v)} block`);
    },
  },
];

/** the price of a cursed item */
const CURSES: Affix[] = [
  {
    id: 'heavy', slots: ['weapon', 'armor', 'shield'], word: 'Leaden',
    apply: (d) => {
      scaleWeight(d, 1.6);
      d.lines.push('Cursed: 60% heavier');
    },
  },
  {
    id: 'reckless', slots: ['weapon', 'armor', 'shield'], word: 'Reckless',
    apply: (d) => {
      d.mods.stamina = r2((d.mods.stamina ?? 0) - 0.3);
      d.lines.push('Cursed: −30% stamina regen');
    },
  },
  {
    id: 'brittle', slots: ['armor'], word: 'Brittle',
    apply: (d) => {
      d.def.armor!.defense = r2(d.def.armor!.defense - 0.12);
      d.lines.push('Cursed: −12% defense');
    },
  },
];

function scaleWeight(d: Draft, k: number) {
  if (d.def.armor) d.def.armor.weight = Math.max(0, Math.round(d.def.armor.weight * k * 10) / 10);
  else if (d.def.shield) d.def.shield.weight = Math.max(0, Math.round(d.def.shield.weight * k * 10) / 10);
  else d.mods.weightMul = r2((d.mods.weightMul ?? 1) * k);
}

const RELIC_NAMES = [
  'Grief', 'the Last Vow', 'Cinders', 'the Pale Choir', 'the Drowned', 'Hollow Mercy', 'the Ninth Bell',
  'Dust and Ember', 'the Unlit', 'Old Teeth', 'the Kneeling Saint', 'Ashfall',
];

// ------------------------------------------------------------------ rolling
export interface RolledItem {
  id: string;
  qty: number;
  /** freshly generated definition (null for a plain item) */
  def: ItemDef | null;
}

/** pick a base for this depth (optionally limited to one slot) */
function pickBase(rng: Rng, depth: number, slot?: Slot) {
  const ok = BASES.filter((b) => b.min <= depth && (!slot || b.slot === slot) && ITEMS[b.id]);
  // newer bases are likelier than the ones you have seen since floor 1
  return rng.weighted(ok.map((b) => [b, 1 + Math.max(0, 6 - (depth - b.min)) * 0.35] as const));
}

/** Roll a piece of gear. `label` makes the id unique and repeatable (floor seed + chest id, …). */
export function rollGear(rng: Rng, depth: number, label: string, opts: { tier?: number; base?: string; minRarity?: Rarity } = {}): RolledItem {
  const tier = opts.tier ?? 0;
  let rarity = rollRarity(rng, depth, tier);
  if (opts.minRarity === 'rare' && (rarity === 'common' || rarity === 'fine')) rarity = 'rare';
  if (opts.minRarity === 'relic') rarity = 'relic';
  const baseId = opts.base ?? pickBase(rng, depth).id;
  const base = ITEMS[baseId];
  if (rarity === 'common') return { id: baseId, qty: 1, def: null };
  const slot: Slot = base.kind === 'weapon' ? 'weapon' : base.kind === 'shield' ? 'shield' : 'armor';
  const def: ItemDef = {
    ...base,
    id: `g${hashSeed(label).toString(36)}`,
    base: base.base ?? base.id,
    rarity,
    armor: base.armor ? { ...base.armor } : undefined,
    shield: base.shield ? { ...base.shield } : undefined,
  };
  const d: Draft = { def, slot, mods: {}, lines: [], rng };
  const s = 1 + depth * 0.04;
  const pool = AFFIXES.filter((a) => a.slots.includes(slot));
  const picked: Affix[] = [];
  for (let i = 0; i < RARITY_AFFIXES[rarity]; i++) {
    const choices = pool.filter((a) => !picked.includes(a) && (!a.ok || a.ok(d)));
    if (!choices.length) break;
    const a = rng.pick(choices);
    picked.push(a);
    // cursed gear rolls its blessings hot
    a.apply(d, rarity === 'cursed' ? 1.25 : 0.5 + rng.next() * 0.5, s * (rarity === 'relic' ? 1.15 : 1));
  }
  if (rarity === 'cursed') {
    const curses = CURSES.filter((c) => c.slots.includes(slot));
    rng.pick(curses).apply(d, 1, s);
  }
  def.mods = d.mods;
  def.affixLines = d.lines;
  const word = picked[0]?.word;
  def.name =
    rarity === 'relic'
      ? `${base.name} of ${rng.pick(RELIC_NAMES)}`
      : rarity === 'cursed'
        ? `Cursed ${base.name}`
        : `${word ?? 'Fine'} ${base.name}`;
  def.desc = base.desc;
  def.value = Math.round((rarity === 'fine' ? 120 : rarity === 'rare' ? 300 : rarity === 'cursed' ? 260 : 700) * s);
  registerGenerated(def);
  return { id: def.id, qty: 1, def };
}

/** a chest's contents: gear (one or two pieces) plus a consumable or two */
export function rollChest(rng: Rng, depth: number, label: string, tier: number): RolledItem[] {
  const out: RolledItem[] = [rollGear(rng, depth, `${label}:g0`, { tier })];
  if (tier >= 1 || rng.chance(0.25)) out.push(rollGear(rng, depth, `${label}:g1`, { tier }));
  const n = tier >= 1 ? 2 : rng.int(0, 1);
  for (let i = 0; i < n; i++) out.push(rollConsumable(rng, depth));
  return out;
}

export function rollConsumable(rng: Rng, depth: number): RolledItem {
  const id = rng.weighted([
    ['bread', 5],
    ['ember_herb', 4],
    ['titanite', 4 + depth * 0.2],
    ['soul_lost_knight', 2],
    ['soul_nameless', depth >= 6 ? 1.5 : 0],
    ['return_ember', 1.5],
    ['flask_shard', depth >= 4 ? 0.35 : 0.1],
  ] as const);
  return { id, qty: id === 'bread' || id === 'titanite' ? rng.int(1, 2) : 1, def: null };
}

/** what an elite drops */
export function rollEliteDrop(rng: Rng, depth: number, label: string): RolledItem {
  return rng.chance(0.65) ? rollGear(rng, depth, label, { tier: 1 }) : rollConsumable(rng, depth);
}

/** a guardian's hoard: its own signature gear, rolled rare or better */
export function rollBossDrop(rng: Rng, depth: number, boss: string, label: string): RolledItem[] {
  const own = BOSS_DROPS[boss] ?? [];
  const out: RolledItem[] = [];
  if (own.length) out.push(rollGear(rng, depth, `${label}:sig`, { base: rng.pick(own), minRarity: 'rare', tier: 2 }));
  out.push(rollGear(rng, depth, `${label}:g`, { tier: 2, minRarity: 'rare' }));
  out.push({ id: 'titanite', qty: 2 + Math.floor(depth / 6), def: null });
  return out;
}

// ------------------------------------------------------------------ the registry of generated items
/** every generated definition we know about (saved with the profile) */
export const GENERATED: Record<string, ItemDef> = {};

export function registerGenerated(def: ItemDef) {
  GENERATED[def.id] = def;
  ITEMS[def.id] = def;
}

/** restore saved generated items into ITEMS */
export function loadGenerated(defs: Record<string, ItemDef> | undefined) {
  for (const k of Object.keys(GENERATED)) {
    delete ITEMS[k];
    delete GENERATED[k];
  }
  for (const def of Object.values(defs ?? {})) registerGenerated(def);
}

/** drop definitions nobody owns any more (keeps the save small) */
export function pruneGenerated(owned: Record<string, number>, keep: string[] = []) {
  for (const id of Object.keys(GENERATED)) {
    if (owned[id] || keep.includes(id)) continue;
    delete GENERATED[id];
    delete ITEMS[id];
  }
}
