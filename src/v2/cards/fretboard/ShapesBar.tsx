import React from 'react';
import s from './FretboardCard.module.css';
import { Switch, ChipButton } from '../../ui';

/** Each position's color (theme tokens --pos-1 … --pos-7). */
export const positionColor = (p: number) => `var(--pos-${p})`;

interface Props {
  /** Positions the scale has (7 or 5; 0 = none). */
  count: number;
  /** Why shapes can't show right now (switch disabled), or null. */
  reason: string | null;
  on: boolean;
  setOn(v: boolean): void;
  positions: number[];
  setPositions(v: number[]): void;
  /** The fretboard's dots in their position's color, or the normal colors
   *  (the chips always show their position's color). */
  colors: boolean;
  setColors(v: boolean): void;
}

/** In the card's top bar: the Shapes switch and, when on, All + one chip per
 *  position. Each chip toggles its position; any combination can show. */
export const ShapesBar: React.FC<Props> = ({ count, reason, on, setOn, positions, setPositions, colors, setColors }) => {
  const all = Array.from({ length: count }, (_, i) => i + 1);
  const active = positions.filter(p => p <= count);
  const toggle = (p: number) =>
    setPositions(positions.includes(p) ? positions.filter(x => x !== p) : [...positions, p].sort((a, b) => a - b));
  return (
    <div className={s.shapes}>
      <label className={s.shapeSwitch}><span className={s.label}>Shapes</span>
        <Switch label="Shapes" checked={on && !reason} disabled={!!reason} onChange={setOn} />
      </label>
      {reason && <span className={s.shapeHint}>{reason}</span>}
      {on && !reason && (
        <div role="group" aria-label="Positions" className={s.shapeChips}>
          <ChipButton aria-label="All positions" aria-pressed={active.length === count}
            selected={active.length === count} onClick={() => setPositions(all)}>All</ChipButton>
          <ChipButton aria-label="Clear positions" disabled={active.length === 0}
            onClick={() => setPositions([])}>Clear</ChipButton>
          {all.map(p => (
            <ChipButton key={p} aria-label={`Position ${p}`} aria-pressed={active.includes(p)} selected={active.includes(p)}
              color={positionColor(p)} onClick={() => toggle(p)}>
              {/* Off: a dot of its color as the key; on, the whole chip takes it. */}
              <i data-testid="position-swatch" className={s.posSwatch} style={{ ['--swatch' as string]: positionColor(p) }} />{p}
            </ChipButton>
          ))}
        </div>
      )}
      {on && !reason && (
        <label className={s.shapeSwitch}><span className={s.label}>Colors</span>
          <Switch label="Position colors" checked={colors} onChange={setColors} />
        </label>
      )}
    </div>
  );
};
