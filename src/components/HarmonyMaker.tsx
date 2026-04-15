import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useStore, HarmonyNote } from '../store/useStore';
import {
  scales,
  getScaleNotes,
  getChromaticScale,
  IntervalSpec,
  diatonicIntervalOptions,
  intervalSpecKey,
  intervalSpecsEqual,
} from '../data/musicData';
import { generateFretboard } from '../data/guitarData';
import { findAllVoicings, VoicingPosition } from '../data/harmonyVoicings';
import { HarmonyFretboard, BaseDotInfo, HarmonyDotInfo } from './HarmonyFretboard';
import { HarmonyAnalysisPair } from './HarmonyAnalysisPair';
import './HarmonyMaker.css';

// A note plus its resolved voicings — the per-render enrichment of HarmonyNote.
interface ResolvedNote {
  note: HarmonyNote;
  voicings: VoicingPosition[];
  selected: VoicingPosition | null;
  diatonic: boolean;
}

export const HarmonyMaker: React.FC = () => {
  const {
    note,
    harmonyMaker,
    addBaseNote,
    reorderNotes,
    setNoteInterval,
    cycleNoteVoicing,
    setNoteVoicingIdx,
    setDefaultInterval,
    applyDefaultToAll,
    clearHarmonyMaker,
  } = useStore();

  // Display toggles — local, no need to persist.
  const [showOrder, setShowOrder] = React.useState(false);
  const [showAllVoicings, setShowAllVoicings] = React.useState(false);
  const [showDiatonic, setShowDiatonic] = React.useState(false);
  const [show24Frets, setShow24Frets] = React.useState(false);

  // Drag-to-pick-voicing: when the user drags a harmony dot, this holds the
  // base posKey of the pair whose voicings get expanded as drop targets.
  const [draggingBaseKey, setDraggingBaseKey] = React.useState<string | null>(null);

  // Fret count drives both the rendered fretboard and the voicing search.
  const fretCount = show24Frets ? 24 : 12;

  // dnd-kit sensors match the top-level card reordering in SimpleDragDrop.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const fretboard = React.useMemo(
    () => generateFretboard(undefined, fretCount),
    [fretCount]
  );

  // Scale notes for faint in-scale highlighting on both fretboard sides.
  const scaleNotes = note.selectedScale && note.selectedNote
    ? getScaleNotes(note.selectedNote, note.selectedScale as keyof typeof scales)
    : note.selectedNote
    ? getChromaticScale(note.selectedNote)
    : [];

  // Resolve every HarmonyNote into its voicings given the current key context.
  const resolvedNotes: ResolvedNote[] = React.useMemo(() => {
    if (!note.selectedNote || !note.selectedScale) {
      return harmonyMaker.notes.map(n => ({
        note: n, voicings: [], selected: null, diatonic: true,
      }));
    }
    return harmonyMaker.notes.map(n => {
      const result = findAllVoicings(
        { stringIndex: n.stringIndex, fret: n.fret, note: n.note },
        n.interval,
        note.selectedNote!,
        note.selectedScale as keyof typeof scales,
        fretboard,
        fretCount,
      );
      if (!result || result.voicings.length === 0) {
        return { note: n, voicings: [], selected: null, diatonic: true };
      }
      const idx = n.voicingIdx % result.voicings.length;
      return {
        note: n,
        voicings: result.voicings,
        selected: result.voicings[idx],
        diatonic: result.diatonic,
      };
    });
  }, [harmonyMaker.notes, note.selectedNote, note.selectedScale, fretboard]);

  // ----- Fretboard dot maps -----

  const baseDots = React.useMemo(() => {
    const m = new Map<string, BaseDotInfo>();
    harmonyMaker.notes.forEach((n, i) => {
      m.set(`${n.stringIndex}-${n.fret}`, { order: i + 1 });
    });
    return m;
  }, [harmonyMaker.notes]);

  const harmonyDots = React.useMemo(() => {
    const m = new Map<string, HarmonyDotInfo>();
    resolvedNotes.forEach((r, pairIdx) => {
      if (r.voicings.length === 0) return;
      const basePosKey = `${r.note.stringIndex}-${r.note.fret}`;
      // Expand all voicings if the user is dragging this specific pair (so
      // every voicing becomes a drop target), or if the global All Voicings
      // toggle is on.
      const expandAll = showAllVoicings || draggingBaseKey === basePosKey;
      const selectedIdx = r.note.voicingIdx % r.voicings.length;
      if (expandAll) {
        // Paint every voicing; selected wins when two pairs' voicings collide.
        r.voicings.forEach((v, vIdx) => {
          const key = `${v.stringIndex}-${v.fret}`;
          const isSelected = vIdx === selectedIdx;
          const existing = m.get(key);
          if (!existing || (isSelected && !existing.selected)) {
            m.set(key, {
              order: pairIdx + 1,
              diatonic: r.diatonic,
              selected: isSelected,
              basePosKey,
              voicingIdx: vIdx,
            });
          }
        });
      } else if (r.selected) {
        m.set(`${r.selected.stringIndex}-${r.selected.fret}`, {
          order: pairIdx + 1,
          diatonic: r.diatonic,
          selected: true,
          basePosKey,
          voicingIdx: selectedIdx,
        });
      }
    });
    return m;
  }, [resolvedNotes, showAllVoicings, draggingBaseKey]);

  // ----- Click handlers -----

  const handleBaseClick = (stringIndex: number, fret: number, noteName: string) => {
    addBaseNote({ stringIndex, fret, note: noteName });
  };

  const handleHarmonyClick = (stringIndex: number, fret: number) => {
    // Find which pair owns this harmony position.
    for (let i = 0; i < resolvedNotes.length; i++) {
      const r = resolvedNotes[i];
      if (r.voicings.length === 0) continue;
      const currentIdx = r.note.voicingIdx % r.voicings.length;

      if (showAllVoicings) {
        const hitIdx = r.voicings.findIndex(
          v => v.stringIndex === stringIndex && v.fret === fret
        );
        if (hitIdx === -1) continue;
        if (hitIdx === currentIdx) {
          cycleNoteVoicing(r.note.stringIndex, r.note.fret, r.voicings.length);
        } else {
          setNoteVoicingIdx(r.note.stringIndex, r.note.fret, hitIdx);
        }
        return;
      }

      const sel = r.voicings[currentIdx];
      if (sel && sel.stringIndex === stringIndex && sel.fret === fret) {
        cycleNoteVoicing(r.note.stringIndex, r.note.fret, r.voicings.length);
        return;
      }
    }
  };

  // ----- Drag-to-pick-voicing handlers -----

  const handleHarmonyDragStart = (basePosKey: string) => {
    setDraggingBaseKey(basePosKey);
  };

  const handleHarmonyDragEnd = () => {
    setDraggingBaseKey(null);
  };

  const handleHarmonyDrop = (stringIndex: number, fret: number) => {
    if (!draggingBaseKey) return;
    const r = resolvedNotes.find(
      r => `${r.note.stringIndex}-${r.note.fret}` === draggingBaseKey
    );
    if (!r) return;
    const vIdx = r.voicings.findIndex(
      v => v.stringIndex === stringIndex && v.fret === fret
    );
    // -1 guards against drops on some adjacent cell that isn't actually a
    // voicing option (shouldn't happen since only voicings are drop targets,
    // but cheap to check).
    if (vIdx === -1) return;
    setNoteVoicingIdx(r.note.stringIndex, r.note.fret, vIdx);
    setDraggingBaseKey(null);
  };

  // ----- Apply to all (with confirmation when overrides exist) -----

  const overrideCount = harmonyMaker.notes.filter(
    n => !intervalSpecsEqual(n.interval, harmonyMaker.defaultInterval)
  ).length;

  const handleApplyToAll = () => {
    if (overrideCount > 0) {
      const plural = overrideCount === 1 ? 'override' : 'overrides';
      const ok = window.confirm(
        `Apply the default interval to all ${harmonyMaker.notes.length} notes? ` +
        `This will overwrite ${overrideCount} per-note ${plural}.`
      );
      if (!ok) return;
    }
    applyDefaultToAll();
  };

  // ----- Drag reorder in the analysis panel -----

  const sortableIds = resolvedNotes
    .filter(r => r.selected)
    .map(r => `${r.note.stringIndex}-${r.note.fret}`);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIdx = harmonyMaker.notes.findIndex(
      n => `${n.stringIndex}-${n.fret}` === active.id
    );
    const toIdx = harmonyMaker.notes.findIndex(
      n => `${n.stringIndex}-${n.fret}` === over.id
    );
    if (fromIdx === -1 || toIdx === -1) return;
    reorderNotes(fromIdx, toIdx);
  };

  // ----- Render -----

  const defaultKey = intervalSpecKey(harmonyMaker.defaultInterval);

  return (
    <div className="harmony-maker">
      {/* Controls Bar */}
      <div className="harmony-controls">
        <div className="harmony-info">
          {note.selectedNote && note.selectedScale ? (
            <span className="harmony-scale-label">{note.selectedNote} {note.selectedScale}</span>
          ) : note.selectedNote ? (
            <span className="harmony-scale-label">{note.selectedNote} Chromatic</span>
          ) : (
            <span className="harmony-scale-label harmony-dim">Select a root &amp; scale</span>
          )}
        </div>

        <div className="harmony-presets" role="group" aria-label="Default interval">
          {diatonicIntervalOptions.map(opt => {
            const key = intervalSpecKey(opt.spec);
            return (
              <button
                key={key}
                type="button"
                className={`harmony-preset-btn ${defaultKey === key ? 'active' : ''}`}
                onClick={() => setDefaultInterval(opt.spec)}
                title={`Set default to ${opt.label}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="harmony-apply-btn"
          onClick={handleApplyToAll}
          disabled={harmonyMaker.notes.length === 0}
          title="Overwrite every note's interval with the current default"
        >
          Apply to all
        </button>

        <div className="harmony-display-toggles">
          <button
            type="button"
            className={`harmony-toggle-btn ${showOrder ? 'active' : ''}`}
            onClick={() => setShowOrder(v => !v)}
            aria-pressed={showOrder}
            title="Show play order numbers in place of note names"
          >
            Order #
          </button>
          <button
            type="button"
            className={`harmony-toggle-btn ${showAllVoicings ? 'active' : ''}`}
            onClick={() => setShowAllVoicings(v => !v)}
            aria-pressed={showAllVoicings}
            title="Show every available voicing, not just the selected one"
          >
            All Voicings
          </button>
          <button
            type="button"
            className={`harmony-toggle-btn ${showDiatonic ? 'active' : ''}`}
            onClick={() => setShowDiatonic(v => !v)}
            aria-pressed={showDiatonic}
            title="Overlay faint in-scale notes on the base fretboard"
          >
            Show Diatonic
          </button>
          <button
            type="button"
            className={`harmony-toggle-btn ${show24Frets ? 'active' : ''}`}
            onClick={() => setShow24Frets(v => !v)}
            aria-pressed={show24Frets}
            title="Extend the fretboard to 24 frets and include those positions in voicing search"
          >
            24 Frets
          </button>
        </div>

        <button className="harmony-clear-btn" onClick={clearHarmonyMaker}>
          Clear
        </button>
      </div>

      {/* Dual Fretboards */}
      <div className={`harmony-fretboards ${show24Frets ? 'harmony-fretboards--stacked' : ''}`}>
        <HarmonyFretboard
          side="base"
          fretboard={fretboard}
          fretCount={fretCount}
          scaleNotes={scaleNotes}
          rootNote={note.selectedNote}
          baseDots={baseDots}
          harmonyDots={harmonyDots}
          showOrder={showOrder}
          showDiatonic={showDiatonic}
          draggingBaseKey={draggingBaseKey}
          onBaseClick={handleBaseClick}
          onHarmonyClick={handleHarmonyClick}
          onHarmonyDragStart={handleHarmonyDragStart}
          onHarmonyDragEnd={handleHarmonyDragEnd}
          onHarmonyDrop={handleHarmonyDrop}
        />
        <div className="harmony-divider" />
        <HarmonyFretboard
          side="harmony"
          fretboard={fretboard}
          fretCount={fretCount}
          scaleNotes={scaleNotes}
          rootNote={note.selectedNote}
          baseDots={baseDots}
          harmonyDots={harmonyDots}
          showOrder={showOrder}
          showDiatonic={showDiatonic}
          draggingBaseKey={draggingBaseKey}
          onBaseClick={handleBaseClick}
          onHarmonyClick={handleHarmonyClick}
          onHarmonyDragStart={handleHarmonyDragStart}
          onHarmonyDragEnd={handleHarmonyDragEnd}
          onHarmonyDrop={handleHarmonyDrop}
        />
      </div>

      {/* Interval Analysis Panel */}
      {resolvedNotes.some(r => r.selected) && (
        <div className="harmony-analysis">
          <div className="harmony-analysis-title">
            Interval Analysis
            <span className="harmony-analysis-hint">drag to reorder</span>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
              <div className="harmony-pairs">
                {resolvedNotes.map((r, i) => {
                  if (!r.selected) return null;
                  const id = `${r.note.stringIndex}-${r.note.fret}`;
                  return (
                    <HarmonyAnalysisPair
                      key={id}
                      id={id}
                      order={i + 1}
                      baseNote={r.note.note}
                      baseStringIndex={r.note.stringIndex}
                      baseFret={r.note.fret}
                      selectedVoicing={r.selected}
                      voicingCount={r.voicings.length}
                      voicingIndex={r.note.voicingIdx % r.voicings.length}
                      diatonic={r.diatonic}
                      interval={r.note.interval}
                      onIntervalChange={(spec: IntervalSpec) =>
                        setNoteInterval(r.note.stringIndex, r.note.fret, spec)
                      }
                      onCycle={() =>
                        cycleNoteVoicing(r.note.stringIndex, r.note.fret, r.voicings.length)
                      }
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
};
