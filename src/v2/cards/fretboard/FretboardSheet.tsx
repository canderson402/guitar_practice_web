import React from 'react';
import s from './FretboardCard.module.css';
import { SegmentedControl, Switch } from '../../ui';
import { useStore } from '../../../store/useStore';
import { TuningEditor } from '../../shell/TuningEditor';
import { useFretboardPrefs } from './useFretboardPrefs';
import type { DotLabels } from './buildDots';

export const FretboardSheet: React.FC = () => {
  const p = useFretboardPrefs();
  const view = useStore(st => st.viewMode) as 'fretboard' | 'piano';
  const setView = useStore(st => st.setViewMode);
  return (
    <>
      <div className={s.field}><span className={s.label}>View</span>
        <SegmentedControl<'fretboard' | 'piano'> label="View" value={view} onChange={setView}
          options={[{ value: 'fretboard', label: 'Fretboard' }, { value: 'piano', label: 'Piano' }]} />
      </div>
      <div className={s.inline}><span className={s.label}>Root</span><Switch label="Show root" checked={p.showRoot} onChange={p.setShowRoot} /></div>
      <div className={s.inline}><span className={s.label}>Scale</span><Switch label="Show scale" checked={p.showScale} onChange={p.setShowScale} /></div>
      <div className={s.inline}><span className={s.label}>Selected note</span><Switch label="Show selected note" checked={p.showSelected} onChange={p.setShowSelected} /></div>
      <div className={s.field}><span className={s.label}>Frets</span>
        <SegmentedControl label="Frets" value={String(p.frets)} onChange={v => p.setFrets(Number(v))}
          options={[{ value: '15', label: '15' }, { value: '24', label: '24' }]} />
      </div>
      <div className={s.field}><span className={s.label}>Dot labels</span>
        <SegmentedControl<DotLabels> label="Dot labels" value={p.labels} onChange={p.setLabels}
          options={[{ value: 'notes', label: 'Notes' }, { value: 'intervals', label: 'Intervals' }, { value: 'none', label: 'None' }]} />
      </div>
      <TuningEditor />
    </>
  );
};
