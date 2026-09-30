import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Lightbulb, Info } from 'lucide-react';
import s from './Blocks.module.css';
import type { Block } from '../types';
import { slugify } from '../articles';
import { Button } from '../../ui';
import { getScaleNotes, scales } from '../../../data/musicData';
import { playPianoNote } from '../../../audio/piano';
import { useStore } from '../../../store/useStore';
import { useV2Store } from '../../state/useV2Store';

const NOTE_PC: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

const ScaleExample: React.FC<{ root: string; scale: string; caption?: string }> = ({ root, scale, caption }) => {
  const notes = getScaleNotes(root, scale as keyof typeof scales);
  // Pending note timers — cancelled if the reader leaves mid-scale.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const play = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    // Ascending from the root in octave 4.
    let midi = 60 + (NOTE_PC[root] ?? 0);
    let prev = -1;
    notes.forEach((n, i) => {
      const pc = NOTE_PC[n] ?? 0;
      if (i > 0 && pc <= prev) midi += 12;
      prev = pc;
      const noteMidi = midi - (NOTE_PC[root] ?? 0) + pc;
      timers.current.push(setTimeout(() => void playPianoNote(noteMidi, 0.5), i * 280));
    });
  };
  return (
    <figure className={s.example}>
      <div className={s.notes}>
        {notes.map((n, i) => <span key={n + i} className={i === 0 ? s.root : s.note}>{n}</span>)}
        <Button size="sm" onClick={play}><Play size={12} />Hear it</Button>
      </div>
      {caption && <figcaption className={s.caption}>{caption}</figcaption>}
    </figure>
  );
};

export const BlockRenderer: React.FC<{ block: Block }> = ({ block }) => {
  const navigate = useNavigate();
  const shared = useStore.getState;
  const setActiveWorkspace = useV2Store(st => st.setActiveWorkspace);
  switch (block.type) {
    case 'heading': return <h2 id={slugify(block.text)} className={s.h2}>{block.text}</h2>;
    case 'paragraph': return <p className={s.p}>{block.text}</p>;
    case 'callout': return (
      <aside className={[s.callout, s[block.tone]].join(' ')}>
        {block.tone === 'tip' ? <Lightbulb size={16} /> : <Info size={16} />}<span>{block.text}</span>
      </aside>
    );
    case 'example': return <ScaleExample root={block.root} scale={block.scale} caption={block.caption} />;
    case 'tryIt': return (
      <div className={s.tryIt}>
        <Button variant="primary" onClick={() => {
          const st = shared();
          if (block.set.key) st.setSelectedNote(block.set.key);
          if (block.set.scale) st.setSelectedScale(block.set.scale);
          if (block.set.bpm) st.setBpm(block.set.bpm);
          setActiveWorkspace(block.workspaceId);
          navigate('/v2');
        }}>{block.label}</Button>
      </div>
    );
  }
};
