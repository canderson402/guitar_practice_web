import React, { useEffect, useRef } from 'react';
import {
  Renderer,
  Stave,
  StaveNote,
  Accidental,
  Formatter,
  Voice as VFVoice,
} from 'vexflow';
import { GrandStaffProps, Note, Voice, Duration } from './types';
import './GrandStaff.css';

// ---------------------------------------------------------------------------
// Reusable VexFlow-backed notation renderer. Accepts any notes in any
// quantity — single notes, chords, cross-clef multi-voice passages — across
// treble / bass / grand clef. v1 NoteReading only passes single-note arrays
// but the component itself has no such limitation.
// ---------------------------------------------------------------------------

const VF_DURATION: Record<Duration, string> = {
  whole: 'w',
  half: 'h',
  quarter: 'q',
  eighth: '8',
  sixteenth: '16',
};

// Two canonical spelling tables keyed by pitch class 0..11.
const SHARP_TABLE: Array<[string, '' | '#']> = [
  ['c', ''], ['c', '#'], ['d', ''], ['d', '#'], ['e', ''],
  ['f', ''], ['f', '#'], ['g', ''], ['g', '#'], ['a', ''], ['a', '#'], ['b', ''],
];
const FLAT_TABLE: Array<[string, '' | 'b']> = [
  ['c', ''], ['d', 'b'], ['d', ''], ['e', 'b'], ['e', ''],
  ['f', ''], ['g', 'b'], ['g', ''], ['a', 'b'], ['a', ''], ['b', 'b'], ['b', ''],
];

// Map a Note → { VexFlow key string, accidental glyph }.
// Honors the Note.spelling hint. 'natural-C' / 'natural-F' handle the
// B# / Cb / E# / Fb enharmonic cases where the letter *and* accidental both
// shift vs. the pure sharp/flat table.
const midiToVFKey = (note: Note): { key: string; accidental: '' | '#' | 'b' } => {
  const { midi, spelling = 'sharp' } = note;
  const pc = ((midi % 12) + 12) % 12;
  let letter: string;
  let acc: '' | '#' | 'b';
  let octaveAdjust = 0;

  if (spelling === 'natural-C' && (pc === 11 || pc === 0)) {
    if (pc === 0) {
      // B# — one octave below the naive C octave.
      letter = 'b'; acc = '#'; octaveAdjust = -1;
    } else {
      // Cb — one octave above the naive B octave.
      letter = 'c'; acc = 'b'; octaveAdjust = 1;
    }
  } else if (spelling === 'natural-F' && (pc === 4 || pc === 5)) {
    if (pc === 5) {
      // E#
      letter = 'e'; acc = '#';
    } else {
      // Fb
      letter = 'f'; acc = 'b';
    }
  } else if (spelling === 'flat') {
    [letter, acc] = FLAT_TABLE[pc];
  } else {
    [letter, acc] = SHARP_TABLE[pc];
  }

  const octave = Math.floor(midi / 12) - 1 + octaveAdjust;
  return { key: `${letter}/${octave}`, accidental: acc };
};

const makeStaveNote = (notes: Note[], clef: 'treble' | 'bass'): StaveNote => {
  if (notes.length === 1 && notes[0].isRest) {
    const dur = VF_DURATION[notes[0].duration ?? 'quarter'];
    return new StaveNote({
      clef,
      keys: [clef === 'bass' ? 'd/3' : 'b/4'],
      duration: `${dur}r`,
    });
  }
  const mapped = notes.map(midiToVFKey);
  const duration = VF_DURATION[notes[0].duration ?? 'whole'];
  const sn = new StaveNote({
    clef,
    keys: mapped.map(m => m.key),
    duration,
  });
  mapped.forEach((m, i) => {
    if (m.accidental) sn.addModifier(new Accidental(m.accidental), i);
  });
  notes.forEach((n, i) => {
    if (n.color) {
      sn.setKeyStyle(i, { fillStyle: n.color, strokeStyle: n.color });
    }
  });
  const allColors = notes.map(n => n.color).filter(Boolean);
  if (allColors.length === notes.length && new Set(allColors).size === 1) {
    sn.setStyle({ fillStyle: allColors[0]!, strokeStyle: allColors[0]! });
  }
  return sn;
};

export const GrandStaff: React.FC<GrandStaffProps> = ({
  notes,
  voices,
  clef = 'grand',
  width,
  className,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = '';

    // Resolve input into the Voice[] canonical form.
    const resolvedVoices: Voice[] =
      voices ??
      (notes && notes.length > 0
        ? [{ notes, clef: clef === 'grand' ? undefined : clef }]
        : []);

    const w = width ?? Math.max(host.clientWidth || 0, 320);
    const twoStaves = clef === 'grand';
    const h = twoStaves ? 220 : 140;

    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(w, h);
    const ctx = renderer.getContext();

    const treble = new Stave(20, 0, w - 40);
    treble.addClef('treble').setContext(ctx).draw();

    let bass: Stave | null = null;
    if (twoStaves) {
      bass = new Stave(20, 90, w - 40);
      bass.addClef('bass').setContext(ctx).draw();
    }

    // Partition voices into per-clef buckets. A voice without an explicit
    // clef on a grand staff is auto-assigned by its lowest MIDI: ≥60 → treble,
    // <60 → bass. Middle C itself lands on treble (sits on the ledger line).
    const trebleNotes: StaveNote[] = [];
    const bassNotes: StaveNote[] = [];

    for (const v of resolvedVoices) {
      if (v.notes.length === 0) continue;
      let targetClef: 'treble' | 'bass';
      if (v.clef) {
        targetClef = v.clef;
      } else if (clef === 'treble') {
        targetClef = 'treble';
      } else if (clef === 'bass') {
        targetClef = 'bass';
      } else {
        const lowest = Math.min(...v.notes.map(n => n.midi));
        targetClef = lowest >= 60 ? 'treble' : 'bass';
      }
      (targetClef === 'treble' ? trebleNotes : bassNotes).push(
        makeStaveNote(v.notes, targetClef),
      );
    }

    const drawInto = (stave: Stave, stavenotes: StaveNote[]) => {
      if (stavenotes.length === 0) return;
      const voice = new VFVoice({ num_beats: 4, beat_value: 4 }).setStrict(false);
      voice.addTickables(stavenotes);
      new Formatter().joinVoices([voice]).format([voice], w - 80);
      voice.draw(ctx, stave);
    };

    drawInto(treble, trebleNotes);
    if (bass) drawInto(bass, bassNotes);
  }, [notes, voices, clef, width]);

  return (
    <div
      ref={hostRef}
      className={`grand-staff ${className ?? ''}`}
      data-testid="grand-staff"
    />
  );
};
