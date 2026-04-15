import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '../store/useStore';
import {
  IntervalSpec,
  diatonicIntervalOptions,
  chromaticIntervalOptions,
  intervalSpecKey,
  parseIntervalSpecKey,
  getChromaticPosition,
  intervalNames,
} from '../data/musicData';
import type { VoicingPosition } from '../data/harmonyVoicings';
import { Select, Button, Badge } from '../ui';

// ---------------------------------------------------------------------------
// One row in the Interval Analysis panel. Draggable via the handle, shows the
// base → harmony pair, hosts the per-note interval dropdown, and exposes
// voicing cycling.
// ---------------------------------------------------------------------------

interface Props {
  id: string;                             // sortable ID — "stringIndex-fret" of the base note
  order: number;                          // 1-based play order
  baseNote: string;
  baseStringIndex: number;
  baseFret: number;
  selectedVoicing: VoicingPosition;
  voicingCount: number;
  voicingIndex: number;
  diatonic: boolean;
  interval: IntervalSpec;
  onIntervalChange: (spec: IntervalSpec) => void;
  onCycle: () => void;
}

const getIntervalName = (from: string, to: string): string => {
  const semitones = (getChromaticPosition(to) - getChromaticPosition(from) + 12) % 12;
  return intervalNames[semitones] || '?';
};

export const HarmonyAnalysisPair: React.FC<Props> = ({
  id,
  order,
  baseNote,
  baseStringIndex,
  baseFret,
  selectedVoicing,
  voicingCount,
  voicingIndex,
  diatonic,
  interval,
  onIntervalChange,
  onCycle,
}) => {
  // Voicing cycling is a fretboard-side concept — cycling moves the
  // selected position among equivalent-pitch spots on the neck. In piano
  // view those collapse to the same key, so the cycle button is hidden.
  const viewMode = useStore(s => s.viewMode);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const currentKey = intervalSpecKey(interval);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const spec = parseIntervalSpecKey(e.target.value);
    if (spec) onIntervalChange(spec);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`harmony-pair ${!diatonic ? 'non-diatonic' : ''} ${isDragging ? 'dragging' : ''}`}
    >
      {/* Drag handle: only this element has the drag listeners, so clicks on
          the dropdown and cycle button below aren't hijacked by dragging. */}
      <div className="harmony-pair-handle" {...attributes} {...listeners} aria-label="Drag to reorder">
        ⋮⋮
      </div>
      <div className="harmony-pair-order">{order}</div>
      <div className="harmony-pair-body">
        <div className="harmony-pair-notes">
          <span className="harmony-pair-base">{baseNote}</span>
          <span className="harmony-pair-arrow">&rarr;</span>
          <span className={`harmony-pair-harmony ${!diatonic ? 'non-diatonic' : ''}`}>
            {selectedVoicing.note}
          </span>
          <Badge variant="neutral" className="harmony-pair-interval-badge">
            {getIntervalName(baseNote, selectedVoicing.note)}
          </Badge>
          {!diatonic && <Badge variant="warning">non-diatonic</Badge>}
        </div>
        <div className="harmony-pair-position">
          Str {6 - baseStringIndex} F{baseFret} &rarr; Str {6 - selectedVoicing.stringIndex} F{selectedVoicing.fret}
        </div>
        <div className="harmony-pair-controls">
          <label className="harmony-pair-interval-label">
            Interval:
            <Select
              size="sm"
              value={currentKey}
              onChange={handleSelectChange}
              groups={[
                {
                  label: 'Diatonic (scale-relative)',
                  options: diatonicIntervalOptions.map(o => ({
                    value: intervalSpecKey(o.spec),
                    label: o.label,
                  })),
                },
                {
                  label: 'Chromatic (fixed semitones)',
                  options: chromaticIntervalOptions.map(o => ({
                    value: intervalSpecKey(o.spec),
                    label: o.label,
                  })),
                },
              ]}
            />
          </label>
          {voicingCount > 1 && viewMode === 'fretboard' && (
            <Button variant="outline" size="sm" onClick={onCycle}>
              Voicing {voicingIndex + 1}/{voicingCount} &mdash; cycle
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
