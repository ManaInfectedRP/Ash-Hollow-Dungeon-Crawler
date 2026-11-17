# NPC voices – ElevenLabs prompts

Tre röster: **Hessa** (kvartermästaren i lägret), **Ser Corvin** (brunnens väktare) och **the Wandering Peddler**
(handlaren nere i djupet).

## Arbetsgång

1. **Voice Design** (Voices → Add a new voice → Voice Design): klistra in *Voice prompt*, och *Preview text*
   som provtext. Generera, välj den bästa av förslagen, spara rösten med namnet.
2. **Text to Speech** med modellen **Eleven v3**: klistra in en replik i taget. Taggarna i hakparenteser
   (`[sighs]`, `[chuckles]` …) styr framförandet i v3 och läses inte upp. Med en äldre modell: ta bort dem.
3. Inställningar: Stability *Natural* (eller ~45–55 %), Similarity ~75 %, Style 0–20 %. Generera 2–3 tagningar
   av varje replik och välj den bästa.
4. Ladda ner som MP3, 44.1 kHz. Döp filen exakt efter id:t i listan (t.ex. `hessa_return_long_01.mp3`) och lägg
   den i **`src/assets/vo/`**. Mer behövs inte: spelet hittar filerna själv när det byggs (`npm run dev` / push).
   Repliker utan fil är bara tysta, så du kan spela in några i taget.

## När spelas vad (`src/game/systems/Voice.ts`)

- **Dialogrutan**: varje replik i första mötet, "lore", "advice", "rules", "shrines" spelas när den visas
  (`<namn>_<nod>_<nr>`).
- **Hälsning** (när du pratar med någon du träffat förut) väljs efter vad som hänt sedan sist, i den här ordningen:
  guardian fälld (`hessa_guardian` / `corvin_waystone`) → du har dött (`died`) → nytt djupaste djup
  (`corvin_deepest`) → länge sedan (`hessa_return_long`: 3 nedstigningar utan att handla; `corvin_return_long`: 4
  nedstigningar) → full ryggsäck (`hessa_loot`, 70 % full) → annars `greet`. Saknas filen för den första går den
  vidare till nästa.
- **Handlarn i djupet**: `peddler_greet` första gången per nedstigning, sedan `peddler_again`.
- **Butiken**: `shop` när den öppnas (om ingen redan pratar), `buy` (ibland `buy_weapon` / `buy_ranged` för
  vapen), `poor` (för lite souls – knappen går att trycka på fast den är grå), `full`, `sell`, `pack` (ny ryggsäck).
- **Avsked**: `bye` när du lämnar dialogen eller butiken.
- **Mumlande**: `hessa_idle`, `corvin_idle` och `peddler_idle` – står du nära någon av dem utan att prata säger de något ibland (högst var 45:e sekund).

Korta "barks" (1–3 s) spelas när man öppnar/handlar; de längre replikerna (första mötet) kan spelas under
dialogrutan. Flera varianter per situation gör att det inte låter upprepat.

---

## Hessa, the Quartermaster

**Voice prompt**

> A woman in her late forties, quartermaster of a camp at the edge of a haunted forest. Low-to-medium pitch,
> slightly husky and weathered from years of smoke and cold nights by the fire. Dry, practical, a little
> sardonic, but warm underneath. Measured, unhurried pace. Light rural Northern English accent. Close, intimate
> recording, as if across a merchant's cart by a campfire. No music, no reverb.

**Preview text**

> Another one for the well. They all come to the well, sooner or later. Souls for goods, and I'll buy whatever
> you drag back up. Mind you come back up to sell it.

### First meeting (dialog)

| id | line |
|---|---|
| hessa_first_01 | Another one for the well. They all come to the well, sooner or later. |
| hessa_first_02 | I am Hessa. I keep the camp fed and the blades sharp. Souls for goods – and I'll buy whatever you drag back up. |
| hessa_first_03 | [serious] Take this ember. Crush it down there and the fire will pull you home, spoils and all. Use it before you are too greedy to. |

### Lore & advice (dialog)

| id | line |
|---|---|
| hessa_lore_01 | Nobody dug the Deep. It opened, the night the king burned. It goes down further than anyone has lived to measure. |
| hessa_lore_02 | It changes behind you. Every descent is a different maze – but the guardians are always waiting at the same depths. |
| hessa_advice_01 | Whatever you pick up down there is only borrowed until you bring it home. Die, and the Deep takes it back. |
| hessa_advice_02 | Heavy armour turns blades, but you will roll like a sack of stones. And reinforce that weapon – Titanite does more good in steel than in my pocket. |

### Greeting (opening her, normal)

| id | line |
|---|---|
| hessa_greet_01 | Back up, and still breathing. What will it be? |
| hessa_greet_02 | [warmly] There you are. Come to spend, or come to sell? |
| hessa_greet_03 | Mind the cart. What do you need? |
| hessa_greet_04 | [dryly] Still in one piece. Mostly. |

### Back after a long time (no trading for a while)

| id | line |
|---|---|
| hessa_return_long_01 | [teasing] Haven't traded with me in far too long. Thought the well had swallowed you whole. |
| hessa_return_long_02 | Well, look who remembered the way to my cart. |
| hessa_return_long_03 | [sighs] I'd started selling your share of the bread to the crows. |
| hessa_return_long_04 | You've been gone a while. The prices haven't. |

### Back after dying (lost the spoils)

| id | line |
|---|---|
| hessa_died_01 | [sympathetic] Came back empty-handed, did you? The Deep always takes its cut. |
| hessa_died_02 | [sighs] Told you. Borrowed, until you bring it home. |
| hessa_died_03 | Dust yourself off. The well will still be there. |

### Back with a full pack / lots of loot

| id | line |
|---|---|
| hessa_loot_01 | [impressed] Now that's a haul. Let's see what's worth anything. |
| hessa_loot_02 | You're dripping with spoils. Put it on the cart, I'll make you an honest price. Mostly honest. |
| hessa_loot_03 | [chuckles] Somebody down there is missing a lot of things. |

### Opening the shop

| id | line |
|---|---|
| hessa_shop_01 | Have a look. Everything here's been sharpened, mended or blessed. |
| hessa_shop_02 | Take your time. Just not too much of it. |
| hessa_shop_03 | Wares are on the cart. Souls go in the tin. |

### Buying

| id | line |
|---|---|
| hessa_buy_01 | Good choice. |
| hessa_buy_02 | That'll serve you better than it served me. |
| hessa_buy_03 | [pleased] Pleasure doing business. |
| hessa_buy_04 | Bring it back in one piece. Or bring yourself back, at least. |
| hessa_buy_weapon_01 | Swing it like you mean it. |
| hessa_buy_ranged_01 | Keep your distance with that one. Wish more of you did. |

### Not enough souls

| id | line |
|---|---|
| hessa_poor_01 | [flatly] That's not enough souls, love. |
| hessa_poor_02 | Come back when your purse is heavier than your boots. |
| hessa_poor_03 | I don't do credit. Not to people who climb down wells. |

### Selling to her

| id | line |
|---|---|
| hessa_sell_01 | I'll take it off your hands. |
| hessa_sell_02 | [considering] Hm. It's seen better days. So have we all. |
| hessa_sell_03 | Fair enough. Here's your souls. |

### Buying a bigger backpack

| id | line |
|---|---|
| hessa_pack_01 | A bigger pack. Now you can be greedy and slow. |
| hessa_pack_02 | [laughs] More room for spoils. Just remember who buys them. |

### Pack full (trying to buy)

| id | line |
|---|---|
| hessa_full_01 | Your pack's bursting. Sell me something first. |
| hessa_full_02 | Where would you even put it? |

### After a guardian is felled

| id | line |
|---|---|
| hessa_guardian_01 | [quietly] Word travels fast up the well. You felled one of them. |
| hessa_guardian_02 | A guardian down, and you're still standing. Drinks are on… well. Not me. |

### Goodbye

| id | line |
|---|---|
| hessa_bye_01 | Come back up. |
| hessa_bye_02 | Mind the dark. |
| hessa_bye_03 | [softly] Don't make me sell your things. |
| hessa_bye_04 | Safe climb. |

### Idle (when you stand near her without talking)

| id | line |
|---|---|
| hessa_idle_01 | [muttering] Three loaves, two herbs, one ember… and not a single honest customer. |
| hessa_idle_02 | [sighs, to herself] Fire needs more wood. Everything needs more something. |

---

## Ser Corvin, Keeper of the Well

**Voice prompt**

> An old knight in his sixties who has guarded a cursed well for decades. Deep, slow, gravelly bass voice, a
> little hoarse. Calm and solemn, with the weight of many funerals behind it. Speaks quietly, almost to himself,
> with long pauses. Grave and fatherly, not threatening. Old-fashioned English accent. Close recording in cold
> night air. No music, no reverb.

**Preview text**

> So you mean to go down. Listen, then, and you might come back up. The well is listening. It always is.

### First meeting (dialog)

| id | line |
|---|---|
| corvin_first_01 | So you mean to go down. [pause] Listen, then, and you might come back up. |
| corvin_first_02 | Every third floor, a guardian bars the way. Fell one, and a waystone wakes here at the well. You can start from below it next time. |
| corvin_first_03 | Past the guardian, two doors. One down, one home. Home keeps what you carry. Down keeps you carrying it. |
| corvin_first_04 | Fall, and your souls stay where you fell. Reach that depth again, and you can take them back. |

### Greeting

| id | line |
|---|---|
| corvin_greet_01 | [quietly] The well is listening. It always is. |
| corvin_greet_02 | You again. Good. Fewer come back than you'd think. |
| corvin_greet_03 | [slowly] Still the same face. The Deep hasn't taken it yet. |

### Back after dying

| id | line |
|---|---|
| corvin_died_01 | Your souls are still down there. Waiting. Go and fetch them. |
| corvin_died_02 | [sighs] The well gave you back. It doesn't always. |
| corvin_died_03 | Rest. Then go again. That is the only way. |

### Back after a long time

| id | line |
|---|---|
| corvin_return_long_01 | It's been a long while. I'd begun to count you among the lost. |
| corvin_return_long_02 | [gently] The fire missed you. So did I, I suppose. |

### Rules / reminder

| id | line |
|---|---|
| corvin_rules_01 | A guardian every third floor. Fell it, and its waystone wakes. Two doors after: down, or home. |
| corvin_rules_02 | Spoils are only yours once they are up here. Souls stay where you fall. |

### Shrines

| id | line |
|---|---|
| corvin_shrines_01 | Old altars, older than the Deep. Kneel, and one offers you a boon until you leave it. |
| corvin_shrines_02 | [low] Chests bound in gold hold better things. Things that glow and hunt in pairs guard them. Those are the worst of the lot. |

### A waystone has woken (after a guardian)

| id | line |
|---|---|
| corvin_waystone_01 | [quietly] I felt it. A new stone woke tonight. |
| corvin_waystone_02 | You went deeper than most. The well remembers. |
| corvin_waystone_03 | Another guardian fallen. [pause] There are always more below. |

### New deepest depth

| id | line |
|---|---|
| corvin_deepest_01 | Deeper than you've ever been. Don't let it go to your head. Heads roll easily down there. |

### Goodbye

| id | line |
|---|---|
| corvin_bye_01 | Go carefully. |
| corvin_bye_02 | [quietly] Come back up. |
| corvin_bye_03 | Remember the doors. |

### Idle (when you walk past him)

| id | line |
|---|---|
| corvin_idle_01 | [muttering] Cold tonight. Colder down there. |
| corvin_idle_02 | [to himself] Seven hundred and twelve. Seven hundred and thirteen… |

---

## A Wandering Peddler (down in the Deep)

**Voice prompt**

> A hunched old merchant who wanders a monster-filled dungeon alone. Middle-high pitch, nasal and a little
> wheezy, with a crackling, giggling, overly friendly tone that is slightly unsettling. Speaks quickly and
> conspiratorially, often half-whispering, with little cackles between words. Odd, unplaceable accent. Close
> recording, as if leaning in too close in a dark stone corridor. No music.

**Preview text**

> Heh heh. A customer, this far down! My wares change with every floor, as does the floor. Don't ask where I got
> them. Heh. Nobody ever asks twice.

### Greeting

| id | line |
|---|---|
| peddler_greet_01 | [chuckles] Heh. A customer, this far down. My wares change with every floor – as does the floor. |
| peddler_greet_02 | [whispers] Shh, shh. Come closer. Not too close. Heh. |
| peddler_greet_03 | Still alive! Good, good. The dead never buy anything. |
| peddler_greet_04 | [cackles] Oh, you again. Or someone wearing your face. Doesn't matter. Buying? |

### We meet again (several floors later)

| id | line |
|---|---|
| peddler_again_01 | Heh. Small world, small dungeon. Big prices. |
| peddler_again_02 | Followed me, did you? [giggles] Everyone does. |

### Opening the shop

| id | line |
|---|---|
| peddler_shop_01 | Look, look, but don't lick. |
| peddler_shop_02 | [whispers] Fresh from the floor below. Barely bloodied. |

### Buying

| id | line |
|---|---|
| peddler_buy_01 | [cackles] Yes, yes! Pleasure, pleasure. |
| peddler_buy_02 | Sold! No refunds. No returns. No… survivors? Heh, joking. |

### Not enough souls

| id | line |
|---|---|
| peddler_poor_01 | [tuts] No souls, no sale. Kill something. I'll wait. |
| peddler_poor_02 | Hmm. Your purse is as empty as these halls. |

### Pack full

| id | line |
|---|---|
| peddler_full_01 | No room in your sack! Drop something. Drop something I can sell back to you. Heh. |
| peddler_full_02 | [tuts] Your sack's bursting at the seams. Lighten it first. Heh. |

### Goodbye

| id | line |
|---|---|
| peddler_bye_01 | Go on, go on. Mind the stairs. They bite. |
| peddler_bye_02 | [giggles] See you on the next floor. Or under it. |

### Idle (when you stand near him without talking)

| id | line |
|---|---|
| peddler_idle_01 | [muttering] Buy something, buy something… the dark doesn't pay. Heh. |
| peddler_idle_02 | [whispers, to himself] Count the coins. Count the bones. Never the same number twice… |
