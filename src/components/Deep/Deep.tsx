import { EventBus } from '../../game/EventBus';
import { RARITY_COLOR } from '../../game/dungeon/loot';
import { BAND, bandFor } from '../../game/dungeon/tables';
import type { RoomKind } from '../../game/dungeon/types';
import { sfx } from '../../game/systems/Sfx';
import { useGameStore } from '../../stores/gameStore';
import { useRunStore, type MapState } from '../../stores/runStore';
import { ItemIcon } from '../Inventory/Inventory';

/** what a room shows on the map once you have been in it */
const ROOM_MARK: Partial<Record<RoomKind, string>> = {
  start: '◆',
  stairs: '▼',
  treasure: '✦',
  vault: '✦',
  rest: '🔥',
  merchant: '¤',
  shrine: '†',
  antechamber: '🔥',
  arena: '☠',
};

function MapGrid({ map, cell }: { map: MapState; cell: number }) {
  const h = Math.round(cell * 0.62);
  const seen = new Set(map.explored);
  const byKey = new Map(map.rooms.map((r) => [`${r.gx},${r.gy}`, r]));
  // rooms next to an explored one are hinted (you have seen their doorway)
  const near = new Set<string>();
  for (const k of seen) {
    const r = byKey.get(k);
    if (!r) continue;
    for (const s of r.exits) {
      const [dx, dy] = s === 'L' ? [-1, 0] : s === 'R' ? [1, 0] : s === 'U' ? [0, -1] : [0, 1];
      near.add(`${r.gx + dx},${r.gy + dy}`);
    }
  }
  return (
    <div className="map-grid" style={{ width: map.gw * cell, height: map.gh * h }}>
      {map.rooms.map((r) => {
        const k = `${r.gx},${r.gy}`;
        const known = seen.has(k);
        if (!known && !near.has(k)) return null;
        return (
          <div
            key={k}
            className={`map-room ${known ? 'known' : 'hint'} ${map.here === k ? 'here' : ''} kind-${r.kind}`}
            style={{ left: r.gx * cell, top: r.gy * h, width: cell - 2, height: h - 2 }}
          >
            {known && r.exits.map((s) => <i key={s} className={`map-door d-${s}`} />)}
            {known && ROOM_MARK[r.kind] && <span className="map-mark">{ROOM_MARK[r.kind]}</span>}
          </div>
        );
      })}
    </div>
  );
}

/** top-right: depth, band, the minimap (tap for the full map) */
export function Minimap() {
  const map = useRunStore((s) => s.map);
  const buffs = useRunStore((s) => s.run?.buffs);
  const menu = useGameStore((s) => s.menu);
  if (!map || menu) return null;
  return (
    <button className="minimap" onClick={() => useGameStore.setState({ mapOpen: true })} aria-label="Map">
      <div className="minimap-head">
        <span className={`mm-depth ${map.boss ? "mm-boss" : ""}`}>B{map.depth}</span>
        <span className="mm-band">{map.title}</span>
      </div>
      <MapGrid map={map} cell={map.boss ? 14 : 12} />
      {!!buffs?.length && (
        <div className="boons">
          {buffs.map((b) => (
            <span key={b.id} title={`${b.name}: ${b.desc}`}>
              ✧
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

export function MapOverlay() {
  const open = useGameStore((s) => s.mapOpen);
  const map = useRunStore((s) => s.map);
  const run = useRunStore((s) => s.run);
  if (!open || !map) return null;
  const close = () => useGameStore.setState({ mapOpen: false });
  return (
    <div className="panel-wrap" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div className="panel map-panel">
        <h2>
          Depth {map.depth} · {map.title}
        </h2>
        <MapGrid map={map} cell={map.boss ? 46 : 34} />
        <div className="map-legend">
          <span>◆ start</span>
          <span>▼ stairs</span>
          <span>✦ treasure</span>
          <span>🔥 bonfire</span>
          <span>¤ merchant</span>
          <span>† shrine</span>
        </div>
        {run && (
          <div className="rest-meta">
            <span>Kills {run.kills}</span>
            <span>Spoils {Object.values(run.atRisk).reduce((a, b) => a + b, 0)}</span>
            {run.buffs.map((b) => (
              <span key={b.id} className="ok">
                {b.name}
              </span>
            ))}
          </div>
        )}
        <button className="primary" onClick={close}>
          Close
        </button>
      </div>
    </div>
  );
}

/** the well: start a descent from the first floor or any waystone */
export function WellMenu() {
  const open = useGameStore((s) => s.well);
  const meta = useRunStore((s) => s.meta);
  if (!open) return null;
  const close = () => useGameStore.setState({ well: false });
  return (
    <div className="panel-wrap" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div className="panel well">
        <h2>The Well</h2>
        <p className="detail-desc">
          Cold air rises from below. Where will you begin? Everything you find down there is only yours once you bring it
          back up.
        </p>
        <div className="well-list">
          {meta.waystones.map((d) => {
            const band = bandFor(d);
            return (
              <button
                key={d}
                className={d === 1 ? 'primary' : ''}
                onClick={() => {
                  sfx.door();
                  EventBus.emit('ui:well-descend', d);
                }}
              >
                <span className="well-depth">Depth {d}</span>
                <span className="well-band">{band.name}</span>
                <span className="well-guard">Guardian at depth {Math.ceil(d / BAND) * BAND}</span>
              </button>
            );
          })}
        </div>
        <div className="rest-meta">
          <span>Deepest {meta.deepest}</span>
          <span>Descents {meta.runs}</span>
          <span>Guardians felled {meta.bossesFelled}</span>
          {meta.stain && <span className="warn">Souls lost at depth {meta.stain.depth}: {meta.stain.souls}</span>}
        </div>
        <button onClick={close}>Not yet</button>
      </div>
    </div>
  );
}

export function ShrineMenu() {
  const shrine = useGameStore((s) => s.shrine);
  if (!shrine) return null;
  return (
    <div className="panel-wrap">
      <div className="panel shrine-panel">
        <h2>An Old Shrine</h2>
        <p className="detail-desc">The stone hums. It will grant one boon, until you leave the Deep.</p>
        <div className="boon-list">
          {shrine.options.map((b) => (
            <button key={b.id} onClick={() => EventBus.emit('ui:shrine-pick', shrine.id, b.id)}>
              <span className="boon-name">{b.name}</span>
              <span className="boon-desc">{b.desc}</span>
            </button>
          ))}
        </div>
        <button onClick={() => useGameStore.setState({ shrine: null })}>Leave it be</button>
      </div>
    </div>
  );
}

/** after a death or a return home: what the descent came to */
export function RunSummary() {
  const summary = useRunStore((s) => s.summary);
  const dead = useGameStore((s) => s.dead);
  const menu = useGameStore((s) => s.menu);
  if (!summary || dead || menu) return null;
  const died = summary.kind === 'died';
  const close = () => useRunStore.setState({ summary: null });
  return (
    <div className="panel-wrap">
      <div className="panel run-summary">
        <h2>{died ? 'The Deep Takes Its Due' : 'Home, With Spoils'}</h2>
        <div className="rest-meta">
          <span>Reached depth {summary.depth}</span>
          <span>Kills {summary.kills}</span>
          {died && summary.souls > 0 && <span className="warn">{summary.souls} souls left at depth {summary.depth}</span>}
        </div>
        <p className="detail-desc">
          {died
            ? summary.items.length
              ? 'Lost to the dark:'
              : 'You carried nothing the Deep could take back.'
            : summary.items.length
              ? 'Brought home and yours to keep:'
              : 'You came back empty-handed – but alive.'}
        </p>
        <div className="summary-items">
          {summary.items.map(({ id, n, def }) => {
            return (
              <div key={id} className={`summary-item ${died ? 'lost' : ''}`}>
                <ItemIcon def={def} size={22} />
                <span style={{ color: def.rarity ? RARITY_COLOR[def.rarity] : undefined }}>{def.name}</span>
                {n > 1 && <span className="dim">×{n}</span>}
              </div>
            );
          })}
        </div>
        <button className="primary" onClick={close}>
          {died ? 'Rise again' : 'Rest'}
        </button>
      </div>
    </div>
  );
}
