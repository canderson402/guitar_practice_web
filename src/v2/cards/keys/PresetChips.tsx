import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { X } from 'lucide-react';
import s from './NoteTrainer.module.css';
import { useStore } from '../../../store/useStore';
import { useCardPref } from '../../state/useCardPref';
import { IconButton, Stepper } from '../../ui';
import { Preset, presetLabel, presetMax, presetUnit, removePresetAt, samePreset, setPresetInterval, validPresets } from './presets';

/** The saved presets (in the browser, with the card's other settings). */
export const usePresets = () => {
  const [saved, setSaved] = useCardPref<unknown>('note-trainer', 'presets', undefined);
  return { presets: validPresets(saved), setPresets: (p: Preset[]) => setSaved(p) };
};

/** One-tap preset chips; the one matching the current setting is pressed. */
export const PresetChips: React.FC = () => {
  const st = useStore(useShallow(x => ({
    mode: x.circleOfFifths.changeMode, interval: x.circleOfFifths.changeInterval,
    setMode: x.setCircleChangeMode, setInterval: x.setCircleChangeInterval,
  })));
  const { presets } = usePresets();
  return (
    <div className={s.presets}>
      {presets.map((p, i) => {
        const on = samePreset(p, { mode: st.mode as Preset['mode'], interval: st.interval });
        return (
          <button key={i} type="button" aria-pressed={on} className={[s.preset, on ? s.on : ''].join(' ')}
            onClick={() => { st.setMode(p.mode); st.setInterval(p.interval); }}>{presetLabel(p)}</button>
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
