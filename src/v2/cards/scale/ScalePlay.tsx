import React, { useEffect } from 'react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { Play, Square } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { getChromaticPosition, scales } from '../../../data/musicData';
import { preloadGuitar } from '../../../audio/guitar';
import { playSteps } from '../harmony/playback';
import { IconButton } from '../../ui';

// The root's MIDI note in the guitar's low register: E2 (40) up to D#3 (51).
const rootMidi = (root: string) => 40 + (getChromaticPosition(root) - 4 + 12) % 12;

/** The scale being played: the step sounding now (null when stopped). Shared
 *  so the face can light each note while the header button plays them. */
export const useScalePlayback = create<{ step: number | null; stop: (() => void) | null }>(() => ({ step: null, stop: null }));

/** Header button: plays the scale going up, one note per beat at the tempo,
 *  ending on the octave. Tap again to stop. */
export const ScalePlayButton: React.FC = () => {
  const n = useStore(useShallow(st => ({ root: st.note.selectedNote, scale: st.note.selectedScale, bpm: st.metronome.bpm })));
  const playing = useScalePlayback(st => st.stop !== null);
  useEffect(() => { void preloadGuitar(); return () => useScalePlayback.getState().stop?.(); }, []);

  const toggle = () => {
    const { stop } = useScalePlayback.getState();
    if (stop) { stop(); return; }
    if (!n.root) return;
    // Chromatic (or no scale) plays all twelve.
    const intervals = (n.scale && scales[n.scale as keyof typeof scales]?.intervals) || Array.from({ length: 12 }, (_, i) => i);
    const base = rootMidi(n.root);
    const steps = [...intervals, 12].map(i => [base + i]);
    useScalePlayback.setState({
      stop: playSteps(steps, n.bpm, step => useScalePlayback.setState({ step }),
        () => useScalePlayback.setState({ step: null, stop: null })),
    });
  };

  return (
    <IconButton size="sm" label={playing ? 'Stop scale' : 'Play scale'} disabled={!n.root}
      icon={playing ? <Square size={12} fill="currentColor" /> : <Play size={14} />}
      onPointerDown={e => e.stopPropagation()} onClick={toggle} />
  );
};
