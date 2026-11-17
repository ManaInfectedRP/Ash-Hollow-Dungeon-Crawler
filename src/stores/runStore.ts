import { create } from 'zustand';
import type { ItemDef, ItemMods } from '../game/data/items';
import type { RoomMeta } from '../game/dungeon/types';

/** a shrine's boon (or a pact's price), active for the rest of the run */
export interface Buff {
  id: string;
  name: string;
  desc: string;
  mods: ItemMods & { defense?: number };
}

export interface ShopItem {
  item: string;
  price: number;
}

export interface Run {
  seed: number;
  /** the floor you are on */
  depth: number;
  /** the waystone it started from */
  startDepth: number;
  /** everything picked up during the run: lost if you die down there */
  atRisk: Record<string, number>;
  buffs: Buff[];
  kills: number;
  /** a wandering merchant's stock per floor ('f<depth>') */
  shops: Record<string, ShopItem[]>;
}

export interface Meta {
  /** floors a run can start from (1 and the floor after every guardian you felled) */
  waystones: number[];
  deepest: number;
  runs: number;
  deaths: number;
  /** souls left where you fell: back on that depth (any run) you can take them back */
  stain: { depth: number; souls: number } | null;
  bossesFelled: number;
  /** backpack upgrades bought from Hessa (see data/pack.ts) */
  pack: number;
}

export interface RunSummary {
  kind: 'died' | 'returned';
  depth: number;
  kills: number;
  /** what was kept or lost (a copy of each definition: lost gear is forgotten by the registry) */
  items: { id: string; n: number; def: ItemDef }[];
  souls: number;
}

export interface MapState {
  depth: number;
  title: string;
  boss: boolean;
  gw: number;
  gh: number;
  rooms: RoomMeta[];
  explored: string[];
  here: string;
}

export interface RunStore {
  run: Run | null;
  meta: Meta;
  map: MapState | null;
  summary: RunSummary | null;
}

export const freshMeta = (): Meta => ({ waystones: [1], deepest: 0, runs: 0, deaths: 0, stain: null, bossesFelled: 0, pack: 0 });

export const useRunStore = create<RunStore>(() => ({
  run: null,
  meta: freshMeta(),
  map: null,
  summary: null,
}));

/** sum of every active buff */
export function buffMods(): ItemMods & { defense?: number } {
  const out: ItemMods & { defense?: number } = {};
  for (const b of useRunStore.getState().run?.buffs ?? []) {
    for (const [k, v] of Object.entries(b.mods) as [keyof typeof out, number][]) out[k] = (out[k] ?? 0) + v;
  }
  return out;
}

/** remember that an item came from the Deep (it is lost if you die before you get it home) */
export function markAtRisk(id: string, qty: number) {
  const run = useRunStore.getState().run;
  if (!run) return;
  useRunStore.setState({ run: { ...run, atRisk: { ...run.atRisk, [id]: (run.atRisk[id] ?? 0) + qty } } });
}

export const BOONS: Buff[] = [
  { id: 'might', name: 'Boon of Might', desc: '+15% damage', mods: { dmg: 0.15 } },
  { id: 'vigil', name: 'Boon of Vigil', desc: '+35% stamina regen', mods: { stamina: 0.35 } },
  { id: 'thirst', name: 'Boon of Thirst', desc: 'Heal 3 HP per hit', mods: { lifeOnHit: 3 } },
  { id: 'avarice', name: 'Boon of Avarice', desc: '+40% souls from kills', mods: { souls: 0.4 } },
  { id: 'aegis', name: 'Boon of the Aegis', desc: '+8% defense', mods: { defense: 0.08 } },
  { id: 'feather', name: 'Boon of the Feather', desc: 'Your weapon is 40% lighter', mods: { weightMul: -0.4 } },
];
