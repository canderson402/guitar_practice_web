import React from 'react';
import { X } from 'lucide-react';
import s from './NoteTrainer.module.css';
import { useV2Store } from '../../state/useV2Store';
import { Button, IconButton, Stepper } from '../../ui';
import { Preset, addPreset, presetLabel, presetMax, presetUnit, removePresetAt, samePreset, setPresetInterval, validPresets } from './presets';

/** The "change every" presets — one list, shared by the Note Trainer and Jam,
 *  saved in the browser. */
export const usePresets = () => {
  const saved = useV2Store(st => st.changePresets);
  const setPresets = useV2Store(st => st.setChangePresets);
  return { presets: saved ?? validPresets(undefined), setPresets };
};

/** One-tap preset chips for a card's own "change every" setting; the chip
 *  matching `value` is pressed. `disabledReason` greys out presets that
 *  don't apply to this card. */
export const PresetChips: React.FC<{
  value: Preset; onChange(p: Preset): void; disabledReason?(p: Preset): string | null;
}> = ({ value, onChange, disabledReason }) => {
  const { presets } = usePresets();
  return (
    <div className={s.presets}>
      {presets.map((p, i) => {
        const on = samePreset(p, value);
        const why = disabledReason?.(p) ?? null;
        return (
          <button key={i} type="button" aria-pressed={on} disabled={!!why} title={why ?? undefined}
            className={[s.preset, on ? s.on : ''].join(' ')} onClick={() => onChange(p)}>{presetLabel(p)}</button>
        );
      })}
    </div>
  );
};

/** Sheet editor: change each preset's number, or remove it. */
export const PresetEditor: React.FC = () => {
  const { presets, setPresets } = usePresets();
  if (!presets.length) return <p className={s.summary}>No presets yet.</p>;
  return (
    <div className={s.presetList}>
      {presets.map((p, i) => (
        <div key={i} className={s.presetRow}>
          <Stepper label={`Preset ${i + 1}`} editable value={p.interval} min={1} max={presetMax(p.mode)}
            onChange={v => setPresets(setPresetInterval(presets, i, v))} />
          <span className={s.presetUnit}>{presetUnit(p)}</span>
          <IconButton size="sm" label={`Remove preset ${presetLabel(p)}`} icon={<X size={14} />}
            onClick={() => setPresets(removePresetAt(presets, i))} />
        </div>
      ))}
    </div>
  );
};

/** Save a card's current setting to the shared list. */
export const SavePresetButton: React.FC<{ current: Preset }> = ({ current }) => {
  const { presets, setPresets } = usePresets();
  const saved = presets.some(p => samePreset(p, current));
  const label = `Save ${presetLabel(current)} as a preset`;
  return (
    <Button size="sm" variant="ghost" aria-label={label} disabled={saved} onClick={() => setPresets(addPreset(presets, current))}>
      {saved ? 'Saved as a preset' : label}
    </Button>
  );
};
