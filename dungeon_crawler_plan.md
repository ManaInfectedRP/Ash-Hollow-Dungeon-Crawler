# Ash & Hollow – Dungeon Crawler-plan

> Mål: bygga ut Ash & Hollow med ett **dungeon crawler-läge** – procedurgenererade, allt djupare
> våningar med slumpad loot, elitfiender och bossar – utan att kasta bort det som redan funkar:
> souls-striden, de 17 fiendetyperna, de 10 bossarna, de 11 temana och hela React-UI:t.

---

## 1. Vision

**"The Deep"** – ett nytt läge bredvid kampanjen, valbart från huvudmenyn.

- Du står i ett **läger** (hub) vid en bonfire med kända NPC:er (Hessa, Corvin, köpmannen).
- Du **stiger ner** i en brunn → en procedurgenererad våning, byggd av handgjorda rum som sys ihop.
- Varje våning: hitta trappan ner. På vägen: fiender, kistor, fällor, helgedomar, hemliga rum.
- Var **3:e våning** är en **bossvåning** (återanvänder befintliga bossar).
- Efter varje boss: en **vägskälsbonfire** – *gå tillbaka upp med lootet* eller *gå djupare* (större risk,
  bättre loot). Det är spelets kärnbeslut.
- Dör du: allt du bär från rundan förloras, men du lämnar en **bloodstain** på våningen – nästa runda
  börjar med en chans att hämta den (souls-känslan bevaras).
- Det du tar hem blir permanent: vapen, rustning, och **Embers** (meta-valuta) som låser upp saker i lägret.

**Perspektiv:** vi behåller 2D side-view. Hela spelets styrka (rörelse, parry, telegrafer, fiende-AI som
hoppar över luckor) bygger på det. En top-down- eller grid-crawler vore i praktiken ett nytt spel.

### Designprinciper
1. **Strid först** – generatorn ska skapa rum där striden är rättvis, inte slumpad orättvisa.
2. **Handgjort i små bitar, slumpat i stort** – rummen är designade, ordningen och innehållet slumpas.
3. **Seedat allt** – samma seed ger samma våning. Krävs för debugging, daily runs och sparning.
4. **Kampanjsparfilen rörs aldrig** – The Deep har egen sparnyckel.

---

## 2. Vad som redan finns och kan återanvändas

| Finns | Var | Används till |
|---|---|---|
| `Builder` → `LevelData` | `src/game/world/builder.ts` | Rummallar skrivs med samma API; generatorn spottar ut en vanlig `LevelData` |
| `AREAS: Record<string, () => LevelData>` | `src/game/world/areas.ts` | Varje våning blir "ett område" – `GameScene` behöver bara få LevelData från generatorn |
| Dörrar med `requires` / `sets` | `DoorDef` | Låsta rum, nycklar, trappor ner, väg tillbaka till lägret |
| 17 fiendetyper, `drops` per fiende | `entities/Enemy.ts` | Spawntabeller per biom/djup |
| 10 bossar via `makeBoss(type)` | `entities/Boss.ts` | Bossvåningar |
| 11 teman (`crypt`, `lava`, `frost`, `mire`, `tomb`, `desert`, `sky`, `shrine`, `ash`, `keep`, `outdoor`) | `Theme` | Biomer per djupband |
| Fällor: spikar, lava, is, myr, istappar, ruttna plankor, rörliga plattformar | `Builder` | Fällrum och variation |
| Element (eld/frost/gift) + resistenser | `Enemy.applyElement`, `ArmorDef` | Affix på loot, elitfiender |
| Bloodstain, bonfires, `WorldState.flags` | `SaveSystem.ts`, `GameScene` | Död/återhämtning, checkpoints, run-flaggor |
| Inventory/HUD/Dialogue/Debug i React | `src/components/` | Bygger vidare – minimap, lootjämförelse, run-sammanfattning |

**Det som saknas:** seedad slump (56 st `Math.random` i `src/game`), generator, item-instanser
(inventory är idag `Record<itemId, antal>` – det går inte att ha två olika "Longsword +12 % eld"),
minimap, run-state, testramverk för generatorn.

---

## 3. Arkitektur

### 3.1 Nya filer

```
src/game/dungeon/
  rng.ts            Seedad PRNG (mulberry32) + hjälpare: int, pick, weighted, shuffle, fork(label)
  rooms/
    types.ts        RoomTemplate, Exit, RoomKind
    crypt.ts        rummallar per tema (…/lava.ts, frost.ts, …)
  layout.ts         Våningsgraf: rutnät av rumsplatser, huvudväg + sidogrenar
  stitch.ts         Lägger mallar i en stor Builder, öppnar/stänger väggar mellan rum
  populate.ts       Fiender, kistor, fällor, bonfire, trappa – från tabeller per djup
  tables.ts         Spawntabeller, lootabeller, djupband → tema, bossordning
  validate.ts       Nåbarhetskontroll (hopp 3 upp, lucka 3/6) – används i tester + dev-varning
  generate.ts       generateFloor(seed, depth): LevelData & { rooms: RoomMeta[] }
src/stores/runStore.ts        Aktiv runda: seed, djup, utforskade rum, run-flaggor, buffar
src/game/systems/DelveSave.ts Egen sparnyckel: 'ashen-hollow-delve-v1'
src/components/Minimap/       Minimap + helskärmskarta
src/components/Run/           Run-HUD, vägskälsmeny, sammanfattning efter död/hemgång
```

### 3.2 Rummallar

```ts
interface RoomTemplate {
  id: string;
  theme: Theme | 'any';
  kind: 'combat' | 'corridor' | 'treasure' | 'trap' | 'shrine' | 'rest' | 'merchant' | 'boss' | 'start' | 'stairs';
  w: number; h: number;                 // i rumsenheter, en enhet = 24×14 tiles
  exits: { side: 'L' | 'R' | 'U' | 'D'; slot: number }[];
  minDepth?: number; weight: number;
  build(b: Builder, ox: number, oy: number, rng: Rng): void;   // samma Builder-API som idag
  spawns: SpawnPoint[];                  // markerade platser, populate.ts väljer vad som står där
}
```

- Fast rumsenhet (förslag **24×14 tiles**) gör att mallar passar ihop som pussel. Stora rum = 2×1, 1×2, 2×2.
- Utgångar ligger på fasta "slots" (t.ex. golvhöjd rad 10 för L/R, kolumn 11–12 för U/D) så att vilka två
  rum som helst kan kopplas.
- Upp-utgångar kräver en klättring som följer rörelsegränserna (3 tiles per hopp) – mallarna har
  inbyggda avsatser.
- Mallar kan **speglas** horisontellt → dubbelt så många varianter gratis.

### 3.3 Våningslayout

Spelunky-liknande: ett rutnät med rumsplatser (t.ex. 6×4 på tidiga våningar, 8×5 senare).

1. Slumpa start (vänster/överkant) och trappa (långt bort).
2. Gå en **huvudväg** start → trappa med slumpvandring.
3. Lägg **sidogrenar** (1–3 rum långa) från huvudvägen: skatt, helgedom, köpman, hemligt rum.
4. Välj mall per plats utifrån vilka utgångar platsen behöver.
5. Valfritt **låst rum** + nyckel på en annan gren (dörrens `requires` + run-flagga).
6. Kör `validate.ts`; misslyckas den → ny seed-gaffel, max N försök, annars fallback-layout.

Hela våningen blir **en** `LevelData` – så `GameScene` kör som idag (en scen per område).
Storlek ca 144×56 tiles på tidiga våningar; måste mätas på mobil (se risker).

### 3.4 Koppling in i GameScene

- `SceneData` får `delve?: { seed: number; depth: number }`.
- `init()`: om `delve` finns → `this.level = generateFloor(seed, depth)` istället för `AREAS[area]()`.
- Trappan är en `DoorDef` med `to: 'delve'` som startar om scenen med `depth + 1`.
- Rumsövergångar spåras med en billig koll av spelarens rumsplats i `update()` → `runStore.explore(roomId)`
  (driver minimap och "rensat rum"-logik).
- `Math.random` i **generering** ersätts med `rng`. Slump i strid/FX (partiklar, skadespridning) får vara kvar.
- Bossrum: `b.data.boss = {...}` som idag. Bossar med arenamekanik (`splitArena`, `freezeArena`,
  `setSandstorm`, `setGloom`, Colossus kollapsande golv) får **egen fast arenamall** lyft ur sin
  kampanjbana – de slumpas inte.

### 3.5 Run-state och sparning

- `runStore` (zustand): `seed, depth, explored, flags, buffs, carried` (det som förloras vid död).
- `DelveSave` sparar: meta (Embers, upplåsningar, förråd i lägret) + ev. pågående runda (seed + djup +
  bärd loot) vid varje bonfire/trappa → man kan stänga appen mitt i en runda.
- Kampanjens `ashen-hollow-save-v1` rörs inte.

### 3.6 Loot 2.0 (item-instanser)

Dagens `items: Record<string, number>` räcker för förbrukningsvaror men inte för slumpad utrustning.

```ts
interface ItemInstance {
  uid: string;          // 'i_' + seedat id
  base: string;         // ITEMS-id, t.ex. 'longsword'
  rarity: 'common' | 'fine' | 'rare' | 'cursed' | 'relic';
  ilvl: number;         // från djupet
  affixes: { id: string; value: number }[];
  upgrade?: number;
}
```

- `inventoryStore` får `instances: Record<uid, ItemInstance>`; `equipped.weapon/armor/shield` kan peka på
  ett uid **eller** ett vanligt item-id (bakåtkompatibelt för kampanjen).
- Affix byggs ovanpå system som redan finns – inget nytt stridssystem behövs först:

| Affix | Krokar in i |
|---|---|
| `+X % skada` | `CombatSystem` skadeformel |
| `eld/frost/gift +N` | befintligt `element` på vapnet |
| `+poise`, `+defense` | `ArmorDef` |
| `fireRes / frostRes / poisonRes` | `ArmorDef` |
| `stamina-regen`, `rullkostnad -X %` | `Player` |
| `liv vid träff`, `souls +X %` | `onEnemyKilled` / träffhändelse |
| **Förbannad**: stark bonus + nackdel (t.ex. +40 % skada, −30 % max-HP) | blir rundans intressanta val |

- Rarity-färg på ikon och namn, jämförelse mot utrustat i `Inventory.tsx`.
- Allt som tas hem till lägret sparas som instans i `DelveSave`. Om delve-loot ska få användas i
  kampanjen är en senare fråga (se öppna frågor).

### 3.7 Fiender och svårighet

- **Djupband → tema → spawntabell**, t.ex.
  - 1–3 `crypt` (hollow, ghoul, archer, slime) · boss: Warden
  - 4–6 `lava` (+knight, lava-slime) · boss: Colossus
  - 7–9 `mire` / `frost` (+leech, wraith) · boss: Mire Mother / Matriarch
  - 10–12 `tomb` / `desert` (+mummy, legionary) · boss: Sphinx / Gladiator
  - 13–15 `shrine` / `sky` (+maiden, lantern, faceless, hair) · boss: Ayame / Leviathan
  - 16+ `ash` / `keep` – loopar med högre skalning · boss: Ashen King, sedan blandade
- Skalning per djup: HP och skada × `1 + 0.08·djup` (justeras i balansfasen), souls likaså.
- **Elitfiender** (~10 % från våning 3): prefix som *Brinnande* (eld-aura), *Frusen* (frostbuild-up på
  träff), *Hård* (dubbel poise), *Snabb*, *Vampyrisk*. Tint + aura via befintlig shader/`Fx`. Garanterad
  lootdrop.
- **Utmaningsrum**: dörrarna stängs (samma mekanik som bossens fog gate) tills vågorna är döda.

### 3.8 Rumstyper

| Typ | Innehåll |
|---|---|
| Strid | 2–5 spawnpunkter, ibland elit |
| Korridor | Plattformande, få fiender, fällor |
| Skatt | Kista (ny entitet: öppna med E, slumpad loot), ibland en mimic senare |
| Fälla | Spikgropar, ruttna plankor, istappar, lava – belöning i slutet |
| Helgedom | Välj 1 av 2 välsignelser, eller ta en förbannelse mot bättre loot |
| Vila | Mid-våning-bonfire (fyller flaskor, inte HP-reset av fiender) – inte varje våning |
| Köpman | Säljer förbrukningsvaror + 1–2 slumpade vapen för souls |
| Hemligt | Bakom en **sprickig vägg** (ny tile: bryts med tung attack) |
| Trappa | Dörr ner + ibland en NPC |
| Boss | Fast arenamall per boss |

### 3.9 Meta-progression (lägret)

Håll den liten och meningsfull – det är rundans beslut som ska kännas, inte en grind.

- **Embers** fås från bossar och från att gå hem med loot.
- Låser upp: startvapen att välja mellan, +1 flaska (max 2 gånger), nya rumstyper/helgedomar i poolen,
  köpmannens sortiment, en kista i lägret (förråd, t.ex. 12 platser).
- Smeden (Titanite finns redan) uppgraderar instanser.

### 3.10 UI

- **Minimap** (React, övre hörnet): rum som rutor, utforskade fylls i, ikoner för trappa/bonfire/köpman.
  Helskärmskarta i pausmenyn.
- **Run-HUD**: djup, seed (liten, för buggrapporter), aktiva välsignelser/förbannelser.
- **Vägskälsmeny** efter boss: "Bege dig hem" / "Gå djupare (våning N, risk ↑)".
- **Sammanfattning** efter död/hemgång: djup, dödade, bästa fynd, Embers.
- Mobil: minimapen får inte krocka med touchknapparna (`TouchControls.tsx`) – placering testas i fake-landscape.

### 3.11 Debug & test

- `?debug&seed=1234&depth=5` hoppar direkt in i en våning.
- DebugMenu: *Ny seed*, *Nästa våning*, *Visa rumsgränser och graf*, *Spawna elit*, *Ge loot av rarity X*.
- Lägg till **vitest** (dev-dependency) och testa `dungeon/` som ren TS:
  - 1 000 seeds × djup 1–20 → `validate()` måste godkänna varje våning.
  - Samma seed ger identisk `LevelData` (determinism).
  - Varje mall: utgångarna ligger på rätt slots och är nåbara från varandra.
- Kör testerna i CI (`ci.yml`) bredvid typecheck + build.

---

## 4. Faser

Varje fas = en eller flera `feature/…`-grenar → PR till `dev` → testas på dev-sajten, enligt nuvarande flöde.

### Fas 0 – Grund (liten)
- `rng.ts` + vitest-setup + CI-steg.
- `SceneData.delve`, `runStore`, `DelveSave` (tom meta).
- Huvudmenyn: knappen *The Deep* (bakom `?debug` tills Fas 4).
- **Klart när:** man kan starta en "våning" som är en hårdkodad testbana via delve-vägen och dö/återvända.

### Fas 1 – Generator MVP
- `RoomTemplate`, 10–12 crypt-mallar (start, trappa, 4 strid, 3 korridor, 2 skatt), spegling.
- Linjär layout (bara huvudväg), `stitch.ts`, `populate.ts` med en enkel spawntabell.
- `validate.ts` + tester.
- Trappa ner → nästa våning, oändligt, samma tema.
- **Klart när:** man kan spela 5 genererade crypt-våningar i rad utan fastnade lägen, på mobil med bra FPS.

### Fas 2 – Layout och rumstyper
- Rutnätslayout med grenar, låst rum + nyckel, helgedom, vila, köpman, fällrum, hemligt rum (sprickig vägg).
- Kistor (ny entitet).
- Minimap + helskärmskarta.
- **Klart när:** en våning har val (utforska grenar eller rusa till trappan) och kartan visar var man varit.

### Fas 3 – Loot 2.0
- `ItemInstance`, affixtabell, rarity, lootdrops från kistor/eliter, ilvl från djup.
- Affixkrokar i `CombatSystem`, `Player`, `ArmorDef`.
- Inventory: instanser, rarity-färger, jämförelse.
- **Klart när:** två longswords med olika affix kan bäras samtidigt och känns olika i strid.

### Fas 4 – Rundstruktur
- Bossvåning var 3:e (Warden, Colossus, Mire Mother först – deras arenor lyfts ut som mallar).
- Vägskälsbonfire, hemgång, döds-regler, bloodstain på våningen, run-sammanfattning.
- Spara/återuppta pågående runda.
- *The Deep* släpps ur `?debug`.
- **Klart när:** en hel runda (våning 1 → boss → välj → hem eller djupare → död) hänger ihop.

### Fas 5 – Lägret och meta
- Hub-område (byggs med `Builder` som vanlig area), NPC:er flyttar in, förråd, smed, Embers-upplåsningar.
- **Klart när:** det finns en anledning att köra "en runda till" efter en död.

### Fas 6 – Innehållsbredd
- Mallar för alla teman (mål: ~8–12 per tema, ~80–100 totalt), tematiska fällor (lava/is/myr).
- Alla 10 bossar i rotationen, eliter med prefix, utmaningsrum.
- Djupband 16+ (loop med skalning).

### Fas 7 – Balans och polish
- Svårighetskurva, lootfrekvens, souls-ekonomi – spela igenom med fasta seeds.
- Ljud (`Sfx`) för kista, trappa, elit-spawn, rarity-drop; juice på legendariska drops.
- Prestanda på svag Android (Capacitor-bygget).
- **Daily Deep**: alla får samma seed per dag (seed = datum), lokal topplista.

---

## 5. Risker

| Risk | Varför | Motåtgärd |
|---|---|---|
| **Prestanda** på stora sammansydda banor | Ljus (`Lighting`), lavapunkter och 20–40 fiender på mobil | Mät tidigt i Fas 1; sov fiender i rum långt från spelaren; begränsa våningsstorlek; ev. dela våning i flera scener |
| **Fiende-AI fastnar** | AI:n hoppar/droppar efter geometrin (`surfaceAt`, luckor) | Mallarna följer rörelsegränserna; `validate.ts` testar även fiendernas vägar inom rummet |
| **`GameScene` är 2 100 rader** med områdesspecifik logik | Svårt att lägga delve-logik ovanpå utan att trassla | Lägg delve-logik i `dungeon/` + en tunn krok i scenen; bryt ut bossarenafunktioner till ett eget system om det behövs |
| **Bossar beror på sin arena** | `splitArena`, `freezeArena`, kollaps osv. | Fasta arenamallar per boss, aldrig slumpade |
| **Sparfilsmigrering** | Item-instanser ändrar inventory-formatet | Egen delve-sparnyckel; kampanjens v1 rörs inte |
| **Slump som känns orättvis** | Eliter + fällor + bågskyttar i samma rum | Budget per rum ("hotpoäng"), aldrig elit i första rummet efter vila |
| **Scope** | Loot + generator + meta = mycket | Fas 1–4 är det spelbara kärnläget; 5–7 kan skeppas stegvis |

---

## 6. Öppna frågor (beslut som behövs)

1. **Ersätta eller komplettera kampanjen?** Förslag: komplettera – kampanjen är färdigt innehåll och
   lär ut striden. Ev. lås upp The Deep efter Warden.
2. **Hur hård är döden?** Förslag ovan: bärd loot förloras, bloodstain ger en chans att hämta souls. Alternativ:
   permadeath utan bloodstain (mer roguelike), eller behåll allt (mer souls, mindre spänning).
3. **Får delve-loot användas i kampanjen?** Förslag: nej i början (balansen i kampanjen går sönder),
   ev. kosmetiska belöningar senare.
4. **Tillgänglighet på mobil:** hur länge är en våning? Förslag: 4–8 minuter så en runda kan pausas
   vid varje trappa.

---

## 7. Första konkreta steg

1. Gren `feature/delve-foundation` från `dev`.
2. `src/game/dungeon/rng.ts` + vitest + test för determinism.
3. `SceneData.delve` + `runStore` + en hårdkodad testvåning som laddas via `?debug&seed=1`.
4. Skriv 3 crypt-mallar (start, strid, trappa) och sy ihop dem linjärt → första genererade våningen.
5. Mät FPS på telefon innan fler mallar skrivs.
