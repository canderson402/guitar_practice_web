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
  textMode = 'black',
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
            {stringLabels.map((stringNote, index) => (
              <div key={index} className="fretboard-string-label">{stringNote}</div>
            ))}
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

                    const classNames = [
                      'fretboard-cell',
                      dot ? `variant-${dot.variant}` : '',
                      dot?.nonDiatonic ? 'non-diatonic' : '',
                      dot?.dropTargetHint ? 'drop-target' : '',
                      clickableEmpty && !dot ? 'clickable-empty' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');

                    // CSS var lets variant color be overridden per-dot
                    const style: React.CSSProperties | undefined = dot?.color
                      ? { ['--fretboard-dot-color' as any]: dot.color }
                      : undefined;

                    const labelText = dot?.label ?? (dot ? noteName : '');
                    const showLabel = dot !== undefined;

                    const handleClick = onCellClick
                      ? () => onCellClick(stringIndex, fret, noteName)
                      : undefined;

                    // Drag source: only on cells with draggable dots
                    const isDragSource = !!dot?.draggable;

                    return (
                      <div key={stringIndex} className="fretboard-string-row">
                        <div className={`fretboard-string-line string-${stringIndex}`} />
                        <div
                          className={classNames}
                          style={style}
                          onClick={handleClick}
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
                          {showLabel && (
                            <span className="fretboard-note-label">{labelText}</span>
                          )}
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
