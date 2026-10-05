import React from 'react';
import { DotInfo } from '../Fretboard/types';
import { midiToPitch, isBlackKey } from '../../data/pitch';
import './PianoKeyboard.css';

// ---------------------------------------------------------------------------
// PianoKeyboard — a fixed keyboard (C2–B5 by default), independent of any
// guitar tuning: each key's highlight comes from `dotFor(midi)`, and every
// key is clickable.
// ---------------------------------------------------------------------------

interface Props {
  /** Lowest and highest keys (MIDI). Default C2–B5. */
  low?: number;
  high?: number;
  /** The highlight for a key, if any. */
  dotFor(midi: number): DotInfo | null | undefined;
  /** A key was clicked (its MIDI note and note name). */
  onKeyClick?(midi: number, note: string): void;
  title?: string;
  textMode?: 'white' | 'black';
  clickableEmpty?: boolean;
}

export const PianoKeyboard: React.FC<Props> = ({
  low = 36,
  high = 83,
  dotFor,
  onKeyClick,
  title,
  textMode = 'white',
  clickableEmpty,
}) => {
  const pianoMin = low;
  const pianoMax = high;

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

  const handleKeyClick = (midi: number) => onKeyClick?.(midi, midiToPitch(midi).name);

  const renderKey = (
    midi: number,
    pitch: ReturnType<typeof midiToPitch>,
    black: boolean,
    idx: number
  ) => {
    const dot = dotFor(midi) ?? undefined;
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
        aria-label={`${pitch.name}${pitch.octave}`}
        onClick={() => handleKeyClick(midi)}
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
            // Black key sits on the boundary between two white keys. Center
            // the wrapper on that boundary by shifting left by half a white-
            // key width — otherwise the inner button (centered in the
            // wrapper) ends up over the next white key instead of the gap.
            const whiteBefore = whiteKeys.filter(w => w.midi < k.midi).length;
            const leftPct = ((whiteBefore - 0.5) / whiteKeys.length) * 100;
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
