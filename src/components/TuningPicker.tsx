import React from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store/useStore';
import { Button, Select } from '../ui';
import './TuningPicker.css';

// ---------------------------------------------------------------------------
// TuningPicker — button + popover menu for editing the global tuning state.
// Offers common preset tunings (Standard, Drop D, DADGAD, etc.) plus a
// per-string picker for custom tunings. Closes on outside click + Escape.
// Reads/writes the global store directly — no props needed.
// ---------------------------------------------------------------------------

interface TuningPreset {
  name: string;
  tuning: string[]; // high-to-low display order (matches store shape)
  description?: string;
}

const PRESETS: TuningPreset[] = [
  { name: 'Standard', tuning: ['E', 'B', 'G', 'D', 'A', 'E'], description: 'EADGBE' },
  { name: 'Drop D', tuning: ['E', 'B', 'G', 'D', 'A', 'D'], description: 'DADGBE' },
  { name: 'Open G', tuning: ['D', 'B', 'G', 'D', 'G', 'D'] },
  { name: 'Open D', tuning: ['D', 'A', 'F#', 'D', 'A', 'D'] },
  { name: 'Half Step Down', tuning: ['Eb', 'Bb', 'Gb', 'Db', 'Ab', 'Eb'] },
];

// Chromatic scales for semitone shifting. Flats read better going down
// (E → Eb → D), sharps going up (E → F → F#). Using direction-appropriate
// spelling keeps tuning labels musically natural through repeated nudges.
const FLAT_SCALE = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const SHARP_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const NOTE_OPTIONS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F',
  'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
];

// Compare two tuning arrays by chromatic position, so Eb and D# match.
const CHROMATIC: { [k: string]: number } = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};
const tuningsMatch = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((n, i) => CHROMATIC[n] === CHROMATIC[b[i]]);

export const TuningPicker: React.FC = () => {
  const { note, setTuning } = useStore();
  const [open, setOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = React.useState<{ top: number; left: number } | null>(null);

  // Position the portaled menu just below the trigger button. Re-computes on
  // scroll + resize so the popover tracks if the card/page moves.
  React.useEffect(() => {
    if (!open) return;
    const updatePos = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuPos({ top: rect.bottom + 6, left: rect.left });
    };
    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
  }, [open]);

  // Close on outside click. Because the menu is portaled, we check containment
  // against both the button and the menu refs.
  React.useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        buttonRef.current?.contains(t) ||
        menuRef.current?.contains(t)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  // Close on Escape.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const setString = (stringIndex: number, newNote: string) => {
    const next = [...note.tuning];
    next[stringIndex] = newNote;
    setTuning(next);
  };

  // Shift every string by one semitone (direction-aware spelling).
  const shiftAll = (direction: 'up' | 'down') => {
    const scale = direction === 'down' ? FLAT_SCALE : SHARP_SCALE;
    const delta = direction === 'down' ? -1 : 1;
    const next = note.tuning.map(n => {
      const pos = CHROMATIC[n];
      if (pos === undefined) return n;
      return scale[(pos + delta + 12) % 12];
    });
    setTuning(next);
  };

  // Render the strings left-to-right from low (string 1 = thickest, bottom
  // of the fretboard) to high (string 6 = top). Tuning storage stays in
  // display order (high-to-low), so we iterate in reverse here and map back
  // to the original index for edits.
  const stringColumns = note.tuning
    .map((n, idx) => ({ n, idx, label: note.tuning.length - idx }))
    .reverse();

  // Activate shortcut: if the current tuning matches a preset, highlight it.
  const activePreset = PRESETS.find(p => tuningsMatch(p.tuning, note.tuning));

  return (
    <div className="tuning-picker">
      <Button
        ref={buttonRef}
        variant="outline"
        size="sm"
        active={open}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        title="Change tuning"
      >
        Tuning: {activePreset ? activePreset.name : note.tuning.join('-')}
      </Button>

      {open && menuPos && createPortal(
        <div
          ref={menuRef}
          className="tuning-picker-menu"
          role="dialog"
          aria-label="Tuning"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          {/* Row 1 — presets + shift nudges side by side. Row-based layout
              keeps the popover short even when the trigger is low on screen. */}
          <div className="tuning-picker-row">
            <div className="tuning-picker-section-title">Preset</div>
            <div className="tuning-picker-presets">
              {PRESETS.map(p => {
                const isActive = activePreset?.name === p.name;
                return (
                  <button
                    key={p.name}
                    type="button"
                    className={`tuning-picker-preset ${isActive ? 'active' : ''}`}
                    onClick={() => setTuning(p.tuning)}
                    title={p.description ?? p.tuning.slice().reverse().join('-')}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
            <div className="tuning-picker-shift">
              <Button variant="outline" size="sm" onClick={() => shiftAll('down')} title="Nudge every string down one semitone">
                ▼ ½
              </Button>
              <Button variant="outline" size="sm" onClick={() => shiftAll('up')} title="Nudge every string up one semitone">
                ▲ ½
              </Button>
            </div>
          </div>

          {/* Row 2 — per-string custom pickers laid out horizontally. */}
          <div className="tuning-picker-row">
            <div className="tuning-picker-section-title">Strings</div>
            <div className="tuning-picker-strings">
              {stringColumns.map(({ n, idx, label }) => (
                <div key={idx} className="tuning-picker-string-col">
                  <span className="tuning-picker-string-label">{label}</span>
                  <Select
                    size="sm"
                    value={n}
                    onChange={e => setString(idx, e.target.value)}
                    options={NOTE_OPTIONS.map(opt => ({ value: opt, label: opt }))}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
