import React from 'react';
import { fretMarkers, doubleFretMarkers, isNoteInScale } from '../data/guitarData';
import { getChromaticPosition } from '../data/musicData';

// ---------------------------------------------------------------------------
// One side (base or harmony) of the HarmonyMaker's dual fretboard. Purely
// presentational — the parent computes which dots to render and passes maps
// in; this component just paints them.
// ---------------------------------------------------------------------------

export interface BaseDotInfo {
  /** 1-based click order, shown instead of the note name when showOrder is on. */
  order: number;
}

export interface HarmonyDotInfo {
  order: number;
  diatonic: boolean;
  /** True when this is the selected voicing; false for alternates in "all voicings" mode. */
  selected: boolean;
  /** posKey of the base note this voicing belongs to — needed for drop targeting. */
  basePosKey: string;
  /** Position within the pair's voicings list. */
  voicingIdx: number;
}

interface Props {
  side: 'base' | 'harmony';
  fretboard: Array<Array<{ fret: number; note: string; stringIndex: number; isOpen: boolean } | undefined>>;
  fretCount: number;
  scaleNotes: string[];
  rootNote: string | null;
  /** Map from posKey (`${stringIndex}-${fret}`) → info for active base notes. */
  baseDots: Map<string, BaseDotInfo>;
  /** Map from posKey → info for harmony dots (selected + alternates if enabled). */
  harmonyDots: Map<string, HarmonyDotInfo>;
  showOrder: boolean;
  /** When true, paint in-scale ghost dots on the base side. Harmony side
   *  never shows scale ghosts regardless. */
  showDiatonic: boolean;
  /** basePosKey of the note currently being drag-previewed (harmony side).
   *  Used purely as an "in drag mode for this pair" flag — the parent already
   *  expands harmonyDots to include every voicing of that pair, so the
   *  fretboard just needs to attach drop handlers to matching cells. */
  draggingBaseKey: string | null;
  onBaseClick: (stringIndex: number, fret: number, note: string) => void;
  onHarmonyClick: (stringIndex: number, fret: number) => void;
  onHarmonyDragStart: (basePosKey: string) => void;
  onHarmonyDragEnd: () => void;
  onHarmonyDrop: (stringIndex: number, fret: number) => void;
}

export const HarmonyFretboard: React.FC<Props> = ({
  side,
  fretboard,
  fretCount,
  scaleNotes,
  rootNote,
  baseDots,
  harmonyDots,
  showOrder,
  showDiatonic,
  draggingBaseKey,
  onBaseClick,
  onHarmonyClick,
  onHarmonyDragStart,
  onHarmonyDragEnd,
  onHarmonyDrop,
}) => {
  // Scale ghosts only appear on the base side, and only when the user
  // explicitly asks for them. Everything else is off by default.
  const showScaleGhosts = side === 'base' && showDiatonic;

  const isRoot = (noteName: string) =>
    showScaleGhosts
    && rootNote !== null
    && getChromaticPosition(noteName) === getChromaticPosition(rootNote);

  const isInScale = (noteName: string) =>
    showScaleGhosts && scaleNotes.length > 0 && isNoteInScale(noteName, scaleNotes);

  return (
    <div className="harmony-fretboard-wrapper">
      <div className="harmony-fretboard-label">
        {side === 'base' ? 'Base Notes' : 'Harmony Notes'}
      </div>
      <div className="harmony-fretboard">
        <div className="harmony-string-labels">
          {['E', 'B', 'G', 'D', 'A', 'E'].map((stringNote, index) => (
            <div key={index} className="harmony-string-label">{stringNote}</div>
          ))}
        </div>
        <div className="harmony-frets-container">
          {Array.from({ length: fretCount + 1 }, (_, fret) => {
            const isMarkedFret = fretMarkers.includes(fret);
            const isDoubleDot = doubleFretMarkers.includes(fret);

            return (
              <div key={fret} className={`harmony-fret ${fret === 0 ? 'nut' : ''}`}>
                <div className="harmony-fret-number">{fret}</div>
                {isMarkedFret && fret > 0 && (
                  <div className="harmony-fret-marker">
                    <div className={`harmony-marker-dot ${isDoubleDot ? 'double' : ''}`} />
                    {isDoubleDot && <div className="harmony-marker-dot double" />}
                  </div>
                )}
                <div className="harmony-strings">
                  {fretboard.map((string, stringIndex) => {
                    const fretNote = string[fret];
                    if (!fretNote) return null;
                    const posKey = `${stringIndex}-${fret}`;
                    const noteInScale = isInScale(fretNote.note);
                    const rootNoteHere = isRoot(fretNote.note);

                    // Decide what kind of dot (if any) lives on this fret.
                    let noteActive = false;
                    let isAlternate = false;
                    let nonDiatonic = false;
                    let orderNum: number | null = null;
                    let harmonyInfo: { basePosKey: string } | null = null;

                    if (side === 'base') {
                      const info = baseDots.get(posKey);
                      if (info) {
                        noteActive = true;
                        orderNum = info.order;
                      }
                    } else {
                      const info = harmonyDots.get(posKey);
                      if (info) {
                        noteActive = info.selected;
                        isAlternate = !info.selected;
                        nonDiatonic = !info.diatonic;
                        if (info.selected) orderNum = info.order;
                        harmonyInfo = { basePosKey: info.basePosKey };
                      }
                    }

                    // Drag-and-drop mechanics on the harmony side:
                    //  - A selected voicing is the drag source.
                    //  - Any voicing cell (selected OR alternate) belonging to
                    //    the pair currently being dragged is a drop target.
                    //  - Other pairs' dots are inert during a drag.
                    const isDragSource =
                      side === 'harmony' && noteActive && !!harmonyInfo;
                    const isDropTarget =
                      side === 'harmony'
                      && harmonyInfo !== null
                      && draggingBaseKey !== null
                      && harmonyInfo.basePosKey === draggingBaseKey;

                    // Label content: order number when toggle is on and this
                    // dot has one; otherwise fall back to the note name.
                    const labelText = showOrder && orderNum !== null
                      ? String(orderNum)
                      : fretNote.note;

                    const tooltip = (() => {
                      if (side === 'base') {
                        return `${fretNote.note} - String ${6 - stringIndex}, Fret ${fret}`;
                      }
                      if (isAlternate) return `${fretNote.note} - Click to pick this voicing`;
                      if (noteActive) return `${fretNote.note} - Click to cycle voicing`;
                      return `${fretNote.note} - String ${6 - stringIndex}, Fret ${fret}`;
                    })();

                    return (
                      <div key={stringIndex} className="harmony-string-container">
                        <div className={`harmony-guitar-string string-${stringIndex}`} />
                        <div
                          className={`harmony-note-position ${noteActive ? 'active' : ''} ${isAlternate ? 'alternate' : ''} ${noteInScale ? 'in-scale' : ''} ${rootNoteHere ? 'root' : ''} ${nonDiatonic ? 'non-diatonic' : ''} ${isDropTarget ? 'drop-target' : ''} ${side}`}
                          onClick={
                            side === 'base'
                              ? () => onBaseClick(stringIndex, fret, fretNote.note)
                              : () => onHarmonyClick(stringIndex, fret)
                          }
                          draggable={isDragSource}
                          onDragStart={
                            isDragSource && harmonyInfo
                              ? ((basePosKey: string) => (e: React.DragEvent) => {
                                  e.dataTransfer.effectAllowed = 'move';
                                  // Firefox requires some data to initiate drag
                                  e.dataTransfer.setData('text/plain', basePosKey);
                                  onHarmonyDragStart(basePosKey);
                                })(harmonyInfo.basePosKey)
                              : undefined
                          }
                          onDragEnd={isDragSource ? () => onHarmonyDragEnd() : undefined}
                          onDragOver={
                            isDropTarget
                              ? (e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = 'move';
                                }
                              : undefined
                          }
                          onDrop={
                            isDropTarget
                              ? (e) => {
                                  e.preventDefault();
                                  onHarmonyDrop(stringIndex, fret);
                                }
                              : undefined
                          }
                          title={tooltip}
                        >
                          {(noteActive || isAlternate || noteInScale || side === 'base') && (
                            <span className="harmony-note-label">{labelText}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
