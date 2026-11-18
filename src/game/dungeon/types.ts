/** Shared shapes for generated floors. Pure data: used by the generator, Phaser and React. */

export type Side = 'L' | 'R' | 'U' | 'D';

export type RoomKind =
  | 'start' | 'stairs' | 'combat' | 'treasure' | 'rest' | 'merchant' | 'shrine' | 'vault'
  | 'antechamber' | 'arena';

export interface RoomMeta {
  /** grid cell */
  gx: number;
  gy: number;
  kind: RoomKind;
  exits: Side[];
  /** template that built it (debugging) */
  template: string;
}

export interface ChestDef {
  id: string;
  x: number;
  y: number;
  /** 0 = plain, 1 = ornate (better loot), 2 = boss hoard */
  tier: number;
}

export interface ShrineDef {
  id: string;
  x: number;
  y: number;
}

export interface FloorMeta {
  depth: number;
  seed: number;
  boss: boolean;
  /** the band's name, for the banner */
  title: string;
  /** grid in cells and cell size in tiles (minimap) */
  gw: number;
  gh: number;
  cellW: number;
  cellH: number;
  rooms: RoomMeta[];
  chests: ChestDef[];
  shrines: ShrineDef[];
  /** spots where a document lies (which one is picked when the floor is built, from those you haven't read) */
  notes: { id: string; x: number; y: number; look: 'page' | 'statue' }[];
  /** where a bloodstain left on this depth lies (feet position) */
  stainSpot: { x: number; y: number };
  /** the stairs down (feet position), for the debug overlay and the validator */
  stairs: { x: number; y: number } | null;
}
