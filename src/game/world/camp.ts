import { Builder, type LevelData } from './builder';

/**
 * The Last Camp – a clearing in a night forest, above the Deep. A campfire (level up, reinforce) with logs
 * to sit on, Hessa by her cart (wares, buys your spoils, bigger packs), Corvin by the well (the rules), and
 * the well itself on its little rise: the way down, to the first floor or any waystone you have earned.
 */
export const CAMP_FIRE = 'camp-fire';

export function buildCamp(): LevelData {
  const G = 17; // ground surface row
  const b = new Builder(84, 20, 'camp', 'The Last Camp', 'forest');
  // grass all the way across; the world's edges hold you in (no walls to see)
  b.ground(0, 83, G);
  // a low rise for the well
  b.fill(57, G - 1, 69, G - 1);
  b.data.spawn = b.at(30, G);
  b.data.bonfires.push({ id: CAMP_FIRE, ...b.at(33, G) });
  b.data.npcs.push({ id: 'quartermaster', ...b.at(21, G) });
  b.data.npcs.push({ id: 'keeper', ...b.at(53, G) });
  b.door({ id: 'well', to: '__well', entry: '', look: 'well' }, 63, G - 1);

  const prop = b.prop.bind(b);
  // the forest's edge on the left
  prop('pine', 1, G);
  prop('pine_small', 4, G);
  prop('pine', 7, G);
  prop('bush', 3, G);
  prop('fern', 9, G);
  // the tent, a torch, Hessa's cart
  prop('tent', 12, G);
  prop('torch', 15, G, { light: true });
  prop('cart', 18, G);
  prop('stump', 24, G);
  // around the fire: logs to sit on
  prop('log', 28, G);
  prop('log', 38, G);
  prop('grass', 26, G);
  prop('flowers', 35, G);
  prop('grass', 41, G);
  // the path to the well
  prop('pine_small', 46, G);
  prop('fern', 49, G);
  prop('grass', 51, G);
  prop('torch', 56, G, { light: true });
  prop('stump', 59, G - 1);
  prop('flowers', 67, G - 1);
  prop('candle', 61, G - 1, { light: true });
  prop('candle', 65, G - 1, { light: true });
  // the forest closes in on the right
  prop('bush', 71, G);
  prop('pine', 72, G);
  prop('pine_small', 76, G);
  prop('pine', 79, G);
  prop('fern', 74, G);
  prop('pine', 83, G);
  for (const col of [6, 17, 31, 44, 55, 70, 78]) prop('grass', col, G);
  return b.build();
}
