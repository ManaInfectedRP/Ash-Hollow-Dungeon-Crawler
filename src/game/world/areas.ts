import type { LevelData } from './builder';
import { buildCamp } from './camp';

/** Hand-made areas by id. Dungeon floors (area 'deep') are generated – see dungeon/generate.ts. */
export const AREAS: Record<string, () => LevelData> = {
  camp: buildCamp,
};

export const START_AREA = 'camp';
export const DEEP_AREA = 'deep';
