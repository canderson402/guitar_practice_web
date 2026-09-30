import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ChevronDown } from 'lucide-react';
import s from './Chords.module.css';
import { useStore } from '../../../store/useStore';
import { useV2Store } from '../../state/useV2Store';
import { getScaleChords, scales } from '../../../data/musicData';
import { scaleShortName } from '../../shell/KeyPicker';
import { HeroFace } from '../HeroFace';

/** The chords of the shared key and scale. Picking one selects it app-wide
 *  (the Fretboard highlights its tones); picking it again clears it. */
export const ChordsFace: React.FC = () => {
  const n = useStore(useShallow(st => ({
    root: st.note.selectedNote, scale: st.note.selectedScale, selected: st.note.selectedChord, setChord: st.setSelectedChord,
  })));
  const setOverlay = useV2Store(st => st.setOverlay);
  const valid = n.root && n.scale && scales[n.scale as keyof typeof scales] && n.scale !== 'Chromatic';
  const chords = valid ? getScaleChords(n.root!, n.scale as keyof typeof scales) : [];
  const active = n.selected;
  return (
    <HeroFace
      top={
        <button type="button" className={s.keyBtn} onClick={() => setOverlay({ kind: 'cardSheet', cardId: 'chord' })}>
          {n.root ?? '—'} {scaleShortName(n.scale)} <ChevronDown size={12} aria-hidden="true" />
        </button>
      }
      hero={active ? `${active.note}${active.symbol}` : '—'}
      caption={active ? `${active.roman} · ${active.type}` : chords.length ? 'Pick a chord' : 'No chords for this scale'}
      controls={
        <div className={s.chips}>
          {chords.map(c => {
            const on = !!active && active.note === c.note && active.type === c.type;
            return (
              <button key={c.roman} type="button" aria-label={`${c.note}${c.symbol}, ${c.roman}`} aria-pressed={on}
                className={[s.chip, on ? s.on : ''].join(' ')}
                onClick={() => n.setChord(on ? null : { note: c.note, type: c.type, symbol: c.symbol, roman: c.roman })}>
                <b>{c.note}{c.symbol}</b><span>{c.roman}</span>
              </button>
            );
          })}
        </div>
      }
    />
  );
};
