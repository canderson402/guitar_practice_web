import React, { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Minus, Plus, Play, Square, RotateCcw } from 'lucide-react';
import { startReferenceTone, stopReferenceTone, setReferenceToneFrequency } from '../../audio/referenceTone';
import s from './TuningEditor.module.css';
import { Picker, IconButton, Button, EditableNumber } from '../ui';
import { useV2Store, REFERENCE_PITCH } from '../state/useV2Store';
import { useStore } from '../../store/useStore';
import { TUNING_PRESETS } from './tunings';
import { stepNote, shiftAll, matchPreset } from './tuning';

const TEST_TONE_MS = 2000;

/** Play / stop a sine at the reference pitch. It stops by itself after 2 s
 *  (changing the pitch while it plays glides to it and gives another 2 s),
 *  and when it goes away (e.g. settings close). */
const TestTone: React.FC<{ hz: number }> = ({ hz }) => {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return undefined;
    setReferenceToneFrequency(hz);
    const id = setTimeout(() => { stopReferenceTone(); setPlaying(false); }, TEST_TONE_MS);
    return () => clearTimeout(id);
  }, [hz, playing]);
  useEffect(() => () => stopReferenceTone(), []);
  const toggle = () => {
    if (playing) stopReferenceTone(); else startReferenceTone(hz);
    setPlaying(!playing);
  };
  return (
    <IconButton size="sm" label={`Play a ${hz} Hz test tone`} active={playing} onClick={toggle}
      icon={playing ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />} />
  );
};

/** Edits the shared tuning (`note.tuning`): per-string semitone nudges,
 *  shift-all, and presets as shortcuts. Used by App settings and the
 *  Fretboard card's sheet — both are views onto the same state. */
export const TuningEditor: React.FC<{ testTone?: boolean }> = ({ testTone }) => {
  const { tuning, setTuning } = useStore(useShallow(st => ({ tuning: st.note.tuning, setTuning: st.setTuning })));
  const current = matchPreset(tuning)?.name ?? 'Custom';
  const pitch = useV2Store(st => st.referencePitch);
  const setPitch = useV2Store(st => st.setReferencePitch);
  const setString = (idx: number, delta: 1 | -1) => {
    const next = [...tuning];
    next[idx] = stepNote(next[idx], delta);
    setTuning(next);
  };
  // Stored high → low (string 1 first); shown low → high like a guitar's strings.
  const strings = tuning.map((n, idx) => ({ n, idx, num: idx + 1 })).reverse();
  return (
    <div className={s.editor}>
      <div className={s.reference}>
        <span className={s.label}>A4 =</span>
        {/* Looks like an input: the number and its unit in one box. */}
        <span className={s.field}>
          <EditableNumber label="Reference pitch (A4, Hz)" value={pitch} min={REFERENCE_PITCH.min} max={REFERENCE_PITCH.max} decimals={1}
            onChange={setPitch} className={s.hz}>{pitch}</EditableNumber>
          <span className={s.unit} aria-hidden="true">Hz</span>
        </span>
        {pitch !== REFERENCE_PITCH.default && (
          <IconButton size="sm" label="Reset to 440 Hz" icon={<RotateCcw size={12} />} onClick={() => setPitch(REFERENCE_PITCH.default)} />
        )}
        {testTone && <TestTone hz={pitch} />}
      </div>
      <span className={s.label}>Tuning · {current}</span>
      <div className={s.strings}>
        {strings.map(({ n, idx, num }) => (
          <div key={idx} className={s.string}>
            <IconButton size="sm" label={`Raise string ${num} (${n})`} icon={<Plus size={12} />} onClick={() => setString(idx, 1)} />
            <span className={s.note}>{n}</span>
            <IconButton size="sm" label={`Lower string ${num} (${n})`} icon={<Minus size={12} />} onClick={() => setString(idx, -1)} />
            <span className={s.num}>{num}</span>
          </div>
        ))}
      </div>
      <div className={s.shift}>
        <Button size="sm" aria-label="Lower all strings" onClick={() => setTuning(shiftAll(tuning, -1))}><Minus size={12} />All</Button>
        <Button size="sm" aria-label="Raise all strings" onClick={() => setTuning(shiftAll(tuning, 1))}><Plus size={12} />All</Button>
      </div>
      <Picker label="Tuning presets" value={current} columns={2}
        onChange={name => { const p = TUNING_PRESETS.find(t => t.name === name); if (p) setTuning(p.tuning); }}
        options={TUNING_PRESETS.map(p => ({ value: p.name, label: p.name }))} />
    </div>
  );
};
