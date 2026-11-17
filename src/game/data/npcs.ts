/**
 * NPCs and their dialogue. Pure data, used by React (Dialogue/Shop UI) and Phaser (spawning).
 *
 * A dialogue is a small graph of nodes. A choice can jump to another node, open the shop,
 * give items, set a world flag, or end the conversation. `start(flags)` picks the entry node,
 * so NPCs remember you through world flags (saved with the game).
 */

export type DialogueAction =
  | { type: 'goto'; node: string }
  | { type: 'shop' }
  | { type: 'end' };

export interface DialogueChoice {
  label: string;
  action: DialogueAction;
}

export interface DialogueNode {
  lines: string[];
  /** world flag set when this node is shown */
  sets?: string;
  /** items given once when this node is shown (guarded by `sets`) */
  gives?: { item: string; qty: number }[];
  choices?: DialogueChoice[];
}

export interface ShopEntry {
  item: string;
  price: number;
}

export interface NpcDef {
  id: string;
  name: string;
  /** spritesheet key (tools/sprites) */
  sheet: string;
  start: (flags: Record<string, boolean>) => string;
  nodes: Record<string, DialogueNode>;
  shop?: ShopEntry[];
}

const end = (label = 'Farewell'): DialogueChoice => ({ label, action: { type: 'end' } });
const goto = (label: string, node: string): DialogueChoice => ({ label, action: { type: 'goto', node } });
const wares: DialogueChoice = { label: 'Show me your wares', action: { type: 'shop' } };

export const NPCS: Record<string, NpcDef> = {
  quartermaster: {
    id: 'quartermaster',
    name: 'Hessa, the Quartermaster',
    sheet: 'npc-merchant',
    start: (f) => (f.qm_met ? 'again' : 'first'),
    nodes: {
      first: {
        sets: 'qm_met',
        gives: [{ item: 'return_ember', qty: 1 }],
        lines: [
          'Another one for the well. They all come to the well, sooner or later.',
          "I am Hessa. I keep the camp fed and the blades sharp. Souls for goods – and I'll buy whatever you drag back up.",
          'Take this ember. Crush it down there and the fire will pull you home, spoils and all. Use it before you are too greedy to.',
        ],
        choices: [wares, goto('Tell me about the Deep', 'lore'), end()],
      },
      again: {
        lines: ['Back up, and still breathing. What will it be?'],
        choices: [wares, goto('Any advice?', 'advice'), end()],
      },
      lore: {
        lines: [
          'Nobody dug the Deep. It opened, the night the king burned. It goes down further than anyone has lived to measure.',
          'It changes behind you. Every descent is a different maze – but the guardians are always waiting at the same depths.',
        ],
        choices: [wares, end()],
      },
      advice: {
        lines: [
          'Whatever you pick up down there is only borrowed until you bring it home. Die, and the Deep takes it back.',
          'Heavy armour turns blades, but you will roll like a sack of stones. And reinforce that weapon – Titanite does more good in steel than in my pocket.',
        ],
        choices: [wares, end()],
      },
    },
    shop: [
      { item: 'bread', price: 60 },
      { item: 'ember_herb', price: 150 },
      { item: 'return_ember', price: 600 },
      { item: 'titanite', price: 500 },
      { item: 'shortsword', price: 400 },
      { item: 'longsword', price: 900 },
      { item: 'rapier', price: 900 },
      { item: 'twin_daggers', price: 1200 },
      { item: 'fire_wand', price: 1400 },
      { item: 'frost_wand', price: 1400 },
      { item: 'poison_wand', price: 1400 },
      { item: 'buckler', price: 450 },
      { item: 'kite_shield', price: 1100 },
      { item: 'hunter_leathers', price: 1500 },
      { item: 'knight_armor', price: 2600 },
    ],
  },

  keeper: {
    id: 'keeper',
    name: 'Ser Corvin, Keeper of the Well',
    sheet: 'npc-corvin',
    start: (f) => (f.keeper_met ? 'again' : 'first'),
    nodes: {
      first: {
        sets: 'keeper_met',
        gives: [{ item: 'ember_herb', qty: 2 }],
        lines: [
          'So you mean to go down. Listen, then, and you might come back up.',
          'Every third floor, a guardian bars the way. Fell one and a waystone wakes here at the well – you can start from below it next time.',
          'Past the guardian, two doors: one down, one home. Home keeps what you carry. Down keeps you carrying it.',
          'Fall, and your souls stay where you fell. Reach that depth again – any descent – and you can take them back.',
        ],
        choices: [goto('And the shrines?', 'shrines'), end('I will remember')],
      },
      again: {
        lines: ['The well is listening. It always is.'],
        choices: [goto('Remind me how it works', 'rules'), goto('And the shrines?', 'shrines'), end('Farewell')],
      },
      rules: {
        lines: [
          'A guardian every third floor. Fell it and its waystone wakes. Two doors after: down, or home.',
          'Spoils are only yours once they are up here. Souls stay where you fall.',
        ],
        choices: [end('Farewell')],
      },
      shrines: {
        lines: [
          'Old altars, older than the Deep. Kneel and one offers you a boon until you leave the Deep.',
          'Chests bound in gold hold better things. Things that glow and hunt in pairs guard them – those are the worst of the lot.',
        ],
        choices: [end('Farewell')],
      },
    },
  },

  wanderer: {
    id: 'wanderer',
    name: 'A Wandering Peddler',
    sheet: 'npc-merchant',
    start: () => 'hello',
    nodes: {
      hello: {
        lines: ['Heh. A customer, this far down. My wares change with every floor – as does the floor.'],
        choices: [wares, end()],
      },
    },
    // stock is rolled per floor (GameScene → runStore.run.shops)
    shop: [],
  },
};
