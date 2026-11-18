import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NOTE_BY_ID } from '../../game/data/notes';
import { EventBus } from '../../game/EventBus';
import { NPCS, type DialogueChoice } from '../../game/data/npcs';
import { ITEMS } from '../../game/data/items';
import { WEAPONS } from '../../game/systems/attacks';
import { sfx } from '../../game/systems/Sfx';
import { voice } from '../../game/systems/Voice';
import { useGameStore } from '../../stores/gameStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { ItemIcon } from '../Inventory/Inventory';
import { RARITY_COLOR } from '../../game/dungeon/loot';
import { markAtRisk, useRunStore } from '../../stores/runStore';
import { BACKPACKS, hasRoom, packCapacity, sellPrice, usedSlots } from '../../game/data/pack';

const CHARS_PER_SEC = 55;

/** Bottom dialogue box: typewriter lines, tap/Enter to advance, choices at the end of a node. */
export function Dialogue() {
  const dialogue = useGameStore((s) => s.dialogue);
  const [line, setLine] = useState(0);
  const [shown, setShown] = useState(0);

  const npc = dialogue ? NPCS[dialogue.npc] : null;
  const node = npc && dialogue ? npc.nodes[dialogue.node] : null;
  const text = node?.lines[line] ?? '';
  const atEnd = !!node && line >= node.lines.length - 1 && shown >= text.length;

  // entering a node: reset and let Phaser apply its one-time effects (flags, gifts)
  useEffect(() => {
    if (!dialogue) return;
    setLine(0);
    setShown(0);
    EventBus.emit('ui:dialogue-node', dialogue.npc, dialogue.node);
    voice.line(dialogue.npc, dialogue.node, 0);
  }, [dialogue]);

  // typewriter
  useEffect(() => {
    if (!node || shown >= text.length) return;
    const id = setTimeout(() => setShown((n) => Math.min(text.length, n + 2)), 2000 / CHARS_PER_SEC);
    return () => clearTimeout(id);
  }, [node, shown, text]);

  const close = () => {
    if (dialogue) voice.bark(dialogue.npc, 'bye');
    useGameStore.setState({ dialogue: null });
    EventBus.emit('ui:dialogue-end');
  };

  const choose = (c: DialogueChoice) => {
    if (!dialogue) return;
    sfx.souls();
    if (c.action.type === 'goto') useGameStore.setState({ dialogue: { npc: dialogue.npc, node: c.action.node } });
    else if (c.action.type === 'shop') {
      useGameStore.setState({ dialogue: null, shop: dialogue.npc });
      voice.bark(dialogue.npc, 'shop', { ifQuiet: true });
    }
    else close();
  };

  const advance = () => {
    if (!node) return;
    if (shown < text.length) return setShown(text.length); // finish the line first
    if (line < node.lines.length - 1) {
      setLine(line + 1);
      setShown(0);
      if (dialogue) voice.line(dialogue.npc, dialogue.node, line + 1);
    } else if (!node.choices?.length) close();
  };

  // keyboard: Enter/Space/E advance, 1-9 pick a choice, Esc closes
  useEffect(() => {
    if (!dialogue) return;
    const onKey = (e: KeyboardEvent) => {
      if (['Enter', ' ', 'e', 'E'].includes(e.key)) {
        e.preventDefault();
        advance();
      } else if (atEnd && node?.choices && /^[1-9]$/.test(e.key)) {
        const c = node.choices[Number(e.key) - 1];
        if (c) choose(c);
      } else if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!dialogue || !npc || !node) return null;
  return (
    <div className="dialogue-wrap" onPointerDown={(e) => e.target === e.currentTarget && advance()}>
      <div className="dialogue" onClick={advance}>
        <div className="dialogue-name">{npc.name}</div>
        <p className="dialogue-text">
          {text.slice(0, shown)}
          {shown >= text.length && !atEnd && <span className="dialogue-more">▼</span>}
        </p>
        {atEnd && node.choices && (
          <div className="dialogue-choices" onClick={(e) => e.stopPropagation()}>
            {node.choices.map((c, i) => (
              <button key={c.label} onClick={() => choose(c)}>
                <span className="num">{i + 1}</span> {c.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * A document: the same box as a conversation, with an X in the corner. The whole text is one block that rolls
 * up from the bottom while the Teller reads it aloud; the roll takes as long as the recording (or a reading
 * pace when there is none). Space / Enter / a click skips to the end, Esc or the X closes it.
 */
const READ_CHARS_PER_SEC = 14;
export function NoteReader() {
  const id = useGameStore((s) => s.note);
  const note = id ? NOTE_BY_ID[id] : null;
  const view = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [roll, setRoll] = useState<{ from: number; to: number; secs: number; go: boolean } | null>(null);

  const close = () => {
    voice.stop();
    useGameStore.setState({ note: null });
    EventBus.emit('ui:dialogue-end');
  };
  const skip = () => setRoll((r) => (r ? { ...r, secs: 0.3, go: true, from: r.to } : r));

  // measure, then start below the window and roll until the last line rests at the bottom
  useLayoutEffect(() => {
    setRoll(null);
    if (!note || !view.current || !body.current) return;
    const vh = view.current.clientHeight;
    const bh = body.current.scrollHeight;
    const to = Math.min(0, vh - bh);
    const fallback = Math.max(6, note.lines.join(' ').length / READ_CHARS_PER_SEC);
    setRoll({ from: vh, to, secs: fallback, go: false });
    let started = false;
    const start = (secs: number) => {
      if (started) return;
      started = true;
      // let the frame with the start position paint, then roll
      setTimeout(() => setRoll({ from: vh, to, secs, go: true }), 60);
    };
    const spoken = voice.playNote(note.id, (dur) => start(Math.max(4, dur - 0.5)));
    if (!spoken) start(fallback);
    // a recording that never reports its length still gets to roll
    const t = setTimeout(() => start(fallback), 1500);
    return () => clearTimeout(t);
  }, [note]);

  useEffect(() => {
    if (!note) return;
    const onKey = (e: KeyboardEvent) => {
      if (['Enter', ' ', 'e', 'E'].includes(e.key)) {
        e.preventDefault();
        skip();
      } else if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!note) return null;
  const y = roll ? (roll.go ? roll.to : roll.from) : 9999;
  return (
    <div className="dialogue-wrap">
      <div className={`dialogue note${note.kind === 'inscription' ? ' inscription' : ''}`} onClick={skip}>
        <button
          className="note-close"
          aria-label="Close"
          onClick={(e) => {
            e.stopPropagation();
            close();
          }}
        >
          ×
        </button>
        <div className="dialogue-name">{note.title}</div>
        <div className="note-view" ref={view}>
          <div
            className="note-body"
            ref={body}
            style={{ transform: `translateY(${y}px)`, transition: roll?.go ? `transform ${roll.secs}s linear` : 'none' }}
          >
            {note.lines.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Merchant shop: buy with souls. */

export function Shop() {
  const shopId = useGameStore((s) => s.shop);
  const souls = usePlayerStore((s) => s.souls);
  const items = useInventoryStore((s) => s.items);
  const equipped = useInventoryStore((s) => s.equipped);
  const run = useRunStore((s) => s.run);
  const pack = useRunStore((s) => s.meta.pack);
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  if (!shopId) return null;
  const npc = NPCS[shopId];
  // the peddler's stock changes with every floor
  const stock = shopId === 'wanderer' ? run?.shops[`f${run.depth}`] ?? [] : npc.shop ?? [];
  const canSell = !run;
  const close = () => {
    voice.bark(shopId, 'bye');
    useGameStore.setState({ shop: null });
    setTab('buy');
    EventBus.emit('ui:dialogue-end');
  };
  const used = usedSlots(items, equipped);
  const cap = packCapacity(pack);
  const nextPack = shopId === 'quartermaster' ? BACKPACKS[pack] : undefined;
  const buyPack = () => {
    const ps = usePlayerStore.getState();
    if (!nextPack) return;
    if (ps.souls < nextPack.price) return void voice.bark(shopId, 'poor');
    usePlayerStore.setState({ souls: ps.souls - nextPack.price });
    useRunStore.setState((s) => ({ meta: { ...s.meta, pack: s.meta.pack + 1 } }));
    sfx.levelUp();
    voice.traded();
    voice.bark(shopId, 'pack');
    EventBus.emit('ui:save');
  };
  const buy = (item: string, price: number) => {
    const ps = usePlayerStore.getState();
    if (ps.souls < price) return void voice.bark(shopId, 'poor');
    const inv = useInventoryStore.getState();
    if (!hasRoom(inv.items, inv.equipped, pack, item, 1)) {
      useGameStore.getState().showToast('Your pack is full');
      voice.bark(shopId, 'full');
      return;
    }
    usePlayerStore.setState({ souls: ps.souls - price });
    useInventoryStore.getState().add(item, 1);
    const r = useRunStore.getState().run;
    if (r) {
      markAtRisk(item, 1);
      // rolled gear is one of a kind: it leaves the stock
      if (shopId === 'wanderer' && ITEMS[item]?.rarity) {
        const key = `f${r.depth}`;
        const cur = useRunStore.getState().run!;
        useRunStore.setState({ run: { ...cur, shops: { ...cur.shops, [key]: (cur.shops[key] ?? []).filter((e) => e.item !== item) } } });
      }
    }
    sfx.souls();
    if (shopId === 'quartermaster') voice.traded();
    // a weapon gets its own remark now and then
    const w = ITEMS[item]?.weapon ? WEAPONS[ITEMS[item].weapon!] : null;
    const special = w?.cast && w.cast.style !== 'wand' ? 'buy_ranged' : w ? 'buy_weapon' : null;
    if (!(special && Math.random() < 0.5 && voice.bark(shopId, special))) voice.bark(shopId, 'buy');
    EventBus.emit('ui:save');
  };
  const sell = (item: string) => {
    const price = sellPrice(item);
    if (!price || !useInventoryStore.getState().remove(item, 1)) return;
    usePlayerStore.getState().addSouls(price);
    sfx.souls();
    voice.traded();
    voice.bark(shopId, 'sell');
    EventBus.emit('ui:save');
  };
  // anything but what you wear (a spare of a worn item can go)
  const wornIds = [equipped.weapon, equipped.shield, equipped.armor];
  const spare = (id: string) => (items[id] ?? 0) - wornIds.filter((w) => w === id).length;
  const sellable = Object.keys(items)
    .filter((id) => ITEMS[id] && sellPrice(id) > 0 && spare(id) > 0)
    .sort((a, b) => sellPrice(b) - sellPrice(a));
  return (
    <div className="panel-wrap">
      <div className="panel shop">
        <h2>{npc.name.split(',')[0]}&rsquo;s Wares</h2>
        <div className="rest-meta">
          <span>Souls {souls.toLocaleString('sv-SE')}</span>
          <span className={used >= cap ? 'warn' : ''}>
            Pack {used}/{cap}
          </span>
        </div>
        {shopId === 'quartermaster' && (
          <div className="shop-row pack-row">
            <span className="pack-icon">🎒</span>
            <div className="shop-info">
              <span className="shop-name">{nextPack ? nextPack.name : 'Bottomless Haversack'}</span>
              <span className="stat-eff">{nextPack ? `Carry ${nextPack.slots} things instead of ${cap}.` : `You carry ${cap} things – no pack is bigger.`}</span>
            </div>
            {nextPack ? (
              <button className={souls < nextPack.price ? 'cant' : ''} onClick={buyPack}>
                {nextPack.price}
              </button>
            ) : (
              <span className="shop-owned">max</span>
            )}
          </div>
        )}
        {canSell && (
          <nav className="inv-tabs">
            <button className={tab === 'buy' ? 'on' : ''} onClick={() => setTab('buy')}>
              Buy
            </button>
            <button className={tab === 'sell' ? 'on' : ''} onClick={() => setTab('sell')}>
              Sell spoils
            </button>
          </nav>
        )}
        {tab === 'buy' || !canSell ? (
          <>
            {stock.length === 0 && <p className="detail-desc dim">Sold out.</p>}
            {stock.map((e) => {
              const def = ITEMS[e.item];
              if (!def) return null;
              return (
                <div className="shop-row" key={e.item}>
                  <ItemIcon def={def} size={28} />
                  <div className="shop-info">
                    <span className="shop-name" style={{ color: def.rarity ? RARITY_COLOR[def.rarity] : undefined }}>
                      {def.name}
                    </span>
                    <span className="stat-eff">{def.affixLines?.length ? def.affixLines.join(' · ') : def.desc}</span>
                  </div>
                  <span className="shop-owned">×{items[e.item] ?? 0}</span>
                  <button className={souls < e.price ? 'cant' : ''} onClick={() => buy(e.item, e.price)}>
                    {e.price}
                  </button>
                </div>
              );
            })}
          </>
        ) : (
          <>
            {sellable.length === 0 && <p className="detail-desc dim">Nothing to sell but what you wear.</p>}
            {sellable.map((id) => {
              const def = ITEMS[id];
              return (
                <div className="shop-row" key={id}>
                  <ItemIcon def={def} size={28} />
                  <div className="shop-info">
                    <span className="shop-name" style={{ color: def.rarity ? RARITY_COLOR[def.rarity] : undefined }}>
                      {def.name}
                    </span>
                    <span className="stat-eff">{def.affixLines?.length ? def.affixLines.join(' · ') : def.kind}</span>
                  </div>
                  <span className="shop-owned">×{spare(id)}</span>
                  <button onClick={() => sell(id)}>+{sellPrice(id)}</button>
                </div>
              );
            })}
          </>
        )}
        <button className="primary" onClick={close}>
          Leave
        </button>
      </div>
    </div>
  );
}
