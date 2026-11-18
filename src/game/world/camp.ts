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
  // grass across the clearing; a lake on either side (cols 0–4 and 79–83) in a dip in the ground, and the
  // shore is as far as you can go
  b.ground(0, 83, G);
  b.fill(0, G, 4, G + 1, '.');
  b.fill(79, G, 83, G + 1, '.');
  // a low rise for the well
  b.fill(57, G - 1, 69, G - 1);
  b.data.spawn = b.at(30, G);
  b.data.bonfires.push({ id: CAMP_FIRE, ...b.at(33, G) });
  b.data.npcs.push({ id: 'quartermaster', ...b.at(21, G) });
  b.data.npcs.push({ id: 'keeper', ...b.at(53, G) });
  b.door({ id: 'well', to: '__well', entry: '', look: 'well' }, 63, G - 1);

  const prop = b.prop.bind(b);
  // the lake shore and the forest's edge on the left
  prop('bush', 5, G);
  prop('pine', 7, G);
  prop('pine_small', 9, G);
  prop('fern', 10, G);
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
  // the forest closes in on the right, down to the lake
  prop('bush', 71, G);
  prop('pine', 72, G);
  prop('fern', 74, G);
  prop('pine_small', 75, G);
  prop('pine', 77, G);
  prop('bush', 78, G);
  for (const col of [6, 17, 31, 44, 55, 70, 76]) prop('grass', col, G);
  const level = b.build();
  const T16 = 16;
  level.water = [
    { x0: 0, x1: 5 * T16, y: G * T16 + 6 },
    { x0: 79 * T16, x1: 84 * T16, y: G * T16 + 6 },
  ];
  return level;
}
