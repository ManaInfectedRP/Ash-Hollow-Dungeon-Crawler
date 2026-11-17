import type Phaser from 'phaser';
import { makeCanvas, outline, Pix, rng } from './pixel';

/**
 * Art for the Last Camp: a night forest behind the clearing (three layers of pines), grass-topped earth,
 * a campfire, and the camp's clutter – tent, log seats, stumps, bushes, ferns, grass tufts and pines.
 */
export function buildCampArt(scene: Phaser.Scene) {
  forestLayers(scene);
  forestTiles(scene);
  campfire(scene);
  props(scene);
}

// ------------------------------------------------------------------ backdrop
/** a seamless row of pines (drawn twice across the wrap so the tile repeats cleanly) */
function treeLine(W: number, H: number, opts: { base: number; n: number; min: number; max: number; col: string; edge?: string; seed: number; ground: number }) {
  const { c, ctx } = makeCanvas(W, H);
  const p = new Pix(ctx);
  const r = rng(opts.seed);
  // the ground the trees stand on
  ctx.fillStyle = opts.col;
  for (let x = 0; x < W; x++) {
    const h = opts.ground + Math.sin((x / W) * Math.PI * 2 * 3) * 3 + Math.sin((x / W) * Math.PI * 2 * 7) * 1.5;
    ctx.fillRect(x, Math.round(H - h), 1, Math.ceil(h));
  }
  for (let i = 0; i < opts.n; i++) {
    const cx = Math.floor(r() * W);
    const th = opts.min + Math.floor(r() * (opts.max - opts.min));
    const tw = Math.round(th * (0.32 + r() * 0.1));
    const foot = H - opts.ground - Math.floor(r() * 4);
    for (const ox of [cx, cx - W, cx + W]) {
      // trunk
      p.rect(ox - 1, foot - Math.round(th * 0.2), 2, Math.round(th * 0.2) + 2, opts.col);
      // tiers of needles, widest at the bottom
      const tiers = 4;
      for (let t = 0; t < tiers; t++) {
        const top = foot - th + Math.round((t * th * 0.8) / tiers);
        const bot = top + Math.round(th * 0.38);
        for (let y = top; y < bot; y++) {
          const k = (y - top) / (bot - top);
          const w = Math.max(1, Math.round(tw * (0.35 + 0.65 * ((t + k) / tiers)) * k));
          p.rect(ox - w, y, w * 2 + 1, 1, opts.col);
          // moonlight catches the right-hand edge
          if (opts.edge && k > 0.3) p.px(ox + w, y, opts.edge);
        }
      }
    }
  }
  return c;
}

function forestLayers(scene: Phaser.Scene) {
  scene.textures.addCanvas('bg-forest-far', treeLine(512, 270, { base: 0, n: 46, min: 40, max: 70, col: '#1d1a2e', seed: 21, ground: 52 }));
  scene.textures.addCanvas('bg-forest-mid', treeLine(512, 270, { base: 0, n: 22, min: 70, max: 120, col: '#141a1c', edge: '#22302e', seed: 22, ground: 38 }));
  scene.textures.addCanvas('bg-forest-near', treeLine(640, 270, { base: 0, n: 9, min: 150, max: 230, col: '#0b0f10', edge: '#18221e', seed: 23, ground: 20 }));
}

// ------------------------------------------------------------------ ground
/**
 * The forest tileset: same layout as 'tiles' (top, earth, plank, spikes, lava, ice, bog) – the first two
 * become grassy turf and dark soil, the rest are copied from the stone set.
 */
function forestTiles(scene: Phaser.Scene) {
  const S = 16;
  const { c, ctx } = makeCanvas(S * 7, S);
  const src = scene.textures.get('tiles').getSourceImage() as HTMLCanvasElement | HTMLImageElement;
  ctx.drawImage(src, 0, 0);
  const p = new Pix(ctx);
  const r = rng(31);
  const soil = (ox: number) => {
    p.rect(ox, 0, S, S, '#2e2420');
    for (let i = 0; i < 16; i++) p.px(ox + Math.floor(r() * S), Math.floor(r() * S), r() > 0.5 ? '#3a2e28' : '#231b18');
    // pebbles and a root
    for (let i = 0; i < 2; i++) {
      const x = ox + 2 + Math.floor(r() * 11);
      const y = 3 + Math.floor(r() * 10);
      p.rect(x, y, 2, 1, '#4a4440');
      p.px(x, y + 1, '#2a2624');
    }
    if (r() > 0.4) p.line(ox + Math.floor(r() * 6), 2 + Math.floor(r() * 4), ox + 8 + Math.floor(r() * 8), 9 + Math.floor(r() * 6), '#3e2a1c');
  };
  // 0: turf – soil under a thick mat of grass, blades sticking up
  soil(0);
  p.rect(0, 0, S, 4, '#2c4a26');
  p.rect(0, 0, S, 1, '#4c7a3a');
  for (let x = 0; x < S; x++) {
    if (r() > 0.45) p.px(x, 4, '#25401f');
    if (r() > 0.75) p.px(x, 5, '#1e3319');
    if (r() > 0.6) p.px(x, 1, '#3c6230');
  }
  // 1: soil
  soil(S);
  scene.textures.addCanvas('tiles-forest', c);
}

// ------------------------------------------------------------------ campfire
/** a ring of stones, two crossed logs and a proper fire (frames f0 unlit … f4, like the bonfire) */
function campfire(scene: Phaser.Scene) {
  const FW = 30;
  const FH = 34;
  const { c, ctx } = makeCanvas(FW * 5, FH);
  const p = new Pix(ctx);
  for (let f = 0; f < 5; f++) {
    const ox = f * FW;
    // ash bed
    p.rect(ox + 7, FH - 4, 16, 2, '#3a3230');
    // crossed logs
    p.line(ox + 6, FH - 3, ox + 22, FH - 8, '#5a3a22', 3);
    p.line(ox + 8, FH - 8, ox + 24, FH - 3, '#4a2e1a', 3);
    p.rect(ox + 6, FH - 4, 2, 2, '#c89a68');
    p.rect(ox + 23, FH - 4, 2, 2, '#c89a68');
    // stones
    for (const [x, w] of [[2, 4], [7, 3], [21, 3], [25, 4]] as const) {
      p.rect(ox + x, FH - 4, w, 4, '#5c5864');
      p.rect(ox + x, FH - 4, w, 1, '#7a7684');
    }
    if (f === 0) {
      p.px(ox + 14, FH - 7, '#8a3a1a');
      continue;
    }
    // embers in the bed, then the flames
    for (let i = 0; i < 5; i++) p.px(ox + 9 + ((i * 7 + f * 3) % 12), FH - 5, i % 2 ? '#ff8a2a' : '#ffd060');
    const r = rng(f * 17 + 5);
    const cols = ['#d8401a', '#ff8a2a', '#ffc850', '#fff0b0'];
    for (let layer = 0; layer < 4; layer++) {
      const w = 12 - layer * 3;
      const h = 19 - layer * 4 + Math.floor(r() * 3);
      for (let y = 0; y < h; y++) {
        const ww = Math.max(1, Math.round(w * Math.pow(1 - y / h, 0.8)));
        const sway = Math.round(Math.sin(f * 1.9 + y * 0.5 + layer) * (y / h) * 2.5);
        p.rect(ox + 15 - Math.floor(ww / 2) + sway, FH - 7 - y, ww, 1, cols[layer]);
      }
    }
    // a loose tongue of flame
    p.px(ox + 15 + ((f % 2) * 2 - 1) * 2, FH - 28 + (f % 3), '#ffa040');
  }
  const tex = scene.textures.addCanvas('campfire', c)!;
  for (let f = 0; f < 5; f++) tex.add(`f${f}`, 0, f * FW, 0, FW, FH);
}

// ------------------------------------------------------------------ props
function props(scene: Phaser.Scene) {
  const make = (key: string, w: number, h: number, draw: (p: Pix, ctx: CanvasRenderingContext2D) => void, edge = '#07060a') => {
    const { c, ctx } = makeCanvas(w, h);
    draw(new Pix(ctx), ctx);
    if (edge) outline(ctx, 0, 0, w, h, edge);
    scene.textures.addCanvas(`prop:${key}`, c);
  };

  const pine = (p: Pix, W: number, H: number, seed: number) => {
    const r = rng(seed);
    const cx = Math.floor(W / 2);
    p.rect(cx - 2, H - 12, 4, 12, '#3a2618');
    p.rect(cx - 2, H - 12, 1, 12, '#5a3c26');
    const tiers = 5;
    for (let t = 0; t < tiers; t++) {
      const top = Math.round((t * (H - 14)) / (tiers + 0.6));
      const bot = top + Math.round((H - 10) / 3);
      for (let y = top; y < Math.min(bot, H - 8); y++) {
        const k = (y - top) / (bot - top);
        const w = Math.max(1, Math.round((W / 2 - 1) * ((t + 1.5) / (tiers + 1)) * k));
        p.rect(cx - w, y, w * 2 + 1, 1, '#1c3226');
        p.rect(cx - w, y, Math.max(1, Math.round(w * 0.6)), 1, '#16281e');
        // warm light from the fire on the right side, moonlight on the tips
        p.px(cx + w, y, k > 0.6 ? '#3e5a40' : '#2c4634');
        if (r() > 0.85) p.px(cx - w + Math.floor(r() * w * 2), y, '#24402e');
      }
    }
  };
  make('pine', 34, 64, (p) => pine(p, 34, 64, 41));
  make('pine_small', 22, 38, (p) => pine(p, 22, 38, 42));

  make('tent', 42, 28, (p) => {
    // canvas A-frame lit from the fire on its right
    for (let y = 0; y < 26; y++) {
      const half = Math.round((y / 26) * 20);
      p.rect(21 - half, y + 2, half, 1, '#4a3c30');
      p.rect(21, y + 2, half, 1, '#7a6048');
    }
    // the open flap
    for (let y = 10; y < 28; y++) {
      const half = Math.round(((y - 10) / 18) * 7);
      p.rect(22 - half, y, half * 2, 1, '#120c0a');
    }
    p.line(21, 2, 21, 27, '#9a7a58');
    p.rect(20, 0, 2, 3, '#5a3c24');
    p.line(0, 27, 41, 27, '#3a2c22');
  });

  make('log', 26, 8, (p) => {
    p.rect(0, 1, 26, 6, '#5a3a22');
    p.rect(0, 1, 26, 1, '#7a5432');
    p.rect(0, 6, 26, 1, '#3a2414');
    p.rect(22, 1, 4, 6, '#c89a68');
    p.rect(23, 2, 2, 4, '#a07448');
    p.px(24, 3, '#c89a68');
    p.px(8, 3, '#3a2414');
    p.px(15, 4, '#3a2414');
  });

  make('stump', 14, 10, (p) => {
    p.rect(2, 2, 10, 8, '#4a3020');
    p.rect(2, 2, 10, 2, '#b08a5c');
    p.rect(4, 2, 6, 1, '#d0a874');
    p.rect(0, 8, 3, 2, '#3a2418');
    p.rect(11, 8, 3, 2, '#3a2418');
  });

  make('bush', 22, 12, (p) => {
    p.disc(6, 7, 5, '#1a2e22');
    p.disc(13, 5, 6, '#1e3626');
    p.disc(17, 8, 4, '#1a2e22');
    p.px(13, 1, '#2e4c38');
    p.px(9, 3, '#2e4c38');
    p.px(18, 5, '#2e4c38');
  });

  make('fern', 16, 9, (p) => {
    for (let i = 0; i < 5; i++) {
      const a = -1.2 + i * 0.6;
      p.line(8, 8, 8 + Math.round(Math.sin(a) * 7), 8 - Math.round(Math.cos(a) * 7), i % 2 ? '#2a4a2a' : '#365e34');
    }
  }, '');

  make('grass', 12, 6, (p) => {
    const blades = [[1, 3], [3, 5], [5, 4], [6, 6], [8, 4], [10, 5]];
    for (const [x, h] of blades) p.rect(x, 6 - h, 1, h, h > 4 ? '#3c6a30' : '#2c5226');
  }, '');

  make('flowers', 12, 6, (p) => {
    p.rect(2, 2, 1, 4, '#2c5226');
    p.rect(6, 1, 1, 5, '#2c5226');
    p.rect(9, 3, 1, 3, '#2c5226');
    p.px(2, 1, '#c8b0e8');
    p.px(6, 0, '#e8d890');
    p.px(9, 2, '#c8b0e8');
  }, '');

  make('cart', 30, 18, (p) => {
    p.rect(2, 4, 26, 8, '#5a3c24');
    p.rect(2, 4, 26, 1, '#7a5634');
    p.rect(4, 0, 6, 4, '#6a4a2c');
    p.rect(12, 1, 5, 3, '#4a6a8a');
    p.rect(19, 0, 7, 4, '#7a6040');
    p.disc(8, 14, 3, '#3a2616');
    p.disc(22, 14, 3, '#3a2616');
    p.px(8, 14, '#8a6a44');
    p.px(22, 14, '#8a6a44');
    p.line(28, 10, 29, 16, '#4a3020');
  });
}
