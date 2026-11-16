import { ITEMS, NAKED, type ArmorDef, type ItemMods, type ShieldDef } from '../data/items';
import { WEAPONS, type Element, type Weapon } from './attacks';
import { maxLoadFor, usePlayerStore, type Stats } from '../../stores/playerStore';
import { useInventoryStore, type Equipped } from '../../stores/inventoryStore';
import { buffMods } from '../../stores/runStore';

export type RollClass = 'light' | 'medium' | 'heavy';

export interface EquipStats {
  weapon: Weapon;
  weaponItem: string | null;
  armor: ArmorDef;
  /** what blocks: the equipped shield, or the weapon's own guard when it holds the off hand */
  shield: ShieldDef | null;
  /** equipped shield item (null while a two-handed / dual weapon holds the off hand) */
  shieldItem: string | null;
  hands: 1 | 2 | 'dual';
  element: { type: Element; power: number } | null;
  /** fraction of fire damage removed by the armor */
  fireRes: number;
  /** fraction of frost / poison build-up removed by the armor */
  frostRes: number;
  poisonRes: number;
  /** slow falls on a little cloud (White Cloak) */
  float: boolean;
  upgrade: number;
  dmgMul: number;
  /** attack rating shown in menus (first light attack) */
  ar: number;
  defense: number;
  poise: number;
  load: number;
  maxLoad: number;
  roll: RollClass;
  /** summed affix + boon bonuses */
  lifeOnHit: number;
  /** stamina regen multiplier (1 = normal) */
  staminaRegen: number;
  /** souls-from-kills multiplier */
  soulGain: number;
}

type Buffs = ItemMods & { defense?: number };

/** Pure: usable from React (with hook values) and Phaser (with getState()). */
export function computeEquip(stats: Stats, equipped: Equipped, upgrades: Record<string, number>, buffs: Buffs = {}): EquipStats {
  const wItem = equipped.weapon ? ITEMS[equipped.weapon] : null;
  const aItem = equipped.armor ? ITEMS[equipped.armor] : null;
  const worn = [wItem, aItem];
  const weapon = WEAPONS[wItem?.weapon ?? 'fists'] ?? WEAPONS.fists;
  const armor = (equipped.armor && ITEMS[equipped.armor]?.armor) || NAKED;
  // a two-handed or dual weapon takes the off hand: the shield stays on your back (no weight, no block)
  const hands = weapon.hands ?? 1;
  const shieldItem = hands === 1 ? equipped.shield ?? null : null;
  const shield: ShieldDef | null =
    hands === 1 ? (shieldItem && ITEMS[shieldItem]?.shield) || null : weapon.guard ? { ...weapon.guard, weight: 0 } : null;
  if (hands === 1 && shieldItem) worn.push(ITEMS[shieldItem]);
  const sum = (k: keyof ItemMods) => worn.reduce((n, it) => n + (it?.mods?.[k] ?? 0), 0) + (buffs[k] ?? 0);
  const upgrade = equipped.weapon ? upgrades[equipped.weapon] ?? 0 : 0;
  const dmgMul =
    (1 +
      weapon.scaling.str * (stats.strength - 10) * 0.05 +
      weapon.scaling.dex * (stats.dexterity - 10) * 0.05 +
      upgrade * 0.1) *
    (1 + sum('dmg'));
  const weaponWeight = weapon.weight * (wItem?.mods?.weightMul ?? 1) * Math.max(0.2, 1 + (buffs.weightMul ?? 0));
  const load = Math.round((weaponWeight + armor.weight + (shield?.weight ?? 0)) * 10) / 10;
  const maxLoad = maxLoadFor(stats);
  const ratio = load / maxLoad;
  return {
    weapon,
    weaponItem: equipped.weapon,
    armor,
    shield,
    shieldItem,
    hands,
    element: wItem?.element ?? weapon.element ?? null,
    fireRes: armor.fireRes ?? 0,
    frostRes: armor.frostRes ?? 0,
    poisonRes: armor.poisonRes ?? 0,
    float: !!armor.float,
    upgrade,
    dmgMul,
    ar: Math.round(weapon.light[0].damage * dmgMul),
    defense: Math.max(-0.5, Math.min(0.8, armor.defense + (buffs.defense ?? 0))),
    poise: armor.poise,
    load,
    maxLoad,
    roll: ratio <= 0.3 ? 'light' : ratio <= 0.7 ? 'medium' : 'heavy',
    lifeOnHit: sum('lifeOnHit'),
    staminaRegen: Math.max(0.3, 1 + sum('stamina')),
    soulGain: 1 + sum('souls'),
  };
}

export function equipStats() {
  const inv = useInventoryStore.getState();
  return computeEquip(usePlayerStore.getState().stats, inv.equipped, inv.upgrades, buffMods());
}
