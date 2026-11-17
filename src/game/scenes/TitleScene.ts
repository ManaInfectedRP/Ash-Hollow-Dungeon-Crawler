import Phaser from 'phaser';
import { DEPTH, T, TILE } from '../constants';
import { EventBus } from '../EventBus';
import { Bonfire } from '../world/Bonfire';
import { Lighting } from '../systems/Lighting';
import { sfx } from '../systems/Sfx';
import { useGameStore } from '../../stores/gameStore';

/**
 * Backdrop for the main menu: a lone bonfire under the moon with the knight resting beside it.
 * The menu itself is React (components/Menu/MainMenu.tsx); it emits `ui:start` to begin.
 */
export class TitleScene extends Phaser.Scene {
  private bonfire!: Bonfire;
  private lighting!: Lighting;
  private bg: { s: Phaser.GameObjects.TileSprite; f: number }[] = [];
  private t = 0;

  constructor() {
    super('Title');
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.bg = [];
    useGameStore.setState({ menu: 'title', boss: null, prompt: null, dead: false, paused: false, restOpen: false, invOpen: false, dialogue: null, shop: null, ending: false, well: false, shrine: null, mapOpen: false });

    // the camp's clearing at night: stars, the moon, ranks of pines and mist
    const sky = this.add.tileSprite(0, 0, w, h, 'bg-sky').setOrigin(0).setScrollFactor(0).setTint(0xb0b8e0);
    this.add.image(w * 0.78, 46, 'moon').setScrollFactor(0).setAlpha(0.95);
    this.bg.push({ s: sky, f: 0.02 });
    for (const [key, f, a, tint] of [
      ['bg-forest-far', 0.12, 1, 0xffffff],
      ['bg-fog', 0.22, 0.45, 0x9aa8c8],
      ['bg-forest-mid', 0.3, 1, 0xffffff],
      ['bg-fog', 0.42, 0.3, 0x8a98b8],
      ['bg-forest-near', 0.55, 1, 0xffffff],
    ] as const)
      this.bg.push({ s: this.add.tileSprite(0, 0, w, h, key).setOrigin(0).setAlpha(a).setTint(tint), f });

    // a strip of ground made of the real tiles
    const cols = Math.ceil(w / TILE) + 2;
    const rows = 4;
    const data = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, () => (r === 0 ? T.TOP : T.STONE)));
    const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const ground = h - 44;
    map.createLayer(0, map.addTilesetImage('tiles', 'tiles-forest')!, -TILE, ground)!.setDepth(DEPTH.DECOR);

    // the menu sits on the left, the bonfire scene on the right
    const cx = Math.round(w * 0.68);
    this.bonfire = new Bonfire(this, 'title', cx, ground, true, 'campfire');
    this.add.sprite(cx + 22, ground, 'player-garb', 'kneel').setOrigin(0.5, 1).setFlipX(true).setDepth(DEPTH.PLAYER);
    this.add.image(cx - 30, ground, 'prop:log').setOrigin(0.5, 1).setDepth(DEPTH.DECOR + 1);
    this.add.image(cx + 64, ground, 'prop:tent').setOrigin(0.5, 1).setDepth(DEPTH.DECOR + 1);
    this.add.image(cx + 108, ground, 'prop:pine').setOrigin(0.5, 1).setDepth(DEPTH.DECOR + 1);
    this.add.image(cx - 90, ground, 'prop:pine_small').setOrigin(0.5, 1).setDepth(DEPTH.DECOR + 1);
    for (const dx of [-60, 30, 90]) this.add.image(cx + dx, ground, 'prop:grass').setOrigin(0.5, 1).setDepth(DEPTH.DECOR + 1);

    this.lighting = new Lighting(this, 0.72);
    this.lighting.add(() => ({ x: cx, y: ground - 12, r: 170, flicker: 0.1 }));
    this.lighting.add(() => ({ x: w * 0.78, y: 52, r: 60 }));

    sfx.playMusic('hollow');
    sfx.setAmbience('camp');

    const onStart = (debugAt?: { area: string; at?: { x: number; y: number }; depth?: number; seed?: number }) => {
      // Continue reads the save; Start Over has already wiped it
      this.registry.remove('world');
      this.scene.start('Game', debugAt);
    };
    EventBus.on('ui:start', onStart);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => EventBus.off('ui:start', onStart));
    this.events.once(Phaser.Scenes.Events.DESTROY, () => EventBus.off('ui:start', onStart));
    this.cameras.main.fadeIn(800);

    // ?debug&depth=5[&seed=123]: straight into a floor of the Deep (automated testing)
    const q = new URLSearchParams(location.search);
    if (q.has('debug') && q.has('depth') && !this.registry.get('autostarted')) {
      this.registry.set('autostarted', true);
      this.time.delayedCall(200, () => {
        useGameStore.setState({ menu: null });
        onStart({ area: 'deep', depth: Number(q.get('depth')) || 1, seed: q.has('seed') ? Number(q.get('seed')) : undefined });
      });
    }
  }

  update(_time: number, delta: number) {
    const dt = Math.min(delta, 50) / 1000;
    this.t += dt;
    this.bonfire.update(dt);
    // a slow drift so the backdrop feels alive
    for (const { s, f } of this.bg) s.tilePositionX = this.t * 12 * f;
    this.lighting.update(dt);
  }
}
