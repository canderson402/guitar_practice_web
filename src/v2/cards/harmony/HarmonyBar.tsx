import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import s from './Harmony.module.css';
import { useStore } from '../../../store/useStore';
import { SegmentedControl, Button } from '../../ui';
import { diatonicIntervalOptions, intervalSpecKey, parseIntervalSpecKey } from '../../../data/musicData';
import { scaleShortName } from '../../shell/KeyPicker';
import { applyDefaultToAll } from './useHarmony';

export const INTERVAL_CHOICES = diatonicIntervalOptions.map(o => ({ value: intervalSpecKey(o.spec), label: o.label }));

/** The interval new notes are harmonized by (a scale step count in the key). */
export const DefaultInterval: React.FC = () => {
  const st = useStore(useShallow(x => ({ spec: x.harmonyMaker.defaultInterval, set: x.setDefaultInterval })));
  return (
    <SegmentedControl label="Harmony interval" size="sm" value={intervalSpecKey(st.spec)} options={INTERVAL_CHOICES}
      onChange={v => { const spec = parseIntervalSpecKey(v); if (spec) st.set(spec); }} />
  );
};

export const HarmonyBar: React.FC<{ play?: React.ReactNode }> = ({ play }) => {
  const st = useStore(useShallow(x => ({
    root: x.note.selectedNote, scale: x.note.selectedScale, count: x.harmonyMaker.notes.length, clear: x.clearHarmonyMaker,
    pending: x.harmonyMaker.notes.some(n => n.harmonized === false),
  })));
  return (
    <div className={s.bar}>
      <span className={s.muted}>Harmonize</span>
      <DefaultInterval />
      <span className={s.muted}>above, in {st.root ?? '—'} {scaleShortName(st.scale)}</span>
      <span className={s.grow} />
      {play}
      {/* Harmonies are added on Apply, so they never land where you're about to place a note. */}
      <Button size="sm" variant={st.pending ? 'primary' : 'secondary'} disabled={st.count === 0} onClick={applyDefaultToAll}
        title="Give every note its harmony at this interval">Apply</Button>
      <Button size="sm" variant="ghost" disabled={st.count === 0} onClick={st.clear}>Clear</Button>
    </div>
  );
};
