import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import s from './Scale.module.css';
import { useStore } from '../../../store/useStore';
import { SegmentedControl, Stepper, Switch, Disclosure } from '../../ui';
import { KeyPicker } from '../../shell/KeyPicker';

type Mode = 'none' | 'bars' | 'time';

export const ScaleSheet: React.FC = () => {
  const n = useStore(useShallow(st => ({
    mode: st.note.changeMode as Mode, interval: st.note.changeInterval, randomize: st.note.randomize, showNext: st.note.showNextNote,
    setMode: st.setChangeMode, setInterval: st.setChangeInterval, setRandomize: st.setRandomize, setShowNext: st.setShowNextNote,
  })));
  return (
    <>
      <div className={s.field}><span className={s.label}>Key &amp; scale</span><KeyPicker /></div>
      <Disclosure title="Auto-advance" summary={n.mode === 'none' ? 'Off' : `Every ${n.interval} ${n.mode === 'time' ? 'sec' : n.interval === 1 ? 'bar' : 'bars'}`}>
        <div className={s.field}><span className={s.label}>Change notes</span>
          <SegmentedControl<Mode> label="Auto-advance" value={n.mode} onChange={n.setMode}
            options={[{ value: 'none', label: 'Off' }, { value: 'bars', label: 'Bars' }, { value: 'time', label: 'Seconds' }]} />
        </div>
        <div className={s.field}><span className={s.label}>Change every ({n.mode === 'time' ? 'seconds' : 'bars'})</span>
          <Stepper label="Change every" value={n.interval} min={1} max={64} small={1} onChange={n.setInterval} />
        </div>
        <div className={s.field}><span className={s.label}>Order</span>
          <SegmentedControl<'order' | 'random'> label="Order" value={n.randomize ? 'random' : 'order'} onChange={v => n.setRandomize(v === 'random')}
            options={[{ value: 'order', label: 'In order' }, { value: 'random', label: 'Random' }]} />
        </div>
        <div className={s.inline}><span className={s.label}>Show next note</span>
          <Switch label="Show next note" checked={n.showNext} onChange={n.setShowNext} />
        </div>
      </Disclosure>
      <p className={s.hint}>Tap any note on the card to jump to it.</p>
    </>
  );
};
