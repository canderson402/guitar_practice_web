import React from 'react';
import { FretboardProps, DotInfo, DotVariant } from '../Fretboard/types';
import {
  cellToMidi,
  midiToPitch,
  fretboardPitchRange,
  octaveAlignedRange,
  findLowestFretForPitch,
  isBlackKey,
} from '../../data/pitch';
import './PianoKeyboard.css';

// ---------------------------------------------------------------------------
// PianoKeyboard — alternative view for the same DotInfo data the Fretboard
// consumes. Accepts the same props; translates fretboard-positioned dots
// into pitch-positioned key highlights.
//
// Click resolution: pitch → (stringIndex, fret) via the lowest-fret
// heuristic. State stays fretboard-based so toggling back to the fretboard
// view preserves every note's physical position.
// ---------------------------------------------------------------------------

// Variant priority — when multiple fretboard positions produce the same
// pitch and carry different variants, the highest-priority variant wins.
// Matches the fretboard's layered display (current > base/harmony > root > scale).
const VARIANT_PRIORITY: Record<DotVariant, number> = {
  current: 6,
  base: 5,
  harmony: 5,
  alternate: 4,
  root: 3,
  scale: 2,
};

interface PitchDotInfo {
  dot: DotInfo;
  /** Sample (stringIndex, fret) — the first one found for this pitch. Used
   *  for tooltip + any debug context. Click resolution doesn't use it
   *  (we re-resolve via the lowest-fret heuristic so the user gets a
   *  predictable position regardless of which dot was rendered). */
  sampleStringIdx: number;
  sampleFret: number;
}

export const PianoKeyboard: React.FC<FretboardProps> = ({
  strings,
  fretCount,
  tuning,
  dots,
  title,
  onCellClick,
  textMode = 'white',
  clickableEmpty,
}) => {
  // Derive piano range from what the current fretboard can produce, then
  // pad out to whole octaves so the keyboard always starts on C and ends on B.
  const { min: pianoMin, max: pianoMax } = React.useMemo(() => {
    const range = fretboardPitchRange(tuning, fretCount, strings);
    if (range.length === 0) return { min: 24, max: 96 }; // safe default: C1..B7
    return octaveAlignedRange(range[0], range[range.length - 1]);
  }, [tuning, fretCount, strings]);

  // Bucket fretboard dots by pitch. For pitches hit by multiple positions,
  // keep the variant with the highest priority.
  const dotsByMidi = React.useMemo(() => {
    const m = new Map<number, PitchDotInfo>();
    dots.forEach((dot, key) => {
      const [siStr, fretStr] = key.split('-');
      const si = Number(siStr);
      const fret = Number(fretStr);
      if (Number.isNaN(si) || Number.isNaN(fret)) return;
      const midi = cellToMidi(tuning, si, fret);
      const existing = m.get(midi);
      if (
        !existing ||
        VARIANT_PRIORITY[dot.variant] > VARIANT_PRIORITY[existing.dot.variant]
      ) {
        m.set(midi, { dot, sampleStringIdx: si, sampleFret: fret });
      }
    });
    return m;
  }, [dots, tuning]);

  // Enumerate every key in range. Classify white vs black for layout.
  const keys = React.useMemo(() => {
    const result: Array<{ midi: number; pitch: ReturnType<typeof midiToPitch>; black: boolean }> = [];
    for (let midi = pianoMin; midi <= pianoMax; midi++) {
      result.push({ midi, pitch: midiToPitch(midi), black: isBlackKey(midi) });
    }
    return result;
  }, [pianoMin, pianoMax]);

  const whiteKeys = keys.filter(k => !k.black);
  const blackKeys = keys.filter(k => k.black);

  const handleKeyClick = (midi: number) => {
    if (!onCellClick) return;
    const target = findLowestFretForPitch(tuning, midi, fretCount, strings);
    if (!target) return;
    // Look up the note name at that position from the tuning calc.
    const pitch = midiToPitch(midi);
    onCellClick(target.stringIndex, target.fret, pitch.name);
  };

  const renderKey = (
    midi: number,
    pitch: ReturnType<typeof midiToPitch>,
    black: boolean,
    idx: number
  ) => {
    const info = dotsByMidi.get(midi);
    const dot = info?.dot;
    const classes = [
      'piano-key',
      black ? 'black' : 'white',
      dot ? `variant-${dot.variant}` : '',
      dot?.nonDiatonic ? 'non-diatonic' : '',
      dot?.faint ? 'faint' : '',
      dot?.dropTargetHint ? 'drop-target' : '',
      clickableEmpty && !dot ? 'clickable-empty' : '',
    ]
      .filter(Boolean)
      .join(' ');
    const style = dot?.color
      ? ({ ['--piano-key-color' as any]: dot.color } as React.CSSProperties)
      : undefined;
    const labelText = dot?.label ?? (dot ? pitch.name : '');
    return (
      <button
        key={idx}
        type="button"
        className={classes}
        style={style}
        onClick={() => handleKeyClick(midi)}
        title={`${pitch.name}${pitch.octave}`}
      >
        {dot && (
          <span className="piano-key-dot">
            <span className="piano-key-label">{labelText}</span>
          </span>
        )}
        {!dot && !black && <span className="piano-key-name">{pitch.name}</span>}
      </button>
    );
  };

  return (
    <div className={`piano-root ${textMode}-text-mode`}>
      {title && <div className="piano-title">{title}</div>}
      <div className="piano-keyboard">
        {/* White keys flow left-to-right, equal width. */}
        <div className="piano-white-row">
          {whiteKeys.map((k, i) => renderKey(k.midi, k.pitch, false, i))}
        </div>
        {/* Black keys overlay on top. Position them by white-key index. */}
        <div className="piano-black-row">
          {blackKeys.map((k) => {
            // Black key sits on the boundary between two white keys. Find its
            // left offset as a percentage of the white-key row.
            const whiteBefore = whiteKeys.filter(w => w.midi < k.midi).length;
            const leftPct = (whiteBefore / whiteKeys.length) * 100;
            const widthPct = (1 / whiteKeys.length) * 100;
            return (
              <div
                key={k.midi}
                className="piano-black-position"
                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
              >
                {renderKey(k.midi, k.pitch, true, k.midi)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
