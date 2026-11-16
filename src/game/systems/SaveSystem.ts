import { BASE_STATS, type Stats, usePlayerStore } from '../../stores/playerStore';
import { STARTING_INVENTORY, useInventoryStore, type Equipped } from '../../stores/inventoryStore';
import { freshMeta, useRunStore, type Meta, type Run } from '../../stores/runStore';
import type { ItemDef } from '../data/items';
import { GENERATED, loadGenerated, pruneGenerated } from '../dungeon/loot';

const KEY = 'ash-hollow-deep-save-v1';

export interface WorldState {
  lit: string[];
  lastBonfire: string | null;
  /** area of the last bonfire (where you respawn) */
  lastArea: string | null;
  bloodstain: { area: string; x: number; y: number; souls: number } | null;
  bossDefeated: boolean;
  /** world item pickups taken (ids are per floor: cleared when a run ends) */
  items: string[];
  /** progress flags: NPC conversations (kept), and `run:` flags – chests, guardians – cleared with each run */
  flags: Record<string, boolean>;
}

interface SaveData extends WorldState {
  v: 1;
  souls: number;
  level: number;
  stats: Stats;
  maxFlasks: number;
  inv?: { items: Record<string, number>; equipped: Equipped; upgrades: Record<string, number> };
  /** rolled dungeon gear */
  generated?: Record<string, ItemDef>;
  meta?: Meta;
  run?: Run | null;
}

export function freshWorld(): WorldState {
  return { lit: [], lastBonfire: null, lastArea: null, bloodstain: null, bossDefeated: false, items: [], flags: {} };
}

/** forget everything that belongs to one descent (picked-up items, opened chests, felled guardians) */
export function clearRunWorld(world: WorldState) {
  world.items = [];
  for (const k of Object.keys(world.flags)) if (k.startsWith('run:')) delete world.flags[k];
  world.lit = world.lit.filter((id) => !id.startsWith('f'));
}

/** Loads progression into the stores and returns the world state. */
export function loadGame(): WorldState {
  try {
    const raw = localStorage.getItem(KEY);
    // always start from a clean character: "Start Over" must not keep the old character's souls, level,
    // stats or flasks (the stores outlive the scene)
    useInventoryStore.setState(STARTING_INVENTORY());
    usePlayerStore.setState({ souls: 0, level: 1, stats: { ...BASE_STATS }, maxFlasks: 3, flasks: 3 });
    useRunStore.setState({ run: null, meta: freshMeta(), map: null, summary: null });
    loadGenerated({});
    if (!raw) return freshWorld();
    const d = JSON.parse(raw) as SaveData;
    if (d.v !== 1) return freshWorld();
    loadGenerated(d.generated);
    usePlayerStore.setState({
      souls: d.souls ?? 0,
      level: d.level ?? 1,
      stats: { ...BASE_STATS, ...d.stats },
      maxFlasks: d.maxFlasks ?? 3,
      flasks: d.maxFlasks ?? 3,
    });
    if (d.inv) useInventoryStore.setState({ items: { ...d.inv.items }, equipped: { ...d.inv.equipped }, upgrades: d.inv.upgrades ?? {} });
    useRunStore.setState({ meta: { ...freshMeta(), ...d.meta }, run: d.run ?? null });
    const w = freshWorld();
    return {
      lit: d.lit ?? w.lit,
      lastBonfire: d.lastBonfire ?? w.lastBonfire,
      lastArea: d.lastArea ?? w.lastArea,
      bloodstain: null,
      flags: d.flags ?? w.flags,
      bossDefeated: false,
      items: d.items ?? w.items,
    };
  } catch {
    return freshWorld();
  }
}

export function saveGame(world: WorldState) {
  const p = usePlayerStore.getState();
  const inv = useInventoryStore.getState();
  const rs = useRunStore.getState();
  // back at camp, generated gear nobody holds any more (sold, lost) is forgotten. (Never mid-run: loot
  // can lie on the floor or sit in a merchant's stock.)
  if (!rs.run) pruneGenerated(inv.items);
  const data: SaveData = {
    v: 1,
    souls: p.souls,
    level: p.level,
    stats: p.stats,
    maxFlasks: p.maxFlasks,
    inv: { items: inv.items, equipped: inv.equipped, upgrades: inv.upgrades },
    generated: { ...GENERATED },
    meta: rs.meta,
    run: rs.run,
    ...world,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable (private mode) – progress just isn't persisted */
  }
}

export function hasSave() {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

export function wipeSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
