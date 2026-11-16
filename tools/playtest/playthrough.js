// A full descent driven by the autopilot (bot.js): camp → well → floors → guardian → home.
// Runs in real time so it can be watched. Progress: window.__pt.log, window.__pt.state.
(() => {
  const EB = () => import('/src/game/EventBus.ts').then((m) => m.EventBus);
  const gs = () => window.__souls.stores.game.getState();
  const run = () => window.__souls.stores.run;
  const pt = (window.__pt = { log: [], state: 'running', stop: false });
  const say = (m) => pt.log.push(`[d${bot.S().depth}] ${m}`);
  const tileOf = (x, y) => [Math.floor(x / 16), Math.round(y / 16)];

  async function closeMenus() {
    const E = await EB();
    if (gs().restOpen) E.emit('ui:rest-leave');
    if (gs().dialogue) { window.__souls.stores.game.setState({ dialogue: null }); E.emit('ui:dialogue-end'); }
    if (run().getState().summary) run().setState({ summary: null });
    await bot.wait(5);
  }

  /** spend souls at the bonfire like the Level Up buttons do: vigor first, then strength */
  function levelUp() {
    const ps = window.__souls.stores.player.getState();
    let n = 0;
    while (ps.levelUp(n % 3 === 2 ? 'strength' : 'vigor')) n++;
    if (n) say(`levelled up ${n}× → level ${window.__souls.stores.player.getState().level}`);
  }

  async function visit(what, x, y) {
    const r = await bot.goTo(tileOf(x, y), { maxFrames: 7200 });
    say(`${what}: ${r}`);
    return r;
  }

  async function floor() {
    const s = bot.S();
    const f = s.floor;
    say(`floor ${f.depth} ${f.title}: ${f.rooms.length} rooms, ${s.enemies.length} foes (${s.enemies.filter((e) => e.elite).length} elite)`);
    // bonfire first: rest, it refills flasks
    for (const b of s.bonfires) {
      if ((await visit('bonfire', b.x, b.y)) !== 'arrived') return 'fail';
      await bot.interact();
      await bot.wait(40);
      levelUp();
      await closeMenus();
    }
    const stain = run().getState().meta.stain;
    if (stain && stain.depth === f.depth) {
      const r = await visit('bloodstain', f.stainSpot.x, f.stainSpot.y);
      if (r === 'dead') return 'dead';
    }
    for (const c of s.chests) {
      const r = await visit('chest', c.def.x, c.def.y);
      if (r === 'dead') return 'dead';
      if (r !== 'arrived') continue;
      await bot.interact();
      await bot.wait(40);
      // walk over the loot
      for (const dx of [-24, 24, 0]) await bot.goTo(tileOf(c.def.x + dx, c.def.y), { maxFrames: 300 });
    }
    for (const sh of s.shrines) {
      const r = await visit('shrine', sh.def.x, sh.def.y);
      if (r === 'dead') return 'dead';
      if (r !== 'arrived') continue;
      await bot.interact();
      await bot.wait(20);
      const offer = gs().shrine;
      if (offer) {
        say(`shrine offers ${offer.options.map((o) => o.name).join(' / ')} – takes ${offer.options[0].name}`);
        (await EB()).emit('ui:shrine-pick', offer.id, offer.options[0].id);
        await bot.wait(30);
      }
    }
    if (f.boss) return 'boss';
    const r = await visit('stairs', f.stairs.x, f.stairs.y);
    if (r !== 'arrived') return r === 'dead' ? 'dead' : 'fail';
    await bot.interact();
    await bot.wait(90);
    return 'down';
  }

  async function guardian() {
    const s = bot.S();
    const a = s.level.boss;
    say(`guardian floor: ${s.boss?.cfg.name}, ${s.boss?.hp} HP`);
    const e = await bot.goTo(tileOf(a.fogX + 48, a.y), { maxFrames: 3000 });
    say(`into the arena: ${e}`);
    // fight until one of us falls
    for (let i = 0; i < 60 * 240 && s.player.alive && s.boss?.alive; i += 30) {
      const r = await bot.goTo(tileOf(s.boss.x, a.y), { maxFrames: 30 });
      if (r === 'dead' || r === 'scene') break;
    }
    if (!s.player.alive) return 'dead';
    say(`guardian felled – hoard falls`);
    await bot.wait(150);
    for (const p of [...s.pickups]) await bot.goTo(tileOf(p.sprite.x, a.y), { maxFrames: 400 });
    const home = s.doors.find((d) => d.def.id === 'home');
    await visit('the way home', home.def.x, home.def.y);
    await bot.interact();
    await bot.wait(120);
    return 'home';
  }

  pt.go = async (startDepth = 1, maxFloors = 6) => {
    try {
      await closeMenus();
      const camp = bot.S();
      if (camp.area === 'camp') {
        const fire = camp.bonfires[0];
        await visit('camp fire', fire.x, fire.y);
        await bot.interact();
        await bot.wait(30);
        levelUp();
        await closeMenus();
        const w = camp.doors.find((d) => d.def.id === 'well');
        await visit('the well', w.def.x, w.def.y);
        await bot.interact();
        (await EB()).emit('ui:well-descend', startDepth);
        await bot.wait(100);
      }
      for (let n = 0; n < maxFloors && !pt.stop; n++) {
        const r = await floor();
        if (r === 'boss') {
          pt.state = await guardian();
          say(`end: ${pt.state}`);
          break;
        }
        if (r !== 'down') {
          pt.state = r;
          say(`end: ${r}`);
          break;
        }
      }
    } catch (err) {
      pt.state = 'error';
      pt.log.push(String(err && err.stack ? err.stack : err));
    }
    if (pt.state === 'running') pt.state = 'done';
    await bot.wait(200);
    pt.summary = run().getState().summary;
  };
})();
