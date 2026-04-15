import React from 'react';
import { generateFretboard, fretMarkers, doubleFretMarkers } from '../../data/guitarData';
import { FretboardProps, posKey } from './types';
import './Fretboard.css';

// ---------------------------------------------------------------------------
// Fretboard — the generic guitar-neck renderer. Every dot it paints is
// driven by the `dots` prop; consumers never render DOM for notes themselves.
// Click / drag / drop interactions are wired here and forwarded through
// typed callbacks.
// ---------------------------------------------------------------------------

export const Fretboard: React.FC<FretboardProps> = ({
  strings,
  fretCount,
  tuning,
  dots,
  title,
  showStringLabels = true,
  showFretNumbers = 'bottom',
  onCellClick,
  cellsAcceptDrops,
  onDragStart,
  onDragEnd,
  onDrop,
  textMode = 'white',
  clickableEmpty,
}) => {
  // Always derive the note grid from tuning. Memoised so dot rendering
  // doesn't allocate a fresh 2D array each frame.
  const fretboard = React.useMemo(
    () => generateFretboard(tuning, fretCount),
    [tuning, fretCount]
  );

  const stringLabels = tuning.slice(0, strings);

  return (
    <div className={`fretboard-root ${textMode}-text-mode`}>
      {title && <div className="fretboard-title">{title}</div>}

      <div className="fretboard-grid">
        {showStringLabels && (
          <div className="fretboard-string-labels">
            {stringLabels.map((stringNote, index) => {
              // Open-string (fret 0) dots render as styled labels here, and
              // clicks/drags on the label drive the same handlers as any
              // fretted cell. There's no cell rendered at fret 0 — this IS
              // the fret-0 interaction surface.
              const openDot = dots.get(posKey(index, 0));
              const openNote = fretboard[index]?.[0]?.note ?? stringNote;
              const labelText = openDot?.label ?? stringNote;
              const isDragSource = !!openDot?.draggable;
              const classes = [
                'fretboard-string-label',
                openDot ? `has-variant-${openDot.variant}` : '',
                openDot?.faint ? 'faint' : '',
                openDot?.nonDiatonic ? 'non-diatonic' : '',
                openDot?.dropTargetHint ? 'drop-target' : '',
                onCellClick ? 'clickable' : '',
                isDragSource ? 'draggable' : '',
              ]
                .filter(Boolean)
                .join(' ');
              const style = openDot?.color
                ? { ['--fretboard-dot-color' as any]: openDot.color }
                : undefined;
              return (
                <div
                  key={index}
                  className={classes}
                  style={style}
                  onClick={onCellClick ? () => onCellClick(index, 0, openNote) : undefined}
                  draggable={isDragSource}
                  onDragStart={
                    isDragSource && onDragStart
                      ? (e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', posKey(index, 0));
                          onDragStart(index, 0, openNote);
                        }
                      : undefined
                  }
                  onDragEnd={isDragSource && onDragEnd ? () => onDragEnd() : undefined}
                  onDragOver={
                    cellsAcceptDrops
                      ? (e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }
                      : undefined
                  }
                  onDrop={
                    cellsAcceptDrops && onDrop
                      ? (e) => {
                          e.preventDefault();
                          onDrop(index, 0, openNote);
                        }
                      : undefined
                  }
                  title={`${openNote} — open string ${strings - index}`}
                >
                  {labelText}
                </div>
              );
            })}
          </div>
        )}

        <div className="fretboard-frets">
          {Array.from({ length: fretCount + 1 }, (_, fret) => {
            const isMarkedFret = fretMarkers.includes(fret);
            const isDoubleDot = doubleFretMarkers.includes(fret);

            return (
              <div key={fret} className={`fretboard-fret ${fret === 0 ? 'nut' : ''}`}>
                {showFretNumbers === 'top' && (
                  <div className="fretboard-fret-number top">{fret}</div>
                )}

                {isMarkedFret && fret > 0 && (
                  <div className="fretboard-fret-marker">
                    <div className={`fretboard-marker-dot ${isDoubleDot ? 'double' : ''}`} />
                    {isDoubleDot && <div className="fretboard-marker-dot double" />}
                  </div>
                )}

                <div className="fretboard-strings">
                  {fretboard.slice(0, strings).map((string, stringIndex) => {
                    const cell = string[fret];
                    if (!cell) return null;
                    const key = posKey(stringIndex, fret);
                    const dot = dots.get(key);
                    const noteName = cell.note;

                    // Fret 0 renders a horizontal string line only — no cell,
                    // no dot. The open-string interaction lives on the
                    // string-note label to the left of the fretboard.
                    if (fret === 0) {
                      return (
                        <div key={stringIndex} className="fretboard-string-row">
                          <div className={`fretboard-string-line string-${stringIndex}`} />
                        </div>
                      );
                    }

                    // At fret 0 the dot's visual is hoisted up to the string
                    // label on the left; in the cell itself we skip the
                    // variant styling and the text. Click/drag/drop handlers
                    // stay wired so interaction still works through the nut.
                    const visualDot = fret > 0 ? dot : undefined;
                    const classNames = [
                      'fretboard-cell',
                      visualDot ? `variant-${visualDot.variant}` : '',
                      visualDot?.nonDiatonic ? 'non-diatonic' : '',
                      visualDot?.dropTargetHint ? 'drop-target' : '',
                      visualDot?.faint ? 'faint' : '',
                      clickableEmpty && !visualDot ? 'clickable-empty' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');

                    // CSS var lets variant color be overridden per-dot
                    const style: React.CSSProperties | undefined = visualDot?.color
                      ? { ['--fretboard-dot-color' as any]: visualDot.color }
                      : undefined;

                    const labelText = visualDot?.label ?? (visualDot ? noteName : '');
                    const showLabel = visualDot !== undefined;

                    const handleClick = onCellClick
                      ? () => onCellClick(stringIndex, fret, noteName)
                      : undefined;

                    // Drag source: only on cells with draggable dots
                    const isDragSource = !!dot?.draggable;

                    // The full-row hit area expands the clickable surface to
                    // cover the whole fret cell (not just the small circle),
                    // so there's no dead space on the fret. Drop handlers go
                    // on the hit area too. The visible dot is a child div
                    // that only catches the drag-source.
                    return (
                      <div key={stringIndex} className="fretboard-string-row">
                        <div className={`fretboard-string-line string-${stringIndex}`} />
                        <div
                          className="fretboard-cell-hit"
                          onClick={handleClick}
                          onDragOver={
                            cellsAcceptDrops
                              ? (e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = 'move';
                                }
                              : undefined
                          }
                          onDrop={
                            cellsAcceptDrops && onDrop
                              ? (e) => {
                                  e.preventDefault();
                                  onDrop(stringIndex, fret, noteName);
                                }
                              : undefined
                          }
                          title={`${noteName} — String ${strings - stringIndex}, Fret ${fret}`}
                        >
                          <div
                            className={classNames}
                            style={style}
                            draggable={isDragSource}
                            onDragStart={
                              isDragSource && onDragStart
                                ? (e) => {
                                    e.dataTransfer.effectAllowed = 'move';
                                    e.dataTransfer.setData('text/plain', key);
                                    onDragStart(stringIndex, fret, noteName);
                                  }
                                : undefined
                            }
                            onDragEnd={
                              isDragSource && onDragEnd
                                ? () => onDragEnd()
                                : undefined
                            }
                          >
                            {showLabel && (
                              <span className="fretboard-note-label">{labelText}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {showFretNumbers === 'bottom' && (
                  <div className="fretboard-fret-number bottom">{fret}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
