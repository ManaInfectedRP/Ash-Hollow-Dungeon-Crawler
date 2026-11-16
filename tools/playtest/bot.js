// Autopilot for play-testing: drives the game only through the touch input object (move, jump, attack,
// roll, flask, interact) – the same path a player's thumbs take. Pathfinding mirrors dungeon/validate.ts.
(() => {
  const S = () => window.__souls.game.scene.getScene('Game');
  const TI = window.__souls.touchInput;
  const press = window.__souls.pressTouch;
  const T = { TOP: 0, STONE: 1, PLANK: 2, SPIKE: 3, LAVA: 4, ICE: 5, BOG: 6 };
  const log = [];
  /** wait n real frames of the running game (when the page is hidden, step it by hand instead) */
  async function wait(n = 1) {
    const g = window.__souls.game;
    const target = g.loop.frame + n;
    while (g.loop.frame < target) {
      if (document.hidden) window.__step(1);
      else await new Promise((r) => requestAnimationFrame(() => r()));
    }
  }
  const say = (m) => { log.push(`[${window.__souls.game.loop.frame}] ${m}`); };

  function world(s) {
    const cols = s.level.cols, rows = s.level.rows;
    const at = (c, r) => { if (c < 0 || c >= cols || r < 0 || r >= rows) return T.STONE; const t = s.layer.getTileAt(c, r); return t ? t.index : -1; };
    const solid = (c, r) => { const t = at(c, r); return t === T.TOP || t === T.STONE || t === T.ICE; };
    const plank = (c, r) => at(c, r) === T.PLANK;
    const deadly = (c, r) => { const t = at(c, r); return t === T.SPIKE || t === T.LAVA; };
    const open = (c, r) => r >= 0 && !solid(c, r) && !deadly(c, r);
    const crumble = new Set();
    for (const cr of s.level.crumbles) for (let i = 0; i < cr.w; i++) crumble.add(`${Math.floor(cr.x / 16) + i},${Math.floor(cr.y / 16)}`);
    const stand = (c, r) => ((solid(c, r) || plank(c, r)) || crumble.has(`${c},${r}`)) && open(c, r - 1) && open(c, r - 2);
    const fall = (c, r) => { for (let y = r; y < rows + 2; y++) { if (deadly(c, y)) return null; if (stand(c, y)) return [c, y]; if (solid(c, y)) return null; } return null; };
    function nb(c, r) {
      const out = [];
      for (const d of [-1, 1]) {
        const n = c + d;
        if (stand(n, r)) out.push([n, r, 'walk']);
        else if (open(n, r - 1) && open(n, r - 2) && !solid(n, r)) {
          for (let k = 1; k <= 2; k++) { const fc = c + d * k; if (!open(fc, r - 1)) break; const l = fall(fc, r); if (l) out.push([l[0], l[1], 'fall']); }
        }
        for (let up = 0; up <= 3; up++) {
          let clear = true;
          for (let y = r - 1; y >= r - up - 2; y--) if (solid(c, y)) clear = false;
          if (!clear) break;
          for (let dx = 1; dx <= 4; dx++) {
            const tc = c + d * dx, tr = r - up;
            let arc = true;
            for (let k = 1; k <= dx; k++) { const cc = c + d * k; if (solid(cc, tr - 1) || solid(cc, tr - 2)) arc = false; }
            if (!arc) break;
            if (stand(tc, tr) && !(up === 0 && dx === 1)) out.push([tc, tr, 'jump']);
          }
        }
      }
      for (let up = 1; up <= 3; up++) { if (solid(c, r - up - 1)) break; if (plank(c, r - up) && open(c, r - up - 1) && open(c, r - up - 2)) out.push([c, r - up, 'up']); }
      if (plank(c, r)) { const l = fall(c, r + 1); if (l) out.push([l[0], l[1], 'drop']); }
      return out;
    }
    return { stand, nb };
  }

  /** cheapest route (walking is cheap, jumps a bit dearer) */
  function route(s, from, goal) {
    const w = world(s);
    const key = (c, r) => `${c},${r}`;
    const dist = new Map([[key(...from), 0]]);
    const prev = new Map();
    const q = [[0, from[0], from[1]]];
    const gk = key(...goal);
    while (q.length) {
      q.sort((a, b) => a[0] - b[0]);
      const [d, c, r] = q.shift();
      const k = key(c, r);
      if (d > (dist.get(k) ?? Infinity)) continue;
      if (k === gk) break;
      for (const [nc, nr, how] of w.nb(c, r)) {
        const cost = d + (how === 'walk' ? 1 : how === 'fall' ? 1.5 : 3);
        const nk = key(nc, nr);
        if (cost < (dist.get(nk) ?? Infinity)) { dist.set(nk, cost); prev.set(nk, [c, r, how]); q.push([cost, nc, nr]); }
      }
      if (dist.size > 40000) break;
    }
    if (!prev.has(gk) && gk !== key(...from)) return null;
    const path = [];
    let cur = gk;
    while (cur !== key(...from)) { const [pc, pr, how] = prev.get(cur); const [c, r] = cur.split(',').map(Number); path.unshift({ c, r, how }); cur = key(pc, pr); }
    return path;
  }

  const ptile = (p) => [Math.floor(p.x / 16), Math.round(p.feetY / 16)];
  const clearInput = () => { TI.moveX = 0; TI.moveY = 0; TI.sprint = false; for (const a of ['jump', 'light', 'heavy', 'roll', 'interact', 'flask', 'item', 'block']) press(a, false); };
  const tap = (a) => { press(a, true); press(a, false); };

  let lastAtk = 0, lastRoll = 0, lastFlask = 0, jumpHold = 0;
  /** one frame of fighting: true if busy fighting */
  function fight(s, f) {
    const p = s.player;
    // only what stands on our level: a foe on a plank overhead is reached by climbing (see goTo)
    const foes = s.targets().filter((e) => e.alive && Math.abs(e.body.bottom - p.feetY) < 14 && Math.abs(e.x - p.x) < 140);
    if (!foes.length) {
      press('block', false);
      return false;
    }
    foes.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x));
    const e = foes[0];
    const dx = e.x - p.x;
    const reach = (e.body?.width ?? 16) / 2 + 22;
    const hpFrac = p.hp / (200 + (window.__souls.stores.player.getState().stats.vigor - 10) * 20);
    const flasks = window.__souls.stores.player.getState().flasks;
    // low on HP: roll clear, then drink
    if (hpFrac < 0.45 && flasks > 0 && f - lastFlask > 70) {
      if (Math.abs(dx) < 60 && f - lastRoll > 40 && p.stamina > 20) { press('block', false); TI.moveX = -Math.sign(dx) || 1; tap('roll'); lastRoll = f; return true; }
      if (f - lastRoll > 20) { press('block', false); TI.moveX = 0; tap('flask'); lastFlask = f; return true; }
    }
    // a swing coming: face it and raise the shield (like a careful player would)
    const threat = foes.find((o) => o.state === 'attack' && Math.abs(o.x - p.x) < (o.body?.width ?? 16) / 2 + 60);
    if (threat && p.stamina > 12) {
      const tdx = threat.x - p.x;
      if (Math.sign(tdx) !== p.facing && Math.abs(tdx) > 4) { press('block', false); TI.moveX = Math.sign(tdx); return true; }
      TI.moveX = 0;
      press('block', true);
      return true;
    }
    press('block', false);
    if (Math.abs(dx) > reach) { TI.moveX = Math.sign(dx); TI.sprint = false; return true; }
    // in reach: face it, swing, and roll out now and then when hurt
    if (Math.sign(dx) !== p.facing && Math.abs(dx) > 4) { TI.moveX = Math.sign(dx); return true; }
    TI.moveX = 0;
    if (f - lastAtk > 22 && p.stamina > 30) { tap('light'); lastAtk = f; }
    return true;
  }

  /**
   * Walk to a tile (feet position) by real inputs, fighting whatever blocks the way.
   * Returns 'arrived' | 'stuck' | 'dead' | 'scene' (the scene changed under us).
   */
  async function goTo(goal, opts = {}) {
    const g = window.__souls.game;
    const s0 = S();
    const maxFrames = opts.maxFrames ?? 6000;
    let path = null, seg = 0, segStart = 0, replans = 0;
    for (let f = 0; f < maxFrames; f++) {
      const s = S();
      if (s !== s0 || !s.scene.isActive()) { clearInput(); return 'scene'; }
      const p = s.player;
      if (!p.alive) { clearInput(); return 'dead'; }
      const [pc, pr] = ptile(p);
      if (p.onGround && Math.abs(p.x - (goal[0] * 16 + 8)) < (opts.sub ? 40 : 10) && pr === goal[1]) { clearInput(); await wait(1); return 'arrived'; }
      TI.moveY = 0;
      // an archer (or anything hunting us) up on a ledge: go up there and deal with it
      if (!opts.sub && !opts.noFight && p.onGround) {
        const up = s.targets().find((e) => e.alive && Math.abs(e.x - p.x) < 220 && Math.abs(e.body.bottom - p.feetY) >= 14 && (e.cfg?.key === 'archer' || e.state === 'chase' || e.state === 'attack'));
        if (up) {
          const tt = [Math.floor(up.x / 16), Math.round(up.body.bottom / 16)];
          if (route(s, [pc, pr], tt)) {
            const r = await goTo(tt, { maxFrames: 600, sub: true });
            if (r === 'dead' || r === 'scene') return r;
            path = null;
            continue;
          }
        }
      }
      if (!opts.noFight && fight(s, g.loop.frame)) { await wait(1); path = null; continue; }
      if (p.onGround && (!path || g.loop.frame - segStart > 240)) {
        path = route(s, [pc, pr], goal);
        if (!path) {
          // not on a node the planner knows (mid-plank edge etc.): nudge toward the goal
          TI.moveX = Math.sign(goal[0] * 16 + 8 - p.x); await wait(4);
          if (++replans > 60) { clearInput(); say(`no route ${pc},${pr} -> ${goal}`); return 'stuck'; }
          continue;
        }
        seg = 0; segStart = g.loop.frame; jumpHold = 0;
        if (++replans > 80) { clearInput(); say(`replanned too often near ${pc},${pr}`); return 'stuck'; }
      }
      if (path && seg < path.length) {
        // skip ahead if we already stand on a later node
        if (p.onGround) { const k = path.findIndex((n, i) => i >= seg && n.c === pc && n.r === pr); if (k >= seg) { seg = k + 1; segStart = g.loop.frame; jumpHold = 0; } }
        const n = path[Math.min(seg, path.length - 1)];
        const tx = n.c * 16 + 8;
        const dx = tx - p.x;
        TI.sprint = false;
        if (n.how === 'drop') { TI.moveX = 0; TI.moveY = 1; if (p.onGround) tap('jump'); }
        else if (n.how === 'up') { TI.moveX = Math.abs(dx) > 3 ? Math.sign(dx) : 0; if (p.onGround && Math.abs(dx) <= 5) press('jump', true), (jumpHold = 14); }
        else if (n.how === 'jump') {
          TI.moveX = Math.sign(dx) || p.facing;
          TI.sprint = Math.abs(n.c - pc) >= 3;
          if (p.onGround && jumpHold <= 0) { press('jump', true); jumpHold = 16; }
        } else TI.moveX = Math.abs(dx) > 2 ? Math.sign(dx) : 0;
        if (jumpHold > 0 && --jumpHold === 0) press('jump', false);
        if (!p.onGround && n.how !== 'jump' && n.how !== 'up') { /* falling: keep steering */ }
      } else if (path) {
        TI.moveX = Math.sign(goal[0] * 16 + 8 - p.x);
      }
      await wait(1);
    }
    clearInput();
    say(`timeout heading to ${goal}`);
    return 'stuck';
  }

  async function interact() { tap('interact'); await wait(3); }

  window.bot = { wait, goTo, interact, route, world, clearInput, tap, log, ptile, S };
})();
