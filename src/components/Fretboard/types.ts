// ---------------------------------------------------------------------------
// Fretboard primitive — shared type vocabulary.
// All three fretboard consumers (GuitarNeck, HarmonyMaker base/harmony sides)
// describe their dots through this small grammar instead of authoring DOM.
// New visual needs → new DotVariant + one CSS rule. No render-prop escape hatch.
// ---------------------------------------------------------------------------

export type DotVariant =
  | 'root'        // scale root marker (light colored by default)
  | 'scale'       // in-scale ghost — faint overlay
  | 'current'     // currently highlighted scale-cycle note (orange)
  | 'base'        // user-placed base note on the HarmonyMaker base side
  | 'harmony'     // selected harmony voicing
  | 'alternate';  // drag-revealed alternate voicing (dashed outline)

export interface DotInfo {
  variant: DotVariant;
  /** Overrides the default label (note name). Used for order numbers,
   *  interval labels, etc. */
  label?: string;
  /** Makes this dot a drag source. Fretboard wires HTML5 dragstart/end. */
  draggable?: boolean;
  /** Adds the drop-target pulse animation — hint for the user that this
   *  is a valid landing spot during a drag. */
  dropTargetHint?: boolean;
  /** The resolved harmony is non-diatonic. Adds dashed border + secondary
   *  color modifier to whatever the base variant produces. */
  nonDiatonic?: boolean;
  /** Custom color override (e.g. for the GuitarNeck legend's scale-color
   *  coded root/scale/current dots, where the color shifts with text mode). */
  color?: string;
}

export type PosKey = string;  // format: "${stringIndex}-${fret}"

export const posKey = (stringIndex: number, fret: number): PosKey =>
  `${stringIndex}-${fret}`;

export interface FretboardProps {
  // Grid shape
  strings: number;
  fretCount: number;
  tuning: string[];

  // Dot data keyed by posKey
  dots: Map<PosKey, DotInfo>;

  // Chrome
  title?: string;
  showStringLabels?: boolean;       // default true
  showFretNumbers?: 'top' | 'bottom' | 'none';  // default 'bottom'

  // Click targets — fire for any cell, not just ones with dots
  onCellClick?: (stringIndex: number, fret: number, noteName: string) => void;

  // Drag / drop. When `cellsAcceptDrops` is true, every cell on the fretboard
  // is a drop target (the parent's onDrop handler decides snapping).
  cellsAcceptDrops?: boolean;
  onDragStart?: (stringIndex: number, fret: number, noteName: string) => void;
  onDragEnd?: () => void;
  onDrop?: (stringIndex: number, fret: number, noteName: string) => void;

  // Display mode — GuitarNeck's black-text vs white-text palette.
  textMode?: 'black' | 'white';

  // Makes every empty cell a faint hit target (HarmonyMaker base side).
  clickableEmpty?: boolean;
}
