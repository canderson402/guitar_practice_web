import React from 'react';
import s from './Harmony.module.css';
import { useStore } from '../../../store/useStore';
import { SegmentedControl, Switch, Button } from '../../ui';
import { DefaultInterval } from './HarmonyBar';
import { useHarmonyPrefs, applyDefaultToAll } from './useHarmony';
import type { DotLabels } from './harmonyModel';

export const HarmonySheet: React.FC = () => {
  const prefs = useHarmonyPrefs();
  const count = useStore(x => x.harmonyMaker.notes.length);
  const clear = useStore(x => x.clearHarmonyMaker);
  return (
    <>
      <div className={s.field}><span className={s.label}>Harmonize new notes by</span>
        <DefaultInterval />
        <Button size="sm" variant="ghost" disabled={count === 0} onClick={applyDefaultToAll}>Apply to every note</Button>
      </div>
      <div className={s.field}><span className={s.label}>Dot labels</span>
        <SegmentedControl<DotLabels> label="Dot labels" value={prefs.labels} onChange={prefs.setLabels}
          options={[{ value: 'order', label: 'Play order' }, { value: 'notes', label: 'Note names' }]} />
      </div>
      <div className={s.inline}><span className={s.label}>Show notes in the key</span>
        <Switch label="Show notes in the key" checked={prefs.showKey} onChange={prefs.setShowKey} />
      </div>
      <div className={s.field}><span className={s.label}>Frets</span>
        <SegmentedControl label="Frets" value={String(prefs.frets)} onChange={v => prefs.setFrets(Number(v) as 12 | 24)}
          options={[{ value: '12', label: '12' }, { value: '24', label: '24' }]} />
      </div>
      <Button variant="danger" size="sm" disabled={count === 0} onClick={clear}>Clear all notes</Button>
    </>
  );
};
