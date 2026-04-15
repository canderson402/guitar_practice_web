import React from 'react';
import { useStore } from '../store/useStore';
import {
  notes,
  getScaleNotes,
  scales,
  getChromaticScale,
  chordTypes,
  getChordChromaticPositions,
  getChordIntervalName,
} from '../data/musicData';
import { generateFretboard, isNoteInScale } from '../data/guitarData';
import { Checkbox } from '../ui';
import { Fretboard, DotInfo, posKey } from './Fretboard';
import { TuningPicker } from './TuningPicker';
import './GuitarNeckNew.css';

// ---------------------------------------------------------------------------
// GuitarNeck — scale/chord-aware fretboard view. Builds a DotInfo map from
// the global scale, root, chord, and cycle state, then hands it to the shared
// Fretboard primitive. No per-note DOM rendering happens here.
// ---------------------------------------------------------------------------

const CHROMATIC_INTERVALS = ['1', '♭2', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7'];

// Swatch colors (legend-coded) by white-vs-black text mode, mirroring the
// GuitarNeck's historic palette.
const SWATCHES = {
  root: { white: '#1E90FF', black: '#87CEEB' },
  scale: { white: '#228B22', black: '#90EE90' },
  current: { white: '#FF8C00', black: '#FFD700' },
};

export const GuitarNeck: React.FC = () => {
  const { note, setSelectedScale } = useStore();
  const [show24Frets, setShow24Frets] = React.useState(false);
  const [showRoot, setShowRoot] = React.useState(true);
  const [showScale, setShowScale] = React.useState(true);
  const [showCurrent, setShowCurrent] = React.useState(true);
  const [whiteText, setWhiteText] = React.useState(true);
  const [showIntervals, setShowIntervals] = React.useState(false);

  // Validate selected scale and reset if invalid
  React.useEffect(() => {
    if (note.selectedScale && !scales[note.selectedScale as keyof typeof scales]) {
      setSelectedScale('Major (Ionian)');
    }
  }, [note.selectedScale, setSelectedScale]);

  const fretCount = show24Frets ? 24 : 15;
  const fretboard = React.useMemo(
    () => generateFretboard(note.tuning, fretCount),
    [note.tuning, fretCount]
  );

  // Current scale notes (or chromatic if no scale selected).
  const currentNotes = note.selectedScale && note.selectedNote
    ? getScaleNotes(note.selectedNote, note.selectedScale as keyof typeof scales)
    : note.selectedNote
    ? getChromaticScale(note.selectedNote)
    : notes;

  // Chord-focus mode short-circuits the scale overlay.
  const selectedChord = note.selectedChord;
  const chordType = selectedChord
    ? (selectedChord.type as keyof typeof chordTypes)
    : null;
  const chordPositions = selectedChord && chordType
    ? getChordChromaticPositions(selectedChord.note, chordType)
    : null;

  // The currently cycled scale note (drives the orange "current" dot).
  const currentHighlightNote = currentNotes.length > 0
    ? currentNotes[Math.min(note.currentNoteIndex, currentNotes.length - 1)]
    : null;

  // Tiny local helpers — same math the old version used.
  const getChromaticPosition = (noteName: string): number => {
    const chromaticMap: { [key: string]: number } = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
      'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };
    return chromaticMap[noteName] ?? 0;
  };

  const areNotesEquivalent = (a: string, b: string) =>
    getChromaticPosition(a) === getChromaticPosition(b);

  // Scale-aware interval label for a given note.
  const getInterval = (targetNote: string): string | null => {
    if (!note.selectedNote) return null;
    const rootPos = getChromaticPosition(note.selectedNote);
    const targetPos = getChromaticPosition(targetNote);
    const semis = (targetPos - rootPos + 12) % 12;

    if (note.selectedScale) {
      const idx = currentNotes.findIndex(n => areNotesEquivalent(n, targetNote));
      if (idx !== -1) {
        const scale = scales[note.selectedScale as keyof typeof scales];
        if (scale?.description) {
          const names = scale.description.split(' - ');
          return names[idx] || CHROMATIC_INTERVALS[semis];
        }
      }
    }
    return CHROMATIC_INTERVALS[semis];
  };

  // "Interval: X" label for the current-cycle checkbox.
  const getCurrentScaleInterval = (): string | null => {
    if (!note.selectedNote || !currentNotes.length) return null;
    const idx = Math.min(note.currentNoteIndex, currentNotes.length - 1);
    if (note.selectedScale) {
      const scale = scales[note.selectedScale as keyof typeof scales];
      if (scale?.description) {
        const names = scale.description.split(' - ');
        return names[idx] || `${idx + 1}`;
      }
    }
    if (!note.selectedScale && currentNotes[idx]) {
      const semis = (getChromaticPosition(currentNotes[idx]) - getChromaticPosition(note.selectedNote) + 12) % 12;
      return CHROMATIC_INTERVALS[semis];
    }
    return `${idx + 1}`;
  };

  const currentInterval = getCurrentScaleInterval();

  // Build the dots map. Priority when multiple could apply: current > root > scale.
  const dots = React.useMemo(() => {
    const m = new Map<string, DotInfo>();
    const textMode: 'white' | 'black' = whiteText ? 'white' : 'black';

    for (let si = 0; si < fretboard.length; si++) {
      for (let f = 0; f <= fretCount; f++) {
        const cell = fretboard[si][f];
        if (!cell) continue;
        const fretNoteName = cell.note;
        const fretChromatic = getChromaticPosition(fretNoteName);

        // In chord-focus mode: only chord tones. Chord root → root dot;
        // other chord tones → scale dot. "Current" is suppressed.
        if (chordPositions) {
          if (!chordPositions.includes(fretChromatic)) continue;
          const isRoot = selectedChord && areNotesEquivalent(fretNoteName, selectedChord.note);
          const label = showIntervals && selectedChord && chordType
            ? getChordIntervalName(fretNoteName, selectedChord.note, chordType) ?? fretNoteName
            : fretNoteName;
          if (isRoot) {
            if (!showRoot) continue;
            m.set(posKey(si, f), {
              variant: 'root',
              label,
              color: SWATCHES.root[textMode],
            });
          } else {
            if (!showScale) continue;
            m.set(posKey(si, f), {
              variant: 'scale',
              label,
              color: SWATCHES.scale[textMode],
            });
          }
          continue;
        }

        // Scale mode: decide dot by priority (current > root > scale).
        const isCurrent = currentHighlightNote
          && areNotesEquivalent(fretNoteName, currentHighlightNote);
        const isRoot = note.selectedNote
          && areNotesEquivalent(fretNoteName, note.selectedNote);
        const inScale = currentNotes.length > 0
          && isNoteInScale(fretNoteName, currentNotes);

        const label = showIntervals ? getInterval(fretNoteName) ?? fretNoteName : fretNoteName;

        if (isCurrent && showCurrent) {
          m.set(posKey(si, f), {
            variant: 'current',
            label,
            color: SWATCHES.current[textMode],
          });
        } else if (isRoot && showRoot) {
          m.set(posKey(si, f), {
            variant: 'root',
            label,
            color: SWATCHES.root[textMode],
          });
        } else if (inScale && showScale) {
          m.set(posKey(si, f), {
            variant: 'scale',
            label,
            color: SWATCHES.scale[textMode],
          });
        }
      }
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fretboard, fretCount,
    chordPositions, selectedChord, chordType,
    note.selectedNote, note.selectedScale, note.currentNoteIndex,
    currentHighlightNote, showIntervals, showRoot, showScale, showCurrent,
    whiteText,
  ]);

  return (
    <div className="guitar-neck">
      <div className={`neck-info ${whiteText ? 'white-text-mode' : 'black-text-mode'}`}>
        <div className="neck-controls">
          <TuningPicker />
          <Checkbox checked={whiteText} onCheckedChange={setWhiteText} label="White Text" />
          <Checkbox checked={show24Frets} onCheckedChange={setShow24Frets} label="Show 24 frets" />
          <Checkbox
            checked={showRoot}
            onCheckedChange={setShowRoot}
            label="Root"
            swatchColor={SWATCHES.root[whiteText ? 'white' : 'black']}
          />
          <Checkbox
            checked={showScale}
            onCheckedChange={setShowScale}
            label="Scale"
            swatchColor={SWATCHES.scale[whiteText ? 'white' : 'black']}
          />
          <Checkbox
            checked={showCurrent && !selectedChord}
            onCheckedChange={setShowCurrent}
            disabled={!!selectedChord}
            label={`Interval${currentInterval && !selectedChord ? `: ${currentInterval}` : ''}`}
            swatchColor={SWATCHES.current[whiteText ? 'white' : 'black']}
            title={selectedChord ? 'Disabled while a chord is highlighted' : undefined}
          />
          <Checkbox checked={showIntervals} onCheckedChange={setShowIntervals} label="Show Intervals" />
        </div>

        {selectedChord ? (
          <div className="scale-info">
            <span className="scale-name">
              {selectedChord.note}{selectedChord.symbol} ({selectedChord.roman})
            </span>
            <span className="scale-context">
              in {note.selectedNote} {note.selectedScale}
            </span>
          </div>
        ) : note.selectedScale && note.selectedNote ? (
          <div className="scale-info">
            <span className="scale-name">{note.selectedNote} {note.selectedScale}</span>
          </div>
        ) : !note.selectedScale && note.selectedNote ? (
          <div className="scale-info">
            <span className="scale-name">Chromatic</span>
          </div>
        ) : null}
      </div>

      <Fretboard
        strings={6}
        fretCount={fretCount}
        tuning={note.tuning}
        dots={dots}
        textMode={whiteText ? 'white' : 'black'}
        showFretNumbers="bottom"
      />
    </div>
  );
};
