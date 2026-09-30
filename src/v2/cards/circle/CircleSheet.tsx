import React from 'react';
import s from './Circle.module.css';
import { SegmentedControl } from '../../ui';
import { KeyPicker } from '../../shell/KeyPicker';
import { useCardPref } from '../../state/useCardPref';

type Ring = 'chords' | 'relatives';

export const CircleSheet: React.FC = () => {
  const [ring, setRing] = useCardPref<Ring>('circle-of-fifths', 'ring', 'chords');
  return (
    <>
      <div className={s.field}><span className={s.label}>Key &amp; scale</span><KeyPicker /></div>
      <div className={s.field}><span className={s.label}>Inner ring</span>
        <SegmentedControl<Ring> label="Inner ring" value={ring} onChange={setRing}
          options={[{ value: 'chords', label: 'Chords in the key' }, { value: 'relatives', label: 'Relative keys' }]} />
      </div>
      <p className={s.hint}>Click any key on the circle to make it the current key.</p>
    </>
  );
};
