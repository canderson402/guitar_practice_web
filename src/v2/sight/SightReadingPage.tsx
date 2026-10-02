import React, { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { RotateCcw } from 'lucide-react';
import s from './SightReading.module.css';
import './answerPiano.css';
import './notationInk.css';
import { useStore } from '../../store/useStore';
import { KEY_NAMES } from '../../data/generatePhrase';
import { preloadPiano } from '../../audio/piano';
import { preloadGuitar } from '../../audio/guitar';
import { SegmentedControl, Select, Switch, IconButton } from '../ui';
import { midiToPitch } from '../../data/pitch';
import type { Answer } from '../../logic/noteReadingLogic';
import { StaffPrompt } from '../../components/NoteReading/StaffPrompt';
import { PhrasePrompt } from '../../components/NoteReading/PhrasePrompt';
import { FretboardPrompt } from '../../components/NoteReading/FretboardPrompt';
import { AnswerPiano } from '../../components/NoteReading/AnswerPiano';
import { AnswerGrid } from './AnswerGrid';
import { useAnswerHandler } from './useAnswerHandler';

type Mode = 'staff' | 'fretboard' | 'phrase';

// Room above/below the single-note staff for the highest/lowest prompts,
// balanced so the staff sits centered: VexFlow leaves 40px above the treble
// staff's top line (G6 needs ~50) and ~10px below the bass staff's bottom
// line (A1 and its note-name label need ~45).
const STAFF_PADDING = { top: 10, bottom: 35 };
const STAFF_WIDTH = 420;
// Staff and arpeggio notation are drawn at the same size.
const NOTATION_SCALE = 0.94;

/** A pressed answer as text: piano keys are MIDI numbers (C#4), fretboard
 *  answers are already note names. */
const answerName = (a: Answer): string => {
  if (typeof a !== 'number') return a;
  const p = midiToPitch(a);
  return `${p.name}${p.octave}`;
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className={s.field}><span className={s.fieldLabel}>{label}</span>{children}</div>
);

/** Sight reading in v2 components. Game state and scoring live in the shared
 *  store; notation renderers are the reused v1 components (in the theme's ink). */
export const SightReadingPage: React.FC = () => {
  const nr = useStore(useShallow(st => ({
    mode: st.noteReading.mode as Mode, fretCount: st.noteReading.fretCount,
    phraseBars: st.noteReading.phraseBars, phraseKey: st.noteReading.phraseKey,
    phraseNotesPerBar: st.noteReading.phraseNotesPerBar,
    trebleEnabled: st.noteReading.trebleEnabled, bassEnabled: st.noteReading.bassEnabled,
    prompt: st.noteReading.prompt, answerState: st.noteReading.answerState,
    wrongPresses: st.noteReading.wrongPresses, justPressedCorrect: st.noteReading.justPressedCorrect,
    score: st.noteReading.score,
  })));
  const actions = useStore(useShallow(st => ({
    setMode: st.setNoteReadingMode, setFretCount: st.setNoteReadingFretCount,
    setConfig: st.setNoteReadingPhraseConfig, next: st.nextNoteReadingPrompt, reset: st.resetNoteReadingScore,
  })));
  const onAnswer = useAnswerHandler();
  const [names, setNames] = useState(false);

  useEffect(() => { void preloadPiano(); void preloadGuitar(); }, []);
  useEffect(() => { if (!nr.prompt) actions.next(); }, [nr.prompt, actions]);

  // At least one clef must stay on.
  const toggleClef = (clef: 'treble' | 'bass') => {
    const next = { trebleEnabled: nr.trebleEnabled, bassEnabled: nr.bassEnabled };
    if (clef === 'treble') next.trebleEnabled = !next.trebleEnabled; else next.bassEnabled = !next.bassEnabled;
    if (next.trebleEnabled || next.bassEnabled) actions.setConfig(next);
  };

  const onStaff = nr.mode !== 'fretboard';
  const instruction = nr.mode === 'phrase' ? 'Play each note, left to right' : 'Name this note';
  const lastWrong = nr.wrongPresses[nr.wrongPresses.length - 1];
  const feedback = nr.answerState === 'correct' ? 'Correct!'
    : lastWrong !== undefined ? `Not ${answerName(lastWrong)} — try again` : '';

  return (
    <main className={s.page}>
      <header className={s.top}>
        <h1 className={s.title}>Sight Reading</h1>
        <SegmentedControl<Mode> label="Mode" value={nr.mode} onChange={actions.setMode}
          options={[{ value: 'staff', label: 'Staff' }, { value: 'fretboard', label: 'Fretboard' }, { value: 'phrase', label: 'Arpeggio' }]} />
      </header>

      <div className={s.options}>
        {onStaff && (
          <Field label="Clefs">
            <div className={s.pair}>
              <button type="button" aria-pressed={nr.trebleEnabled} className={[s.toggle, nr.trebleEnabled ? s.on : ''].join(' ')} onClick={() => toggleClef('treble')}>Treble</button>
              <button type="button" aria-pressed={nr.bassEnabled} className={[s.toggle, nr.bassEnabled ? s.on : ''].join(' ')} onClick={() => toggleClef('bass')}>Bass</button>
            </div>
          </Field>
        )}
        {nr.mode === 'fretboard' && (
          <Field label="Frets">
            <SegmentedControl label="Fret count" size="sm" value={String(nr.fretCount)} onChange={v => actions.setFretCount(Number(v) as 12 | 24)}
              options={[{ value: '12', label: '12 frets' }, { value: '24', label: '24 frets' }]} />
          </Field>
        )}
        {nr.mode === 'phrase' && (
          <>
            <Field label="Key">
              <Select label="Key" value={nr.phraseKey ?? ''} onChange={v => actions.setConfig({ phraseKey: v === '' ? null : v })}
                options={[{ value: '', label: 'Random' }, ...KEY_NAMES.map(k => ({ value: k, label: `${k} major` }))]} />
            </Field>
            <Field label="Bars">
              <SegmentedControl label="Bars" size="sm" value={String(nr.phraseBars)} onChange={v => actions.setConfig({ phraseBars: Number(v) as 1 | 2 | 3 | 4 })}
                options={['1', '2', '3', '4'].map(b => ({ value: b, label: b }))} />
            </Field>
            <Field label="Notes per bar">
              <SegmentedControl label="Notes per bar" size="sm" value={String(nr.phraseNotesPerBar)} onChange={v => actions.setConfig({ phraseNotesPerBar: Number(v) as 4 | 8 })}
                options={[{ value: '4', label: '4' }, { value: '8', label: '8' }]} />
            </Field>
          </>
        )}
        {onStaff && (
          <Field label="Note names">
            <Switch label="Show note names" checked={names} onChange={setNames} />
          </Field>
        )}
      </div>

      {/* Prompt, feedback and answer in one card so your eyes stay in one place. */}
      <section className={s.card} aria-label="Practice">
        <div className={s.promptLine} data-testid="prompt-line">
          <div className={s.stat}>
            <span className={s.statValue}>{nr.score.correct}/{nr.score.total}</span><span className={s.statLabel}>Correct</span>
          </div>
          <div className={s.promptCenter}>
            <span className={s.instruction}>{instruction}</span>
            <span role="status" className={[s.feedback, nr.answerState === 'correct' ? s.good : lastWrong !== undefined ? s.bad : ''].join(' ')}>
              {feedback}
            </span>
          </div>
          <div className={[s.stat, s.statRight].join(' ')}>
            <IconButton size="sm" label="Reset score" icon={<RotateCcw size={14} />} onClick={actions.reset} />
            <div className={s.statStack}>
              <span className={s.statValue}>{nr.score.streak}</span><span className={s.statLabel}>Streak</span>
            </div>
          </div>
        </div>

        {/* Every mode draws into the same fixed-size area, fitted and centered. */}
        <div data-testid="prompt-stage" className={[s.promptStage, 'sight-prompt', onStaff ? 'sight-ink' : ''].join(' ')}>
          {nr.prompt?.kind === 'staff' && <StaffPrompt prompt={nr.prompt} trebleEnabled={nr.trebleEnabled} bassEnabled={nr.bassEnabled} showLabels={names}
            width={STAFF_WIDTH} scale={NOTATION_SCALE} padding={STAFF_PADDING} />}
          {nr.prompt?.kind === 'phrase' && <PhrasePrompt prompt={nr.prompt} answerState={nr.answerState} trebleEnabled={nr.trebleEnabled} bassEnabled={nr.bassEnabled} showLabels={names} scale={NOTATION_SCALE} />}
          {nr.prompt?.kind === 'fretboard' && <FretboardPrompt prompt={nr.prompt} answerState={nr.answerState} justPressedCorrect={nr.justPressedCorrect} />}
        </div>

        <div className={[s.answer, nr.mode === 'fretboard' ? '' : s.stage].join(' ')}>
          {nr.mode === 'fretboard' ? (
            <AnswerGrid wrongPresses={nr.wrongPresses} justPressedCorrect={nr.justPressedCorrect}
              locked={nr.answerState === 'correct'} onPress={onAnswer} />
          ) : (
            <AnswerPiano wrongPresses={nr.wrongPresses} answerState={nr.answerState}
              justPressedCorrect={nr.justPressedCorrect} showLabels={names} onPress={onAnswer} middleCMarker="below" />
          )}
        </div>
      </section>
    </main>
  );
};
