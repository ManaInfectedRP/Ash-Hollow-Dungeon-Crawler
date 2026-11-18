import { sfx } from './Sfx';
import { useRunStore, type Meta } from '../../stores/runStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { packCapacity, usedSlots } from '../data/pack';

/**
 * NPC voice lines (docs/VOICES.md). Drop recorded files into src/assets/vo/ named by their id
 * (`hessa_greet_01.mp3`, `corvin_first_02.ogg`, …) and they are picked up at build time – nothing else to
 * register. Anything without a file simply stays silent, so lines can be recorded a few at a time.
 *
 * - dialogue lines: `<speaker>_<node>_<nn>`, nn = the line's number in that dialogue node (01, 02, …);
 * - barks (greetings, buying, leaving …): `<speaker>_<situation>_<nn>`, a random variant is played,
 *   never the same one twice in a row.
 */
const FILES = import.meta.glob('../../assets/vo/*.{mp3,ogg,wav,m4a}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const URLS = new Map<string, string>();
for (const [path, url] of Object.entries(FILES)) URLS.set(path.split('/').pop()!.replace(/\.[^.]+$/, ''), url);

/** NPC id → the speaker prefix of its files */
const SPEAKER: Record<string, string> = { quartermaster: 'hessa', keeper: 'corvin', wanderer: 'peddler' };
/** dialogue nodes that are just a greeting: they play a greeting bark picked from what happened since */
const GREETING_NODES = new Set(['again', 'hello']);
/** descents without trading before Hessa remarks on it */
const LONG_AWAY = 3;
const IDLE_COOLDOWN = 45_000;
const VOLUME = 0.95;

export type Bark =
  | 'greet' | 'return_long' | 'died' | 'loot' | 'guardian' | 'waystone' | 'deepest' | 'again'
  | 'shop' | 'buy' | 'buy_weapon' | 'buy_ranged' | 'poor' | 'sell' | 'pack' | 'full' | 'bye' | 'idle';

class Voice {
  private audio: HTMLAudioElement | null = null;
  private last = new Map<string, string>();
  private idleAt = 0;

  /** is a line still being spoken? */
  get speaking() {
    return !!this.audio && !this.audio.paused && !this.audio.ended;
  }

  has(id: string) {
    return URLS.has(id);
  }

  /** play one file by id; stops whatever was being said. False when there is no such file. */
  play(id: string) {
    const url = URLS.get(id);
    if (!url || sfx.muted) return false;
    this.stop();
    const a = new Audio(url);
    a.volume = VOLUME;
    this.audio = a;
    a.play().catch(() => {
      /* blocked before the first gesture, or a codec the browser can't play */
    });
    return true;
  }

  /**
   * The Teller reads a whole document: `teller_<note id>`. `onDuration` gets the recording's length in seconds
   * once it is known (the scroll is timed to it). False when there is no recording.
   */
  playNote(id: string, onDuration: (secs: number) => void) {
    if (!this.play(`teller_${id}`)) return false;
    const a = this.audio!;
    const report = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) onDuration(a.duration);
    };
    if (a.readyState >= 1) report();
    else a.addEventListener('loadedmetadata', report, { once: true });
    return true;
  }

  stop() {
    if (!this.audio) return;
    this.audio.pause();
    this.audio = null;
  }

  /** a dialogue line: the node's own recording, or for a plain greeting node a greeting that fits */
  line(npc: string, node: string, idx: number) {
    const sp = SPEAKER[npc];
    if (!sp) return false;
    if (GREETING_NODES.has(node) && idx === 0) return this.greet(npc);
    // meeting them for the first time: remember how things stood
    if (node === 'first' && idx === 0) {
      const m = useRunStore.getState().meta;
      this.saw(npc, { runs: m.runs, bosses: m.bossesFelled, deaths: m.deaths, deepest: m.deepest });
      if (npc === 'quartermaster') this.traded();
    }
    return this.play(`${sp}_${node}_${String(idx + 1).padStart(2, '0')}`);
  }

  /** a random variant of a bark (not the one played last); `ifQuiet`: only if nobody is talking */
  bark(npc: string, what: Bark, opts: { ifQuiet?: boolean } = {}) {
    const sp = SPEAKER[npc];
    if (!sp || (opts.ifQuiet && this.speaking)) return false;
    const prefix = `${sp}_${what}_`;
    const ids = [...URLS.keys()].filter((id) => id.startsWith(prefix) && /^\d+$/.test(id.slice(prefix.length)));
    if (!ids.length) return false;
    const key = `${sp}_${what}`;
    const pool = ids.length > 1 ? ids.filter((id) => id !== this.last.get(key)) : ids;
    const id = pool[Math.floor(Math.random() * pool.length)];
    this.last.set(key, id);
    return this.play(id);
  }

  /** the first bark that has a recording */
  private first(npc: string, list: Bark[]) {
    return list.some((b) => this.bark(npc, b));
  }

  /**
   * Greeting someone you have met before: they react to what happened since you last spoke – a guardian
   * felled, a death, a new depth record, a long time without trading, a pack full of spoils.
   */
  greet(npc: string) {
    const rs = useRunStore.getState();
    const meta = rs.meta;
    const seen = meta.voice.seen[npc];
    const now = { runs: meta.runs, bosses: meta.bossesFelled, deaths: meta.deaths, deepest: meta.deepest };
    const order: Bark[] = [];
    if (npc === 'wanderer') {
      // down in the Deep: has he met you already on this descent?
      const run = rs.run;
      if (run?.peddlerMet) order.push('again');
      else if (run) useRunStore.setState({ run: { ...run, peddlerMet: true } });
    } else if (seen) {
      if (now.bosses > seen.bosses) order.push(npc === 'keeper' ? 'waystone' : 'guardian');
      if (now.deaths > seen.deaths) order.push('died');
      if (npc === 'keeper' && now.deepest > seen.deepest) order.push('deepest');
      if (npc === 'quartermaster' && meta.runs - meta.voice.lastTradeRun >= LONG_AWAY) order.push('return_long');
      if (npc === 'keeper' && now.runs - seen.runs >= LONG_AWAY + 1) order.push('return_long');
      if (npc === 'quartermaster') {
        const inv = useInventoryStore.getState();
        if (usedSlots(inv.items, inv.equipped) >= packCapacity(meta.pack) * 0.7) order.push('loot');
      }
    }
    order.push('greet');
    if (npc !== 'wanderer') this.saw(npc, now);
    return this.first(npc, order);
  }

  /** Hessa remembers when you last traded with her */
  traded() {
    const meta = useRunStore.getState().meta;
    this.setVoice({ ...meta.voice, lastTradeRun: meta.runs });
  }

  /** standing next to someone without talking: now and then they mutter something */
  idle(npc: string) {
    const t = performance.now();
    if (t < this.idleAt) return;
    this.idleAt = t + IDLE_COOLDOWN;
    if (Math.random() < 0.5) this.bark(npc, 'idle', { ifQuiet: true });
  }

  private saw(npc: string, snap: Meta['voice']['seen'][string]) {
    const meta = useRunStore.getState().meta;
    this.setVoice({ ...meta.voice, seen: { ...meta.voice.seen, [npc]: snap } });
  }

  private setVoice(v: Meta['voice']) {
    useRunStore.setState((s) => ({ meta: { ...s.meta, voice: v } }));
  }
}

export const voice = new Voice();
