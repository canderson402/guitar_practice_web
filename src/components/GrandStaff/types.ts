// ---------------------------------------------------------------------------
// GrandStaff — shared type vocabulary for the general-purpose notation
// renderer. Built for any notes at any quantity — single notes, chords,
// multi-voice cross-clef passages. The NoteReading card happens to pass
// single-note arrays today; future cards (chord ID, interval trainer) will
// pass larger arrays unchanged.
// ---------------------------------------------------------------------------

export type Duration = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';

export type Spelling = 'sharp' | 'flat' | 'natural-C' | 'natural-F';

export interface Note {
  /** MIDI pitch number. A4 = 69. Ignored when `isRest` is true. */
  midi: number;
  /** When true, renders a rest of `duration`. Other pitch fields are ignored. */
  isRest?: boolean;
  /** Force enharmonic spelling. Default 'sharp' (black keys spell as sharp).
   *  'natural-C' renders C / B# / Cb family, 'natural-F' renders F / E# / Fb. */
  spelling?: Spelling;
  /** 'show' always renders the accidental glyph even for naturals; 'auto'
   *  (default) only renders when the spelling requires one. */
  accidentalDisplay?: 'show' | 'auto';
  /** Note value. Default 'whole'. */
  duration?: Duration;
  /** CSS color applied to the notehead + stem. Used for highlighting the
   *  current target note in phrase-style exercises. */
  color?: string;
}

export interface Voice {
  /** Simultaneous notes → chord. */
  notes: Note[];
  /** Override clef for this voice. When omitted with clef='grand' on the
   *  parent, the voice is auto-assigned by the lowest-midi middle-C rule. */
  clef?: 'treble' | 'bass';
}

export interface GrandStaffProps {
  /** Short form — rendered as one Voice using the parent clef. */
  notes?: Note[];
  /** Long form — explicit multi-voice control. Takes precedence over `notes`. */
  voices?: Voice[];
  /** 'grand' shows both staves; 'treble' / 'bass' shows one. Default 'grand'. */
  clef?: 'treble' | 'bass' | 'grand';
  /** Pixel width. If omitted the component fills its container. */
  width?: number;
  className?: string;
}
