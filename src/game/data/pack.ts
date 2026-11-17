import { ITEMS } from './items';
import type { Equipped } from '../../stores/inventoryStore';

/**
 * The backpack. What you carry is limited, so a good descent ends with a walk home to sell.
 * - every piece of gear takes a slot (what you wear does not),
 * - consumables and materials take one slot per kind, however many you stack.
 */
export const BASE_SLOTS = 12;

export const BACKPACKS = [
  { name: 'Leather Satchel', slots: 16, price: 1200 },
  { name: "Delver's Pack", slots: 20, price: 3200 },
  { name: 'Ironbound Pack', slots: 24, price: 7500 },
  { name: 'Bottomless Haversack', slots: 28, price: 16000 },
] as const;

/** slots you have with this many upgrades bought */
export const packCapacity = (level: number) => (level <= 0 ? BASE_SLOTS : BACKPACKS[Math.min(level, BACKPACKS.length) - 1].slots);

const stacks = (id: string) => {
  const k = ITEMS[id]?.kind;
  return k === 'consumable' || k === 'material';
};

const worn = (equipped: Equipped) => new Set([equipped.weapon, equipped.shield, equipped.armor].filter(Boolean) as string[]);

export function usedSlots(items: Record<string, number>, equipped: Equipped) {
  const on = worn(equipped);
  let n = 0;
  for (const [id, qty] of Object.entries(items)) {
    if (qty <= 0 || !ITEMS[id]) continue;
    n += stacks(id) ? 1 : qty - (on.has(id) ? 1 : 0);
  }
  return n;
}

/** extra slots taking `qty` of `id` would need */
export function slotsNeeded(items: Record<string, number>, id: string, qty = 1) {
  if (stacks(id)) return items[id] ? 0 : 1;
  return qty;
}

export function hasRoom(items: Record<string, number>, equipped: Equipped, level: number, id: string, qty = 1) {
  return usedSlots(items, equipped) + slotsNeeded(items, id, qty) <= packCapacity(level);
}

/** what Hessa pays: rolled gear by its value, everything else by its kind */
export function sellPrice(id: string) {
  const def = ITEMS[id];
  if (!def) return 0;
  if (def.value) return Math.round(def.value * 0.6);
  if (id === 'titanite') return 150;
  if (id === 'return_ember') return 180;
  if (id === 'flask_shard') return 400;
  if (def.kind === 'consumable') return def.use?.souls ? Math.round(def.use.souls * 0.5) : 25;
  if (def.kind === 'material') return 40;
  return def.kind === 'armor' ? 180 : def.kind === 'shield' ? 120 : 150;
}
