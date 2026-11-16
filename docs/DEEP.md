# The Deep – generated floors, loot, runs

```
src/game/dungeon/
  rng.ts        seeded PRNG (mulberry32), hashSeed, floorSeed(runSeed, depth)
  tables.ts     bands of 3 floors: theme, enemy pool, guardian; depth scaling (HP, damage, souls, grid size, elites)
  generate.ts   generateFloor(runSeed, depth) → LevelData + `delve` meta (rooms, chests, shrines, stairs)
  validate.ts   reachability check with the player's movement limits (used by the tests)
  loot.ts       rolled gear (rarity, affixes, curses), chests, elite drops, guardian hoards
  types.ts      FloorMeta, RoomMeta, ChestDef, ShrineDef
```

A descent has a **run seed**. Every floor's seed is derived from it and the depth, so a floor is the same if
you quit and continue, and different on the next descent.

## Floors

A floor is a grid of room **cells**, 24 × 14 tiles each (local rows: 0 ceiling, 1–10 air, 11 floor surface,
12–13 rock). Grid size grows with depth (4×2 at first, up to 8×4).

1. **Layout** (`makeLayout`): a walk from a random cell in the top row to the bottom row lays the main path – the
   start cell and the stairs. Side branches grow off it, and a few sideways loops are added. Dead ends become the
   reward rooms: treasure (always one), shrine, vault (gold chest + an elite), merchant. Part-way down the path
   there is sometimes a bonfire.
2. **Templates**: every cell runs one small hand-made template (`hall`, `steps`, `pit`, `planks`, `low`,
   `pillars`, `crumble`, `ledges`, plus themed ones: `lavapool`, `bogpool`, `icefloor`, `cloudsteps`, `paved`).
3. **Doorways** are cut after every template, so any two cells fit together:
   - sideways: a 4-tall gap at floor level with firm ground under it;
   - down: a hole in the floor (columns 9–14) with solid lips either side;
   - up: the shaft is cleared and a plank ladder hung in it (rows 2, 5, 8, and a top rung in the room above).
     Planks are one-way, so you jump up through them and walk off their ends to drop.
4. **Contents**: spawn, stairs, chests, shrines, the peddler, enemies (1–2 per room on depth 1, 2–4 deeper,
   some of them elites), loose consumables and props.

`npm test` generates thousands of floors and checks with `validateFloor` that the stairs, every chest, shrine,
bonfire, NPC and item can be reached. Seeing a floor: `OUT=floor.txt FLOOR=<seed>,<depth> npx vitest run tools/dungeon`
writes it as ASCII with every reachable spot marked.

### Guardian floors

Every third depth is a fixed hall: the landing, an antechamber with a bonfire, then the arena behind a fog gate
running to the right edge of the map – the arena mechanics (collapsing lava floor, freezing ice, the breaking
sky platform) assume that. The two doors at the far end – down and home – open when the guardian falls.

| Depths | Band | Guardian |
|---|---|---|
| 1–3 | The Sunken Crypts | Ashen Warden |
| 4–6 | The Ossuary Halls | Bone Shepherd |
| 7–9 | The Molten Deep | Molten Colossus |
| 10–12 | The Rimed Vaults | Frost Matriarch |
| 13–15 | The Drowned Warrens | Mire Mother |
| 16–18 | The Sunken Sands | Sphinx |
| 19–21 | The Gladiators' Pit | Gladiator |
| 22–24 | The Hollow Sky | Sky Leviathan |
| 25–27 | The Weeping Halls | Ayame |
| 28–30 | The Ashen Abyss | Ashen King |

Then the cycle repeats with extra HP and damage.

## Loot

`rollGear` picks a base for the depth, rolls a rarity, and applies affixes to a copy of the base item. The copy
gets a new id (`g…`) and `base` pointing at the original (its sprite, sheet and moveset), and is registered in
`ITEMS` at runtime – inventory, equipment and sprites need nothing special. Rolled definitions are saved with the
profile; ones nobody owns any more are pruned when you are back at camp.

Bonuses that are not part of an armor or shield definition live in `mods` (damage, heal per hit, stamina regen,
souls, weapon weight) and are summed by `computeEquip`, together with the run's shrine boons.

## The run

`stores/runStore.ts`:

- `run` – the current descent: seed, depth, `atRisk` (everything picked up or bought down there), boons, kills,
  the peddlers' stock. `null` in the camp.
- `meta` – kept between descents: waystones, deepest depth, deaths, and the `stain` (souls left at a depth).
- `map` – the minimap of the floor you are on.

World flags for one descent (opened chests, used shrines, felled guardians) start with `run:` and are cleared
with the run; so are picked-up floor items. Dying removes everything in `atRisk` from the inventory, leaves the
souls as a stain at that depth, and sends you to the camp; going home keeps it all.
