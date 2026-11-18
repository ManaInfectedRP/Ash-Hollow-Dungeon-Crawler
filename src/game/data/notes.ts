/**
 * Documents scattered through the Deep: torn pages, letters, scholars' notes. Each floor may hold one or two,
 * picked from those you have not read yet (GameScene). They open in the dialogue window, read aloud by the
 * Teller (voice files `teller_<id>_<nn>`, see docs/VOICES.md).
 */
export interface NoteDef {
  id: string;
  title: string;
  /**
   * 'lore' (the world's story) and 'trivia' (odd facts) are pages lying on the floor; an 'inscription' is
   * carved into the plinth of a statue – verdicts and decrees of the burning king's court.
   */
  kind: 'lore' | 'trivia' | 'inscription';
  lines: string[];
}

export const NOTES: NoteDef[] = [
  // ------------------------------------------------------------------ lore
  {
    id: 'kingsfire', kind: 'lore', title: 'The Night the King Burned',
    lines: [
      'They say the king did not burn by accident. He lit the fire himself, in the great hall, and stood in it.',
      'By morning the castle was ash, and where the throne had been, the ground had opened.',
      'Nobody dug the Deep. It was simply there – a well with no bottom, breathing.',
    ],
  },
  {
    id: 'ashen_king', kind: 'lore', title: 'A Courtier\'s Last Page',
    lines: [
      'His Majesty no longer sleeps. He speaks to the fire, and the fire answers in his own voice.',
      'He has promised us a kingdom without end. I fear he means one without us in it.',
      'If this page is found: do not go down. Whatever wears the crown at the bottom is not the man we served.',
    ],
  },
  {
    id: 'warden', kind: 'lore', title: 'Orders of the Ashen Warden',
    lines: [
      'The Warden was the king\'s own guard. When the hall burned, he would not leave his post.',
      'He stands it still, three floors down, guarding a door to a king who no longer needs guarding.',
      'Strike when his blade is buried in the stone. He has always been slow to pull it free.',
    ],
  },
  {
    id: 'shepherd', kind: 'lore', title: 'The Shepherd\'s Flock',
    lines: [
      'Down in the ossuary, someone still tends the dead. He calls them his flock.',
      'Every bone that rises at his crook was a delver once. Some of them still wear our colours.',
    ],
  },
  {
    id: 'colossus', kind: 'lore', title: 'Notes on the Molten Deep',
    lines: [
      'Below the bones the rock grows warm, then soft, then bright. The air tastes of copper.',
      'Something enormous moves in the lava. When it rises, the floor itself begins to fall apart.',
      'Keep to the stone that has not cracked. Keep moving. Do not admire the light.',
    ],
  },
  {
    id: 'matriarch', kind: 'lore', title: 'A Letter Never Sent',
    lines: [
      'Mother – the halls down here are frozen solid, though the lava burns only a few floors above.',
      'There is a woman of ice who sings to the frost. Everything she touches stops.',
      'I am so cold. I will write again when my hands work. I love you.',
    ],
  },
  {
    id: 'mire', kind: 'lore', title: 'The Drowned Warrens',
    lines: [
      'The water down here is warm, and it moves when nothing should move it.',
      'The Mire Mother is not a beast. She is the bog itself, wearing a shape so she can watch us drown.',
    ],
  },
  {
    id: 'sphinx', kind: 'lore', title: 'Riddle Scratched in Sandstone',
    lines: [
      'What walks down on two legs, crawls back on four, and never comes up at all?',
      'A delver who did not answer the Sphinx in time.',
      'There is sand down here. Desert sand, a mile underground. Do not ask the Sphinx where it came from.',
    ],
  },
  {
    id: 'varro', kind: 'lore', title: 'Varro of the Pit',
    lines: [
      'Varro was the king\'s champion. Undefeated in two hundred bouts.',
      'When the Deep opened, he went down looking for a worthy opponent. He has been waiting in his pit ever since.',
      'The crowd that cheers him is long dead. He does not seem to have noticed.',
    ],
  },
  {
    id: 'leviathan', kind: 'lore', title: 'The Sky Beneath the Earth',
    lines: [
      'Past the pit, the Deep opens into a sky. Clouds, wind, the light of no sun.',
      'Something vast swims through it, singing. The planks shake when it passes.',
      'How there can be a sky below the ground, I cannot say. I only know I am afraid of falling up.',
    ],
  },
  {
    id: 'ayame', kind: 'lore', title: 'Ayame\'s Wedding',
    lines: [
      'She was to be married the morning after the king burned. She never took off the white.',
      'The Weeping Halls are hers now. Her guests are faceless, and they are still waiting for the groom.',
      'If you hear crying, do not answer. She will think you came for her.',
    ],
  },
  {
    id: 'waystones', kind: 'lore', title: 'Of Waystones',
    lines: [
      'When a guardian falls, a stone wakes at the well above. Nobody carved them; they were simply always there, asleep.',
      'Corvin says the well remembers every guardian killed. He says it as if that were a kindness.',
    ],
  },
  {
    id: 'shrines', kind: 'lore', title: 'The Old Altars',
    lines: [
      'The altars are older than the Deep. Older than the castle. Perhaps older than the king\'s whole line.',
      'Kneel and something grants you a boon. It never says what it wants in return.',
    ],
  },
  {
    id: 'delver', kind: 'lore', title: 'A Delver\'s Last Words',
    lines: [
      'Fourth day. Lost the stairs. The rooms keep moving when I am not looking at them.',
      'Should have crushed the ember while I could. Thought I could carry a little more.',
      'Tell Hessa she can keep my pack. She will anyway.',
    ],
  },
  // ------------------------------------------------------------------ trivia
  {
    id: 'hessa', kind: 'trivia', title: 'Page from Hessa\'s Ledger',
    lines: [
      'Bread: sixty souls. Herb: one hundred and fifty. Delvers sold back their own boots: four.',
      'Delvers who came back for the boots: none.',
      'Note to self – stop giving the new ones an ember for free. Keep doing it anyway.',
    ],
  },
  {
    id: 'corvin', kind: 'trivia', title: 'Corvin\'s Count',
    lines: [
      'A page of nothing but tally marks, in Ser Corvin\'s hand. Seven hundred and thirteen of them.',
      'At the bottom, underlined twice: the ones who came back up. The tally under it is very short.',
    ],
  },
  {
    id: 'peddler', kind: 'trivia', title: 'Who Is the Peddler?',
    lines: [
      'Three delvers swear they met the same peddler on the same night – on three different floors.',
      'He has never been seen going down the well. He has never been seen coming up.',
      'He does not seem to sleep, or eat. He does, however, very much like to haggle.',
    ],
  },
  {
    id: 'souls', kind: 'trivia', title: 'On Souls',
    lines: [
      'Everything the Deep kills leaves a little light behind. We call it souls, for want of a better word.',
      'Hessa takes them as coin. The fire takes them to make you stronger. Nobody asks whose they were.',
      'Die down there and your own light stays where you fell. Walk back to it, and it remembers you.',
    ],
  },
  {
    id: 'titanite', kind: 'trivia', title: 'A Smith\'s Note on Titanite',
    lines: [
      'Titanite is not mined. It grows, in the cold dark between floors, like frost on a window.',
      'Hammered into steel it makes the edge remember being sharp. Nobody knows why. Nobody has stopped to ask.',
    ],
  },
  {
    id: 'elites', kind: 'trivia', title: 'Things That Glow',
    lines: [
      'Some of the Deep\'s creatures shine. Burning, frozen, dripping venom, or drinking the life out of you.',
      'They hit harder and they guard the gold-bound chests. The glow is a warning. Treat it like one.',
    ],
  },
  {
    id: 'ember', kind: 'trivia', title: 'On the Return Ember',
    lines: [
      'Crush a return ember and the campfire pulls you home, spoils and all.',
      'More delvers have died with an ember in their pocket than without one. Greed is heavier than any armour.',
    ],
  },
  {
    id: 'slimes', kind: 'trivia', title: 'A Scholar on Slimes',
    lines: [
      'The slimes of the Deep have no mouth, no eyes and no bones, yet they always know where you are.',
      'They are, as far as I can tell, entirely stomach. I have decided to stop studying them up close.',
    ],
  },
  {
    id: 'wands', kind: 'trivia', title: 'On Wands, Bows and Bolts',
    lines: [
      'A crystal wand remembers the element it was cut from. Fire bounces. Frost and venom fly true.',
      'A bow asks for patience: the longer you draw, the further it flies. A crossbow asks only for a long reload.',
      'All of them ask for stamina. The Deep does not hand out free shots.',
    ],
  },
  {
    id: 'pack', kind: 'trivia', title: 'Packing List, Found in a Satchel',
    lines: [
      'Bread. Herbs. A spare blade. A whetstone. Rope. More bread.',
      'Crossed out at the bottom: "Room for loot". Underneath, in a shakier hand: "Should have bought the bigger pack."',
    ],
  },
];

/** carved into statues: the court's verdicts and decrees, from before and after the king burned */
export const INSCRIPTIONS: NoteDef[] = [
  {
    id: 'verdict_warden', kind: 'inscription', title: 'Verdict upon the Captain of the Guard',
    lines: [
      'We, the Ashen Court, find you, Aldric Vane, Captain of the Royal Guard, guilty of the following failings before the Crown:',
      'Hesitating at the King\'s Command',
      'Pleading for the Lives of the Court',
      'Lowering a Blade the Throne Had Raised',
      'For these failings I do sentence Aldric Vane to stand his post for ever, unrelieved and unrewarded, until the last door he guards has crumbled to dust. Let his loyalty be his chain.',
      '– Chancellor Ysolde Marr, Voice of the Burning Throne',
    ],
  },
  {
    id: 'verdict_varro', kind: 'inscription', title: 'Verdict upon the Champion of the Pit',
    lines: [
      'We, the Ashen Court, find you, Varro Castellan, Champion of the Royal Pit, guilty of the following offences against the Crown:',
      'Refusing to Kneel Before the Flame',
      'Sparing a Foe the King Had Condemned',
      'Winning a Wager Against His Majesty',
      'For these offences I do sentence Varro Castellan to fight in the Pit until a worthy opponent ends him. As none is worthy, may he fight for ever, and may the crowd never tire of him.',
      '– Pitmaster Odran Kell, Keeper of the Royal Games',
    ],
  },
  {
    id: 'verdict_ayame', kind: 'inscription', title: 'Verdict upon the Bride of the East',
    lines: [
      'We, the Ashen Court, find you, Ayame of the Eastern Houses, betrothed to the Crown, guilty of the following transgressions:',
      'Refusing the Hand Offered by the Throne',
      'Weeping in the Presence of the King',
      'Hiding the Prince from the Cleansing Fire',
      'For these transgressions I do sentence Ayame to wed the Deep itself. Let her veil be her shroud, and let her wedding never end.',
      '– High Matron Seraphine Dole, Keeper of the Royal Rites',
    ],
  },
  {
    id: 'decree_well', kind: 'inscription', title: 'Decree of the Burning Throne',
    lines: [
      'By order of the Burning Throne, let it be known to every subject of the realm:',
      'The Well is the King\'s.',
      'What lies below is the King\'s.',
      'Those who descend belong to the King.',
      'Any who return from below shall be counted among the dead, and their names struck from every ledger. Let no one mourn them. Let no one wait for them.',
      '– Steward Malric Oss, by the hand of His Majesty, the night of the Fire',
    ],
  },
  {
    id: 'memorial_corvin', kind: 'inscription', title: 'Memorial at the Well',
    lines: [
      'Raised by the survivors of the Fire, in defiance of the Steward\'s decree.',
      'To those who went down,',
      'and to those who waited,',
      'and to the one who still does.',
      'Their names were struck from the ledgers. They are carved here instead, so that someone remembers. Forgive us that the stone is running out of room.',
      '– The camp at the edge of the forest',
    ],
  },
];

export const NOTE_BY_ID: Record<string, NoteDef> = Object.fromEntries([...NOTES, ...INSCRIPTIONS].map((n) => [n.id, n]));
