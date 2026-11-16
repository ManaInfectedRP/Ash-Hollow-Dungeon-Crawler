import { Builder, type LevelData } from './builder';

/**
 * The Last Camp – the hub above the Deep. A bonfire (level up, reinforce), the quartermaster (wares,
 * buys your spoils), the keeper of the well (who explains the rules), and the well itself: the way down,
 * to the first floor or to any waystone you have earned.
 */
export const CAMP_FIRE = 'camp-fire';

export function buildCamp(): LevelData {
  const b = new Builder(76, 26, 'camp', 'The Last Camp', 'outdoor');
  b.fill(0, 0, 1, 25);
  b.fill(74, 0, 75, 25);
  b.ground(0, 75, 19);
  // a ruined wall and steps on the left, the well's broken chapel on the right
  b.fill(2, 15, 6, 18);
  b.fill(7, 17, 9, 18);
  b.fill(58, 18, 73, 18);
  b.fill(64, 12, 73, 12);
  b.fill(72, 12, 73, 17);
  b.data.spawn = b.at(30, 19);
  b.data.bonfires.push({ id: CAMP_FIRE, ...b.at(32, 19) });
  b.data.npcs.push({ id: 'quartermaster', ...b.at(20, 19) });
  b.data.npcs.push({ id: 'keeper', ...b.at(54, 19) });
  b.door({ id: 'well', to: '__well', entry: '' }, 66, 18);

  const prop = b.prop.bind(b);
  prop('tombstone', 12, 19);
  prop('tombstone_cracked', 15, 19);
  prop('torch', 24, 19, { light: true });
  prop('barrel', 17, 19);
  prop('crate', 18, 19);
  prop('banner', 4, 13);
  prop('torch', 40, 19, { light: true });
  prop('skull', 45, 19);
  prop('tombstone', 48, 19);
  prop('torch', 61, 18, { light: true });
  prop('chain', 66, 13, { hang: true });
  prop('candle', 69, 18, { light: true });
  prop('candle', 63, 18, { light: true });
  prop('gargoyle', 71, 18);
  return b.build();
}
