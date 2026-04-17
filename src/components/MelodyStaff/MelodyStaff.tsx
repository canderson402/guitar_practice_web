import React, { useEffect, useRef } from 'react';
import {
  Renderer,
  Stave,
  StaveNote,
  Accidental,
  Formatter,
  Voice as VFVoice,
  Barline,
  Beam,
  StaveConnector,
} from 'vexflow';
import type { Duration, Spelling } from '../GrandStaff';
import type { MelodyElement, TimeSignature } from '../../data/famousMelodies';
import './MelodyStaff.css';

// VexFlow redraws are expensive (SVG layout for N notes across M measures),
// so MelodyStaff separates layout from highlighting:
//
//   - Effect 1 (deps: melody shape) re-runs VexFlow and captures a map of
//     playable-note-index → rendered <g> element.
//   - Effect 2 (deps: highlight) just toggles CSS classes on those groups.
//
// This keeps button-press → recolor at a single DOM class write, not a full
// VexFlow re-layout.

const VF_DURATION: Record<Duration, string> = {
  whole: 'w',
  half: 'h',
  quarter: 'q',
  eighth: '8',
  sixteenth: '16',
};

const SHARP_TABLE: Array<[string, '' | '#']> = [
  ['c', ''], ['c', '#'], ['d', ''], ['d', '#'], ['e', ''],
  ['f', ''], ['f', '#'], ['g', ''], ['g', '#'], ['a', ''], ['a', '#'], ['b', ''],
];
const FLAT_TABLE: Array<[string, '' | 'b']> = [
  ['c', ''], ['d', 'b'], ['d', ''], ['e', 'b'], ['e', ''],
  ['f', ''], ['g', 'b'], ['g', ''], ['a', 'b'], ['a', ''], ['b', 'b'], ['b', ''],
];

const spellingFromLabel = (label: string): Spelling => {
  if (label === 'B#' || label === 'Cb') return 'natural-C';
  if (label === 'E#' || label === 'Fb') return 'natural-F';
  if (label.includes('b')) return 'flat';
  if (label.includes('#')) return 'sharp';
  return 'sharp';
};

const midiToVFKey = (
  midi: number,
  spelling: Spelling,
): { key: string; accidental: '' | '#' | 'b' } => {
  const pc = ((midi % 12) + 12) % 12;
  let letter: string;
  let acc: '' | '#' | 'b';
  let octaveAdjust = 0;

  if (spelling === 'natural-C' && (pc === 11 || pc === 0)) {
    if (pc === 0) { letter = 'b'; acc = '#'; octaveAdjust = -1; }
    else { letter = 'c'; acc = 'b'; octaveAdjust = 1; }
  } else if (spelling === 'natural-F' && (pc === 4 || pc === 5)) {
    if (pc === 5) { letter = 'e'; acc = '#'; }
    else { letter = 'f'; acc = 'b'; }
  } else if (spelling === 'flat') {
    [letter, acc] = FLAT_TABLE[pc];
  } else {
    [letter, acc] = SHARP_TABLE[pc];
  }

  const octave = Math.floor(midi / 12) - 1 + octaveAdjust;
  return { key: `${letter}/${octave}`, accidental: acc };
};

// Per-letter accidental for each supported key signature. Letters absent
// from a map are natural in that key.
const KEY_SIG_ACCIDENTALS: Record<string, Record<string, '#' | 'b'>> = {
  C:  {},
  G:  { F: '#' },
  D:  { F: '#', C: '#' },
  A:  { F: '#', C: '#', G: '#' },
  E:  { F: '#', C: '#', G: '#', D: '#' },
  B:  { F: '#', C: '#', G: '#', D: '#', A: '#' },
  F:  { B: 'b' },
  Bb: { B: 'b', E: 'b' },
  Eb: { B: 'b', E: 'b', A: 'b' },
  Ab: { B: 'b', E: 'b', A: 'b', D: 'b' },
  Db: { B: 'b', E: 'b', A: 'b', D: 'b', G: 'b' },
};

const buildStaveNote = (
  el: MelodyElement,
  clef: 'treble' | 'bass',
  keySignature?: string,
): StaveNote => {
  const dur = VF_DURATION[el.duration];
  if (el.kind === 'rest') {
    return new StaveNote({
      clef,
      keys: [clef === 'bass' ? 'd/3' : 'b/4'],
      duration: `${dur}r`,
    });
  }
  const spelling = spellingFromLabel(el.spelling);
  const { key, accidental } = midiToVFKey(el.midi, spelling);
  const sn = new StaveNote({ clef, keys: [key], duration: dur });
  // Suppress inline accidental if it's already implied by the key sig.
  // Show a natural sign if the letter carries an accidental in the key but
  // this note plays natural.
  const letter = key.charAt(0).toUpperCase();
  const keySigAcc = keySignature ? KEY_SIG_ACCIDENTALS[keySignature]?.[letter] : undefined;
  if (accidental) {
    if (keySigAcc !== accidental) sn.addModifier(new Accidental(accidental), 0);
  } else if (keySigAcc) {
    sn.addModifier(new Accidental('n'), 0);
  }
  return sn;
};

export interface MelodyStaffProps {
  measures: MelodyElement[][];
  timeSignature: TimeSignature;
  keySignature?: string;
  currentNoteIndex: number;
  currentJustCompleted?: boolean;
  width?: number;
  /** 'grand' draws treble + bass joined with a brace; single-clef otherwise. */
  clef?: 'treble' | 'bass' | 'grand';
}

export const MelodyStaff: React.FC<MelodyStaffProps> = ({
  measures,
  timeSignature,
  keySignature,
  currentNoteIndex,
  currentJustCompleted,
  width,
  clef = 'treble',
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  // playable-note-index → its rendered <g class="vf-stavenote"> element.
  // Rests are not entered here (they have no highlight state).
  const noteElsRef = useRef<Array<SVGGElement | null>>([]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = '';
    noteElsRef.current = [];

    const isGrand = clef === 'grand';
    const singleClef: 'treble' | 'bass' = clef === 'bass' ? 'bass' : 'treble';

    // Build voices + beams per measure, then ask VexFlow how wide each one
    // needs to be so notes don't collide. Wide pitch spread (2-octave arps)
    // and accidentals both inflate the minimum; hard-coded px-per-note
    // under-shoots those cases, causing overlap.
    //
    // In grand-staff mode we split per-note: each note goes on the clef its
    // pitch belongs to (≥ MIDI 60 → treble, else bass); the opposite staff
    // gets a rest of equal duration at the same tick so the two voices stay
    // rhythmically aligned.
    type MeasureBuild = {
      topVoice: VFVoice;
      bottomVoice: VFVoice | null;
      topBeams: Beam[];
      bottomBeams: Beam[];
      minContentWidth: number;
    };

    const tickablePlan: Array<{ noteIndex: number; sn: StaveNote }> = [];
    let playableSoFar = 0;

    const buildVoice = (notes: StaveNote[]): VFVoice => {
      const v = new VFVoice({
        num_beats: timeSignature.beats,
        beat_value: timeSignature.beatValue,
      }).setStrict(false);
      v.addTickables(notes);
      return v;
    };

    const restAt = (c: 'treble' | 'bass', dur: Duration): StaveNote =>
      new StaveNote({
        clef: c,
        keys: [c === 'bass' ? 'd/3' : 'b/4'],
        duration: `${VF_DURATION[dur]}r`,
      });

    const builds: MeasureBuild[] = measures.map((measure) => {
      if (!isGrand) {
        const notes: StaveNote[] = measure.map((el) =>
          buildStaveNote(el, singleClef, keySignature),
        );
        measure.forEach((el, i) =>
          tickablePlan.push({
            noteIndex: el.kind === 'note' ? playableSoFar++ : -1,
            sn: notes[i],
          }),
        );
        const topVoice = buildVoice(notes);
        const calc = new Formatter();
        calc.joinVoices([topVoice]);
        const minW = calc.preCalculateMinTotalWidth([topVoice]);
        return {
          topVoice,
          bottomVoice: null,
          topBeams: Beam.generateBeams(notes),
          bottomBeams: [],
          minContentWidth: minW,
        };
      }

      // Grand staff — per-note clef split, rhythm-matched rest in the other
      // voice at each tick. Rests in the source appear as rests on both.
      const trebleSlots: StaveNote[] = [];
      const bassSlots: StaveNote[] = [];
      const trebleSlotIsRealNote: boolean[] = [];
      const bassSlotIsRealNote: boolean[] = [];
      const slotPlayableIndex: number[] = [];

      measure.forEach((el) => {
        if (el.kind === 'rest') {
          trebleSlots.push(restAt('treble', el.duration));
          bassSlots.push(restAt('bass', el.duration));
          trebleSlotIsRealNote.push(false);
          bassSlotIsRealNote.push(false);
          slotPlayableIndex.push(-1);
          return;
        }
        const noteClef: 'treble' | 'bass' = el.midi >= 60 ? 'treble' : 'bass';
        const realNote = buildStaveNote(el, noteClef, keySignature);
        if (noteClef === 'treble') {
          trebleSlots.push(realNote);
          bassSlots.push(restAt('bass', el.duration));
          trebleSlotIsRealNote.push(true);
          bassSlotIsRealNote.push(false);
        } else {
          trebleSlots.push(restAt('treble', el.duration));
          bassSlots.push(realNote);
          trebleSlotIsRealNote.push(false);
          bassSlotIsRealNote.push(true);
        }
        slotPlayableIndex.push(playableSoFar++);
      });

      // Draw order per measure: top voice (treble) first, then bottom (bass).
      // tickablePlan must mirror that order so the SVG-group lookup lines up.
      trebleSlots.forEach((sn, k) =>
        tickablePlan.push({
          noteIndex: trebleSlotIsRealNote[k] ? slotPlayableIndex[k] : -1,
          sn,
        }),
      );
      bassSlots.forEach((sn, k) =>
        tickablePlan.push({
          noteIndex: bassSlotIsRealNote[k] ? slotPlayableIndex[k] : -1,
          sn,
        }),
      );

      const topVoice = buildVoice(trebleSlots);
      const bottomVoice = buildVoice(bassSlots);
      const calc = new Formatter();
      calc.joinVoices([topVoice, bottomVoice]);
      const minW = calc.preCalculateMinTotalWidth([topVoice, bottomVoice]);

      return {
        topVoice,
        bottomVoice,
        topBeams: Beam.generateBeams(trebleSlots),
        bottomBeams: Beam.generateBeams(bassSlots),
        minContentWidth: minW,
      };
    });

    const KEY_SIG_ACC_COUNT = keySignature
      ? Object.keys(KEY_SIG_ACCIDENTALS[keySignature] ?? {}).length
      : 0;
    const CLEF_PAD = 60 + KEY_SIG_ACC_COUNT * 10;
    // The formatter's min width doesn't include the breathing room humans
    // want; these pads keep notes off the barlines.
    const CONTENT_PAD = 40;
    const MIN_CONTENT = 140;

    const contentWidths = builds.map((b) =>
      Math.max(MIN_CONTENT, Math.ceil(b.minContentWidth) + CONTENT_PAD),
    );
    const staveWidths = contentWidths.map((w, i) => (i === 0 ? w + CLEF_PAD : w));
    const totalW = 40 + staveWidths.reduce((a, b) => a + b, 0);
    const w = width ?? totalW;
    const trebleY = 10;
    const bassY = 100;
    const h = isGrand ? 200 : 120;

    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(w, h);
    const ctx = renderer.getContext();

    const tsString = `${timeSignature.beats}/${timeSignature.beatValue}`;

    let x = 20;
    builds.forEach((build, mi) => {
      const staveW = staveWidths[mi];

      const topStave = new Stave(x, trebleY, staveW);
      const bottomStave = isGrand ? new Stave(x, bassY, staveW) : null;

      if (mi === 0) {
        topStave.addClef(isGrand ? 'treble' : singleClef);
        if (keySignature) topStave.addKeySignature(keySignature);
        topStave.addTimeSignature(tsString);
        if (bottomStave) {
          bottomStave.addClef('bass');
          if (keySignature) bottomStave.addKeySignature(keySignature);
          bottomStave.addTimeSignature(tsString);
        }
      }

      topStave.setEndBarType(Barline.type.SINGLE);
      topStave.setContext(ctx).draw();
      if (bottomStave) {
        bottomStave.setEndBarType(Barline.type.SINGLE);
        bottomStave.setContext(ctx).draw();
        if (mi === 0) {
          new StaveConnector(topStave, bottomStave)
            .setType(StaveConnector.type.BRACE).setContext(ctx).draw();
          new StaveConnector(topStave, bottomStave)
            .setType(StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();
        }
        new StaveConnector(topStave, bottomStave)
          .setType(StaveConnector.type.SINGLE_RIGHT).setContext(ctx).draw();
      }

      const formatWidth = staveW - (mi === 0 ? CLEF_PAD + 20 : 20);
      const voicesForFormat = build.bottomVoice
        ? [build.topVoice, build.bottomVoice]
        : [build.topVoice];
      new Formatter()
        .joinVoices(voicesForFormat)
        .format(voicesForFormat, formatWidth);
      build.topVoice.draw(ctx, topStave);
      if (build.bottomVoice && bottomStave) {
        build.bottomVoice.draw(ctx, bottomStave);
      }
      build.topBeams.forEach((b) => b.setContext(ctx).draw());
      build.bottomBeams.forEach((b) => b.setContext(ctx).draw());

      x += staveW;
    });

    // Query the rendered SVG. `.vf-stavenote` groups appear in draw order,
    // one per tickable across all voices — tickablePlan is populated in the
    // same order (per measure: melody notes first, then the bass filler).
    const svgGroups = host.querySelectorAll<SVGGElement>('g.vf-stavenote');
    const playableNoteCount = tickablePlan.filter(t => t.noteIndex >= 0).length;
    const arr: Array<SVGGElement | null> = new Array(playableNoteCount).fill(null);
    tickablePlan.forEach((plan, i) => {
      if (plan.noteIndex < 0) return;
      arr[plan.noteIndex] = svgGroups.item(i) ?? null;
    });
    noteElsRef.current = arr;
  }, [measures, timeSignature, keySignature, width, clef]);

  // Recolor only — no VexFlow work, just CSS class flips.
  useEffect(() => {
    noteElsRef.current.forEach((el, i) => {
      if (!el) return;
      el.classList.remove('note-done', 'note-current');
      if (i < currentNoteIndex) {
        el.classList.add('note-done');
      } else if (i === currentNoteIndex) {
        el.classList.add(currentJustCompleted ? 'note-done' : 'note-current');
      }
    });
  }, [currentNoteIndex, currentJustCompleted, measures]);

  return (
    <div
      ref={hostRef}
      className="melody-staff"
      data-testid="melody-staff"
    />
  );
};
