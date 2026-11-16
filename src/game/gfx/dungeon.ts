import type Phaser from 'phaser';
import { makeCanvas, outline, Pix } from './pixel';

/** Art for the Deep: chests (plain / gold, shut / open) and the boon shrine. Drawn once at boot. */
export function buildDungeonArt(scene: Phaser.Scene) {
  chest(scene);
  shrine(scene);
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
