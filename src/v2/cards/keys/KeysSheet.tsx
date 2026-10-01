import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import s from './NoteTrainer.module.css';
import { useStore } from '../../../store/useStore';
import { Switch, SegmentedControl, Stepper, Button } from '../../ui';
import { useCardPref } from '../../state/useCardPref';
import { useShuffleBag } from './shuffleBag';
import { ORDER_OPTIONS, Order } from './KeysFace';
import { PresetEditor, SavePresetButton } from './PresetChips';
import { NotePicker } from './NotePicker';
import type { Preset } from './presets';

type Mode = 'bars' | 'beats' | 'time';

export const KeysSheet: React.FC = () => {
  const st = useStore(useShallow(x => ({
    c: x.circleOfFifths, setAuto: x.setCircleAutoAdvance, setDirection: x.setCircleDirection, setRandom: x.setCircleRandomize,
    setMode: x.setCircleChangeMode, setInterval: x.setCircleChangeInterval, setCountIn: x.setCircleCountIn, setShowNext: x.setCircleShowNext,
  })));
  const order: Order = st.c.randomize ? 'random' : st.c.direction;
  const mode = (st.c.changeMode === 'none' ? 'beats' : st.c.changeMode) as Mode;
  const [hat, setHat] = useCardPref('note-trainer', 'shuffleAll', true);
  const note = useStore(x => x.note.selectedNote ?? 'C');
  const setNote = useStore(x => x.setSelectedNote);
  const resetHat = useShuffleBag(b => b.reset);
  const current: Preset = { mode, interval: st.c.changeInterval };
  return (
    <>
      <div className={s.field}><span className={s.label}>Current note</span>
        <NotePicker label="Current note" value={note} onPick={setNote} />
      </div>
      <div className={s.inline}><span className={s.label}>Auto-change</span><Switch label="Auto-change on" checked={st.c.autoAdvance} onChange={st.setAuto} /></div>
      <div className={s.field}><span className={s.label}>Order</span>
        <SegmentedControl<Order> label="Order" value={order} options={ORDER_OPTIONS}
          onChange={o => { if (o === 'random') st.setRandom(true); else { st.setRandom(false); st.setDirection(o); } }} />
      </div>
      {st.c.randomize && (
        <>
          <div className={s.inline}><span className={s.label}>Play all 12 before repeating</span>
            <Switch label="Play all 12 before repeating" checked={hat} onChange={setHat} /></div>
          {hat && <Button size="sm" variant="ghost" onClick={() => resetHat(note)}>Start a new round</Button>}
        </>
      )}
      <div className={s.field}><span className={s.label}>Change every</span>
        <SegmentedControl<Mode> label="Change unit" value={mode} onChange={st.setMode}
          options={[{ value: 'bars', label: 'Bars' }, { value: 'beats', label: 'Beats' }, { value: 'time', label: 'Seconds' }]} />
        <Stepper label="Change every" value={st.c.changeInterval} min={1} max={mode === 'beats' ? 48 : 16} small={1} onChange={st.setInterval} />
      </div>
      <div className={s.field}><span className={s.label}>Presets</span>
        <PresetEditor />
        <SavePresetButton current={current} />
      </div>
      <div className={s.field}><span className={s.label}>Count-in (beats)</span>
        <SegmentedControl label="Count-in" value={String(st.c.countIn)} onChange={v => st.setCountIn(Number(v))}
          options={[{ value: '0', label: 'None' }, { value: '1', label: '1' }, { value: '2', label: '2' }, { value: '4', label: '4' }, { value: '8', label: '8' }]} />
      </div>
      <div className={s.inline}><span className={s.label}>Show next key</span><Switch label="Show next key" checked={st.c.showNext} onChange={st.setShowNext} /></div>
    </>
  );
};
