# Ash & Hollow: The Deep

A 2D souls-like dungeon crawler. Rest at the last camp, drop down the well, and fight your way through floors
that are different every descent – souls-like combat (stamina, parries, ripostes, telegraphed boss attacks)
with roguelike runs, rolled loot and guardians waiting every third floor.

**▶ Play now: https://manainfectedrp.github.io/Ash-Hollow-Dungeon-Crawler/**

<img src="docs/qr-play.png" alt="QR code to play Ash & Hollow: The Deep" width="220">

Scan the code with your phone's camera to open the game.

## How a descent works

- **The camp** is home: level up and reinforce your weapon at the bonfire, buy from Hessa (and sell her what you
  drag back up, and buy bigger backpacks), hear the rules from Corvin, then look into **the well**.
- **The Deep** is generated from a seed: a maze of rooms – fights, traps, treasure chests, old shrines that grant
  a boon for the rest of the run, wandering peddlers and the odd bonfire. Find the stairs down.
- **Every third floor a guardian** bars the way – ten of them, one per band of floors, each in its own land
  (crypts, ossuary, lava, frost, mire, sand, the gladiators' pit, the sky, the weeping halls, the ashen abyss).
  Past the ten, the cycle starts over, harder.
- **After a guardian**, two doors: down, or home. Felling one also wakes a **waystone** at the well, so the next
  descent can start below it.
- **Spoils are only borrowed.** Everything you pick up down there is lost if you die before you bring it home –
  through the door after a guardian, or by crushing an **Ember of Return**.
- **Souls stay where you fall.** Reach that depth again, on any descent, and take them back. Die first, and
  they are gone.
- **Your pack is small.** It holds 12 things – every piece of gear takes a slot (what you wear is free), and
  every kind of consumable or material one slot however many you stack. When it is full, loot stays on the
  floor: drop something (it waits for you to pick it up again), or go home and sell to Hessa. She also sells
  bigger packs – 16, 20, 24 and finally 28 slots.

### Loot

Gear is rolled from a base item. Rarity decides how many affixes it gets, depth decides how strong they are:

| Rarity | Affixes |
|---|---|
| Common | none |
| Fine | 1 |
| Rare | 2 |
| Relic | 3, strong, with a name of its own |
| Cursed | 2 strong blessings and a curse (heavier, slower stamina, brittle) |

Affixes include extra damage, fire / frost / poison infusion, healing per hit, stamina regeneration, more souls,
defense, poise, elemental resistances, lighter gear, and better blocking. **Elites** (tinted, glowing) hit
harder, take more killing and always drop something: hulking, frenzied, frostbound, venomous or vampiric.

## Install it like an app

The game is a web app you can keep on your home screen – it then starts fullscreen, without the browser bar,
and works offline.

- **Android (Chrome):** open the link, then *⋮ → Add to Home screen* (or *Install app*).
- **iPhone / iPad (Safari):** open the link, then *Share → Add to Home Screen*.

It updates itself whenever a new version is published.

## Controls

| | Keyboard | Touch |
|---|---|---|
| Move | A / D · ← → | left stick |
| Jump · Drop through a plank | Space / W · S + Space | jump button |
| Light / heavy attack (hold heavy to charge) | J / K | attack buttons |
| Roll · Sprint | L · Shift | roll button |
| Shield: tap = parry, hold = block | U | shield button |
| Flask · Quick item · Interact | R · Q · E | buttons |
| Inventory · Map · Pause | I / Tab · M · Esc | top-right buttons, tap the minimap |

Play in landscape on phones; the first tap turns on sound and fullscreen.

---

## Development

Phaser 3 + React + TypeScript, built with Vite; the Android app wraps the same build with Capacitor.

```bash
npm install
npm run dev          # http://localhost:5173 (add ?debug for the debug menu)
npm test             # floor generator + loot tests (vitest)
npm run typecheck
npm run build        # production web build in dist/
npm run android      # build + sync into the Capacitor Android project
npm run sprites      # rebuild the character / item sprite sheets
```

With `?debug` the 🐞 menu (F1) can start any depth, wake every waystone, give items and souls, and kill the
current guardian. `?debug&depth=6&seed=123` drops you straight onto a floor.

### Where things live

| | |
|---|---|
| `src/game/dungeon/` | the Deep: seeded RNG, floor generator, reachability validator, loot, depth tables – see [docs/DEEP.md](docs/DEEP.md) |
| `src/game/world/camp.ts` | the camp hub |
| `src/game/scenes/GameScene.ts` | runs the camp and every floor (chests, shrines, elites, deaths, the way home) |
| `src/stores/runStore.ts` | the current descent and everything kept between them (waystones, the souls you lost) |
| `src/components/Deep/` | minimap, full map, the well, shrines, the run summary |
| `tools/playtest/` | an autopilot that plays floors through the touch controls, for testing in the browser |

The design and its phases are in [dungeon_crawler_plan.md](dungeon_crawler_plan.md) (Swedish). Combat, bosses,
their tells and gear are described in [docs/WORLD.md](docs/WORLD.md).

### Branches and releases

```
feature/…  ──PR──▶  dev  ──PR──▶  main
                     │              │
                     ▼              ▼
   …/Ash-Hollow-Dungeon-Crawler/dev/    …/Ash-Hollow-Dungeon-Crawler/
            (test build)                       (players)
```

1. **Work on a branch** of your own (`feature/new-room`, `fix/ladder`, …) and push it.
2. **Open a pull request into `dev`.** GitHub Actions typechecks, tests and builds it; merge when it's green.
3. **Test on the dev site:** every push to `dev` is published to
   **https://manainfectedrp.github.io/Ash-Hollow-Dungeon-Crawler/dev/** – a separate test build with a *Dev build*
   label in the menu (it also installs as its own app, *Deep Dev*).
4. **Release:** open a pull request from `dev` into `main`. Only `dev` can be merged into `main` (checked by CI).
   Merging publishes the real game.

The published files live on the `gh-pages` branch, written by the deploy workflow – don't edit it by hand.
GitHub Pages serves that branch (*Settings → Pages → Deploy from a branch → `gh-pages` / root*).

Workflows: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (pull-request checks) and
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) (publishing).

Built on [Ash & Hollow](https://github.com/ManaInfectedRP/Ash-Hollow), the souls-like platformer it grew out of.
