import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ChevronDown } from 'lucide-react';
import s from './Scale.module.css';
import { useStore } from '../../../store/useStore';
import { useV2Store } from '../../state/useV2Store';
import { getScaleNotes, getChromaticScale, scales } from '../../../data/musicData';
import { intervalSymbol, intervalName, scaleDegreeLabels } from '../../music/intervals';
import { scaleShortName } from '../../shell/KeyPicker';
import { useScaleAdvance } from './useScaleAdvance';
import { HeroFace } from '../HeroFace';
import { ChipButton, ChipSub } from '../../ui';
import { useScalePlayback } from './ScalePlay';

export const ScaleFace: React.FC = () => {
  const n = useStore(useShallow(st => ({
    root: st.note.selectedNote, scale: st.note.selectedScale, index: st.note.currentNoteIndex,
    nextIndex: st.note.nextNoteIndex, showNext: st.note.showNextNote, setIndex: st.setCurrentNoteIndex,
  })));
  const setOverlay = useV2Store(st => st.setOverlay);
  const selected = useV2Store(st => st.noteSelected);
  const setSelected = useV2Store(st => st.setNoteSelected);

  const notes = n.root
    ? (n.scale && scales[n.scale as keyof typeof scales] ? getScaleNotes(n.root, n.scale as keyof typeof scales) : getChromaticScale(n.root))
    : [];
  const degrees = (n.scale && scaleDegreeLabels(n.scale)) || notes.map(x => intervalSymbol(n.root ?? 'C', x));
  useScaleAdvance(notes.length);

  // While the header's Play button plays the scale, only the sounding note is lit.
  const step = useScalePlayback(st => st.step);

  if (!n.root || notes.length === 0) return <div className={s.face}>Pick a key from the dock.</div>;
  const idx = Math.min(n.index, notes.length - 1);
  const current = notes[idx];
  const degree = degrees[idx];

  return (
    <HeroFace
      top={
        <button type="button" className={s.keyBtn} onClick={() => setOverlay({ kind: 'cardSheet', cardId: 'scale' })}>
          {n.root} {scaleShortName(n.scale)} <ChevronDown size={12} aria-hidden="true" />
        </button>
      }
      hero={selected ? current : '—'}
      caption={selected ? <>{degree} · {intervalName(degree) ?? `degree ${idx + 1}`}</> : 'Tap a note to select it'}
      controls={
        <div className={s.notes}>
          {notes.map((note, i) => (
            <ChipButton key={note + i} aria-label={`${note}, ${degrees[i]}`} aria-pressed={selected && i === idx}
              // While playing, only the sounding note is lit (the octave step lights the root again).
              selected={step !== null ? step % notes.length === i : selected && i === idx}
              aria-current={step !== null && step % notes.length === i ? 'step' : undefined}
              className={[s.chip, step === null && selected && n.showNext && i === n.nextIndex && i !== idx ? s.next : ''].join(' ')}
              // Tapping the selected note again deselects it (like a chord).
              onClick={() => { if (selected && i === idx) setSelected(false); else { n.setIndex(i); setSelected(true); } }}>
              <b>{note}</b><ChipSub>{degrees[i]}</ChipSub>
            </ChipButton>
          ))}
        </div>
      }
    />
  );
};
