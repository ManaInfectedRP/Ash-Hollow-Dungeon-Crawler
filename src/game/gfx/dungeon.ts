import type Phaser from 'phaser';
import { makeCanvas, outline, Pix } from './pixel';

/** Art for the Deep: chests (plain / gold, shut / open) and the boon shrine. Drawn once at boot. */
export function buildDungeonArt(scene: Phaser.Scene) {
  chest(scene);
  shrine(scene);
  well(scene);
  ladder(scene);
  lootBeam(scene);
  sparkle(scene);
  bolts(scene);
  xbolt(scene);
  note(scene);
  statue(scene);
}

/** a weathered statue of a robed, hooded figure on a plinth with a carved plaque (an inscription to read) */
function statue(scene: Phaser.Scene) {
  const W = 20;
  const H = 38;
  const { c, ctx } = makeCanvas(W, H);
  const p = new Pix(ctx);
  const dark = '#4a4650';
  const mid = '#6e6a76';
  const lit = '#8e8a96';
  // plinth with a plaque
  p.rect(1, 28, 18, 10, dark);
  p.rect(2, 28, 16, 1, lit);
  p.rect(4, 31, 12, 5, '#3a3640');
  p.rect(5, 32, 10, 1, '#8a7a5a');
  p.rect(5, 34, 8, 1, '#8a7a5a');
  p.rect(0, 37, 20, 1, '#2a2630');
  // robe
  p.rect(5, 12, 10, 16, mid);
  p.rect(4, 18, 12, 10, mid);
  p.rect(5, 12, 2, 16, lit);
  p.rect(13, 14, 2, 14, dark);
  p.rect(9, 18, 1, 10, dark);
  // hood and a bowed, hidden face
  p.rect(6, 4, 8, 9, mid);
  p.rect(7, 3, 6, 1, mid);
  p.rect(6, 4, 2, 8, lit);
  p.rect(8, 7, 5, 5, '#2a2630');
  // hands folded over a sword, point down
  p.rect(7, 15, 6, 2, lit);
  p.rect(9, 17, 2, 11, '#9a96a2');
  p.rect(8, 16, 4, 1, '#5a5662');
  // moss and cracks
  p.px(14, 24, '#4a5a3a');
  p.px(15, 25, '#4a5a3a');
  p.px(4, 26, '#4a5a3a');
  p.px(11, 9, dark);
  p.px(12, 10, dark);
  outline(ctx, 0, 0, W, H, '#110d16');
  scene.textures.addCanvas('statue', c);
}

/** a document lying on the floor: a curled page with writing and a red wax seal */
function note(scene: Phaser.Scene) {
  const { c, ctx } = makeCanvas(12, 7);
  const p = new Pix(ctx);
  p.rect(1, 1, 10, 6, '#8a7a5a');
  p.rect(1, 1, 10, 5, '#d8c8a0');
  p.rect(0, 2, 1, 4, '#b8a880');
  p.rect(11, 1, 1, 4, '#b8a880');
  p.rect(2, 2, 6, 1, '#7a6a4a');
  p.rect(2, 4, 5, 1, '#7a6a4a');
  p.rect(8, 3, 2, 2, '#a02a24');
  p.px(8, 3, '#d04a3a');
  scene.textures.addCanvas('note', c);
}

/** a crossbow bolt: short, thick, a square steel head, two vanes (points right) */
function xbolt(scene: Phaser.Scene) {
  const { c, ctx } = makeCanvas(11, 5);
  const p = new Pix(ctx);
  p.rect(0, 1, 2, 1, '#c8b088');
  p.rect(0, 3, 2, 1, '#c8b088');
  p.rect(1, 2, 7, 1, '#6a4a2c');
  p.rect(2, 2, 5, 1, '#8a6a44');
  p.rect(8, 1, 2, 3, '#7a7a88');
  p.px(10, 2, '#e8ecf4');
  p.px(9, 1, '#c8ccd8');
  scene.textures.addCanvas('xbolt', c);
}

/** wand shots: a fireball (it rolls, so it is round), a shard of ice and a glob of venom, both pointing right */
function bolts(scene: Phaser.Scene) {
  {
    const { c, ctx } = makeCanvas(9, 9);
    const p = new Pix(ctx);
    p.disc(4, 4, 4, '#a8320e');
    p.disc(4, 4, 3, '#f06a1e');
    p.disc(4, 3, 2, '#ffb848');
    p.px(3, 3, '#fff0c0');
    p.px(4, 2, '#fff0c0');
    scene.textures.addCanvas('bolt-fire', c);
  }
  {
    const { c, ctx } = makeCanvas(12, 6);
    const p = new Pix(ctx);
    p.rect(0, 2, 2, 2, '#3a6a9a');
    p.rect(2, 1, 6, 4, '#5a9ad0');
    p.rect(8, 2, 2, 2, '#86c4ec');
    p.rect(10, 2, 2, 2, '#d0f0ff');
    p.rect(3, 2, 7, 1, '#d0f0ff');
    p.px(11, 2, '#ffffff');
    scene.textures.addCanvas('bolt-cold', c);
  }
  {
    const { c, ctx } = makeCanvas(11, 8);
    const p = new Pix(ctx);
    p.rect(0, 3, 2, 2, '#2e5a24');
    p.rect(1, 2, 3, 4, '#3e7a2e');
    p.disc(7, 4, 3, '#4e9a36');
    p.disc(7, 3, 2, '#86cc54');
    p.px(7, 2, '#ecffc8');
    p.px(8, 3, '#b4e87a');
    scene.textures.addCanvas('bolt-poison', c);
  }
}

/**
 * The well: the way down. A ring of old stone with a timber frame, a rope and a bucket; open, the dark inside
 * breathes a pale blue light. Sealed (a guardian still lives), chains cross it and runes burn on the stones.
 * Frames match the door's: closed / open / sealed.
 */
function well(scene: Phaser.Scene) {
  const FW = 36;
  const FH = 44;
  const frames = ['closed', 'open', 'sealed'];
  const { c, ctx } = makeCanvas(FW * frames.length, FH);
  const p = new Pix(ctx);
  frames.forEach((name, f) => {
    const ox = f * FW;
    const open = name === 'open';
    const sealed = name === 'sealed';
    // timber frame and roof
    p.rect(ox + 5, 8, 3, 22, '#5a3c24');
    p.rect(ox + 28, 8, 3, 22, '#5a3c24');
    p.rect(ox + 5, 8, 1, 22, '#7a5634');
    p.rect(ox + 2, 5, 32, 3, '#4a2e1c');
    p.line(ox + 2, 5, ox + 18, 0, '#6a4428', 2);
    p.line(ox + 18, 0, ox + 34, 5, '#6a4428', 2);
    p.rect(ox + 7, 11, 22, 2, '#6a4a2c');
    // rope and bucket
    p.rect(ox + 17, 13, 1, open ? 11 : 6, '#c8b088');
    if (!open) {
      p.rect(ox + 14, 19, 7, 5, '#6a4426');
      p.rect(ox + 14, 19, 7, 1, '#8a6a44');
      p.rect(ox + 15, 21, 5, 1, '#3a2614');
    }
    // the mouth of the well (seen from a little above): dark, glowing when open
    p.rect(ox + 3, 26, 30, 5, open ? '#0c1828' : '#07060a');
    if (open) {
      p.rect(ox + 7, 27, 22, 3, '#1a3a5a');
      p.rect(ox + 11, 28, 14, 1, '#5ab0e8');
      p.rect(ox + 15, 28, 6, 1, '#c8f0ff');
    }
    // the stone ring
    p.rect(ox + 1, 30, 34, 14, '#4a4658');
    p.rect(ox + 1, 30, 34, 2, '#6c6880');
    for (let y = 33; y < FH; y += 4)
      for (let x = 1 + ((y / 4) % 2) * 4; x < 35; x += 8) {
        p.rect(ox + x, y, 1, 3, '#2a2834');
        p.rect(ox + x + 1, y - 1, 6, 1, '#5c586c');
      }
    if (sealed) {
      // a heavy stone lid laid over the mouth, a rune burning in it
      p.rect(ox + 2, 24, 32, 6, '#5c586c');
      p.rect(ox + 2, 24, 32, 1, '#7a768c');
      p.rect(ox + 2, 29, 32, 1, '#3a3846');
      p.rect(ox + 16, 25, 4, 1, '#ffa030');
      p.rect(ox + 17, 24, 2, 5, '#ffa030');
      p.px(ox + 15, 27, '#ffa030');
      p.px(ox + 20, 27, '#ffa030');
      p.px(ox + 18, 26, '#ffe0a0');
    }
  });
  outline(ctx, 0, 0, FW * frames.length, FH, '#110d16');
  const tex = scene.textures.addCanvas('well', c)!;
  frames.forEach((n, i) => tex.add(n, 0, i * FW, 0, FW, FH));
}

/**
 * The ladder home: wooden rungs climbing out of sight, a shaft of daylight falling down it when it is open.
 * Sealed, it hangs pulled up out of reach behind chains and runes.
 */
function ladder(scene: Phaser.Scene) {
  const FW = 30;
  const FH = 72;
  const frames = ['closed', 'open', 'sealed'];
  const { c, ctx } = makeCanvas(FW * frames.length, FH);
  const p = new Pix(ctx);
  frames.forEach((name, f) => {
    const ox = f * FW;
    const open = name === 'open';
    // a sealed ladder hangs pulled up, well out of reach
    const lift = open ? 0 : 26;
    if (open) {
      // daylight down the shaft: brightest at the top
      for (let y = 0; y < FH; y++) {
        const a = Math.max(0, 0.55 - y / FH / 1.4);
        ctx.fillStyle = `rgba(255, 236, 190, ${a.toFixed(3)})`;
        ctx.fillRect(ox + 3 + Math.round(y / 24), y, 24 - Math.round(y / 12), 1);
      }
    }
    // rails
    p.rect(ox + 8, 0, 2, FH - lift, '#7a5634');
    p.rect(ox + 20, 0, 2, FH - lift, '#7a5634');
    p.rect(ox + 8, 0, 1, FH - lift, '#9a7448');
    p.rect(ox + 20, 0, 1, FH - lift, '#9a7448');
    // rungs
    for (let y = 4; y < FH - lift - 2; y += 7) {
      p.rect(ox + 10, y, 10, 2, '#8a6440');
      p.rect(ox + 10, y, 10, 1, '#a8804e');
    }
    if (!open) {
      // its foot lashed up with rope; while sealed, runes smoulder along the rails
      p.rect(ox + 10, FH - lift - 3, 10, 2, '#c8b088');
      p.rect(ox + 14, FH - lift - 1, 2, 4, '#c8b088');
      if (name === 'sealed')
        for (const y of [12, 26, 40]) {
          p.rect(ox + 8, y, 2, 2, '#ffa030');
          p.rect(ox + 20, y + 6, 2, 2, '#ffa030');
        }
    }
  });
  outline(ctx, 0, 0, FW * frames.length, FH, '#110d16');
  const tex = scene.textures.addCanvas('ladder', c)!;
  frames.forEach((n, i) => tex.add(n, 0, i * FW, 0, FW, FH));
}

/** a soft vertical shaft of light above dropped loot (tinted by rarity, drawn additively) */
function lootBeam(scene: Phaser.Scene) {
  const W = 12;
  const H = 64;
  const { c, ctx } = makeCanvas(W, H);
  for (let y = 0; y < H; y++) {
    const a = Math.pow(y / H, 1.6) * 0.9;
    for (let x = 0; x < W; x++) {
      const d = Math.abs(x - (W - 1) / 2) / (W / 2);
      const k = Math.max(0, 1 - d * d) * a;
      ctx.fillStyle = `rgba(255,255,255,${k.toFixed(3)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  scene.textures.addCanvas('loot-beam', c);
}

/** a four-pointed glint for sparkling loot */
function sparkle(scene: Phaser.Scene) {
  const { c, ctx } = makeCanvas(7, 7);
  const p = new Pix(ctx);
  p.rect(3, 0, 1, 7, 'rgba(255,255,255,0.7)');
  p.rect(0, 3, 7, 1, 'rgba(255,255,255,0.7)');
  p.rect(2, 2, 3, 3, 'rgba(255,255,255,0.85)');
  p.px(3, 3, '#ffffff');
  scene.textures.addCanvas('glint', c);
}

function chest(scene: Phaser.Scene) {
  const FW = 20;
  const FH = 16;
  const frames = ['closed', 'open', 'gold-closed', 'gold-open'];
  const { c, ctx } = makeCanvas(FW * frames.length, FH);
  const p = new Pix(ctx);
  frames.forEach((name, f) => {
    const ox = f * FW + 2;
    const gold = name.startsWith('gold');
    const open = name.endsWith('open');
    const wood = gold ? '#5a2c1c' : '#6a4426';
    const woodHi = gold ? '#7a3c24' : '#8a5a32';
    const band = gold ? '#e8b440' : '#5c5a66';
    const bandHi = gold ? '#ffe08a' : '#8a8898';
    // body
    p.rect(ox, 8, 16, 8, wood);
    p.rect(ox, 8, 16, 1, woodHi);
    p.rect(ox + 2, 8, 2, 8, band);
    p.rect(ox + 12, 8, 2, 8, band);
    if (open) {
      // lid flung back, a glow from inside
      p.rect(ox, 2, 16, 3, wood);
      p.rect(ox + 2, 2, 2, 3, band);
      p.rect(ox + 12, 2, 2, 3, band);
      p.rect(ox + 1, 6, 14, 2, gold ? '#fff0a0' : '#ffd890');
      p.rect(ox + 3, 7, 10, 1, '#ffffff');
    } else {
      p.rect(ox, 4, 16, 4, wood);
      p.rect(ox, 4, 16, 1, woodHi);
      p.rect(ox + 2, 4, 2, 4, band);
      p.rect(ox + 12, 4, 2, 4, band);
      p.rect(ox + 7, 7, 2, 3, bandHi);
      p.px(ox + 7, 9, '#2a2020');
    }
    p.px(ox + 2, 8, bandHi);
    p.px(ox + 12, 8, bandHi);
  });
  outline(ctx, 0, 0, FW * frames.length, FH, '#110d16');
  const tex = scene.textures.addCanvas('chest', c)!;
  frames.forEach((n, i) => tex.add(n, 0, i * FW, 0, FW, FH));
}

function shrine(scene: Phaser.Scene) {
  const FW = 22;
  const FH = 30;
  const frames = ['idle', 'used'];
  const { c, ctx } = makeCanvas(FW * 2, FH);
  const p = new Pix(ctx);
  frames.forEach((name, f) => {
    const ox = f * FW + 1;
    const used = name === 'used';
    // stepped plinth
    p.rect(ox, 25, 20, 5, '#4a4658');
    p.rect(ox + 2, 21, 16, 4, '#5c586c');
    p.rect(ox, 25, 20, 1, '#6c6880');
    // the standing stone
    p.rect(ox + 6, 6, 8, 15, '#565266');
    p.rect(ox + 7, 4, 6, 2, '#565266');
    p.rect(ox + 6, 6, 1, 15, '#6c6880');
    // the rune: bright while it has a boon to give
    const rune = used ? '#3a3846' : '#9ae6ff';
    p.rect(ox + 9, 9, 2, 8, rune);
    p.rect(ox + 8, 11, 4, 1, rune);
    p.rect(ox + 8, 14, 4, 1, rune);
    if (!used) {
      p.px(ox + 10, 7, '#e8fbff');
      p.px(ox + 4, 23, '#9ae6ff');
      p.px(ox + 15, 23, '#9ae6ff');
    }
  });
  outline(ctx, 0, 0, FW * 2, FH, '#110d16');
  const tex = scene.textures.addCanvas('shrine', c)!;
  frames.forEach((n, i) => tex.add(n, 0, i * FW, 0, FW, FH));
}
