import { create } from 'zustand';
import type { Buff } from './runStore';
import type { ItemDef } from '../game/data/items';

export type BannerTone = 'gold' | 'red' | 'white';
export interface Banner {
  text: string;
  sub?: string;
  tone: BannerTone;
  id: number;
}

export interface GameStore {
  paused: boolean;
  dead: boolean;
  restOpen: boolean;
  invOpen: boolean;
  /** open conversation: npc id + current node */
  dialogue: { npc: string; node: string } | null;
  /** a document being read (data/notes.ts id) */
  note: string | null;
  /** npc id whose shop is open */
  shop: string | null;
  prompt: string | null;
  boss: { name: string; hp: number; maxHp: number } | null;
  banner: Banner | null;
  toast: { text: string; id: number } | null;
  hurtFlash: number;
  showTouch: boolean;
  /** screen shake on hits (option) */
  shake: boolean;
  /** 'boot' while assets load, 'title' while the main menu is up */
  menu: 'boot' | 'title' | null;
  /** the pre-release ending card (unused in the Deep) */
  ending: boolean;
  /** the well's waystone menu is open */
  well: boolean;
  /** a shrine offering its boons */
  shrine: { id: string; options: Buff[] } | null;
  /** the full map is open */
  mapOpen: boolean;
  /** rolled gear just picked up (the loot card) */
  loot: { def: ItemDef; id: number } | null;
  showBanner: (text: string, tone?: BannerTone, sub?: string) => void;
  showToast: (text: string) => void;
  showLoot: (def: ItemDef) => void;
}

let seq = 1;
const SETTINGS_KEY = 'ash-hollow-deep-settings';
const saved: { showTouch?: boolean; shake?: boolean } = (() => {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
  } catch {
    return {};
  }
})();
const isTouch =
  typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);

export const useGameStore = create<GameStore>((set) => ({
  paused: false,
  dead: false,
  restOpen: false,
  invOpen: false,
  dialogue: null,
  note: null,
  shop: null,
  prompt: null,
  boss: null,
  banner: null,
  toast: null,
  hurtFlash: 0,
  showTouch: saved.showTouch ?? isTouch,
  shake: saved.shake ?? true,
  menu: 'boot',
  ending: false,
  well: false,
  shrine: null,
  mapOpen: false,
  loot: null,
  showBanner: (text, tone = 'gold', sub) => set({ banner: { text, tone, sub, id: seq++ } }),
  showToast: (text) => set({ toast: { text, id: seq++ } }),
  showLoot: (def) => set({ loot: { def: { ...def }, id: seq++ } }),
}));

// persist the player's options
useGameStore.subscribe((s, prev) => {
  if (s.showTouch === prev.showTouch && s.shake === prev.shake) return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ showTouch: s.showTouch, shake: s.shake }));
  } catch {
    /* ignore */
  }
});
