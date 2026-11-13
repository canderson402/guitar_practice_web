import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, SlidersHorizontal, Volume2 } from 'lucide-react';
import s from './EarTraining.module.css';
import { Button, IconButton, SegmentedControl, SideSheet, Switch } from '../ui';
import { useCardPref } from '../state/useCardPref';
import {
  FIXED_ROOT, HOTKEYS, NOTE_GAP, INTERVALS, PRESETS, intervalInfo, pickQuestion, questionFrom, questionNotes, toggleInterval,
  type DirectionSetting, type Instrument, type Question,
} from './intervalQuiz';
import { playInterval, preloadEarInstruments, stopEarNotes } from './playback';
import { IntervalBoard, type BoardLabels } from './IntervalBoard';

const PREF = 'ear-training';
/** How long a right answer flashes green before the next interval. */
const FLASH_MS = 350;

const sameSet = (a: number[], b: number[]) => a.length === b.length && a.every(x => b.includes(x));

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

/** Interval ear training: hear two notes on guitar or piano, name the interval. */
export const EarTrainingPage: React.FC = () => {
  const [instrument, setInstrument] = useCardPref<Instrument>(PREF, 'instrument', 'guitar');
  const [direction, setDirection] = useCardPref<DirectionSetting>(PREF, 'direction', 'ascending');
  const [intervals, setIntervals] = useCardPref<number[]>(PREF, 'intervals', PRESETS.diatonic);
  const [fixedRoot, setFixedRoot] = useCardPref<boolean>(PREF, 'fixedRoot', false);
  const [showBoard, setShowBoard] = useCardPref<boolean>(PREF, 'showBoard', true);
  const [boardLabels, setBoardLabels] = useCardPref<BoardLabels>(PREF, 'boardLabels', 'notes');

  const [panelOpen, setPanelOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  // Wrong guesses on this question; the answer flashing green (right, about to move on).
  const [wrongs, setWrongs] = useState<number[]>([]);
  const [flash, setFlash] = useState<number | null>(null);
  // The rising "CORRECT!": which button it rises from (it outlives the flash).
  const [pop, setPop] = useState<{ semitones: number; id: number } | null>(null);
  const flashTimer = useRef<number | null>(null);
  const cancelFlash = () => { if (flashTimer.current !== null) { window.clearTimeout(flashTimer.current); flashTimer.current = null; } };
  const [score, setScore] = useState({ correct: 0, total: 0 });

  // What the fretboard / piano shows: the notes, and whether the second one sounds yet.
  const [shown, setShown] = useState<{ notes: [number, number]; secondLit: boolean } | null>(null);
  const litTimer = useRef<number | null>(null);
  const clearLitTimer = () => { if (litTimer.current !== null) { window.clearTimeout(litTimer.current); litTimer.current = null; } };

  useEffect(() => {
    preloadEarInstruments();
    return () => { stopEarNotes(); clearLitTimer(); cancelFlash(); };
  }, []);


  /** Play an interval and light its notes on the board as they sound. */
  const sound = useCallback((q: Question) => {
    playInterval(instrument, q);
    clearLitTimer();
    const together = q.direction === 'harmonic';
    setShown({ notes: questionNotes(q), secondLit: together });
    if (!together) {
      litTimer.current = window.setTimeout(() => {
        litTimer.current = null;
        setShown(sh => (sh ? { ...sh, secondLit: true } : sh));
      }, NOTE_GAP * 1000);
    }
  }, [instrument]);

  const ask = useCallback((previous?: Question) => {
    cancelFlash();
    const q = pickQuestion({ intervals, direction, fixedRoot, instrument }, Math.random, previous);
    setQuestion(q);
    setWrongs([]);
    setFlash(null);
    setStarted(true);
    sound(q);
  }, [intervals, direction, fixedRoot, instrument, sound]);

  const next = useCallback(() => ask(question ?? undefined), [ask, question]);
  const askRef = useRef(ask);
  askRef.current = ask;
  const reset = () => { setScore({ correct: 0, total: 0 }); ask(); };
  const hearAgain = useCallback(() => {
    if (!question) return;
    sound(question);
  }, [question, sound]);

  // A changed option takes effect at once: a new interval with the new settings.
  const settingsKey = `${instrument}|${direction}|${fixedRoot}|${intervals.join(',')}`;
  const lastKey = useRef(settingsKey);
  useEffect(() => {
    if (lastKey.current === settingsKey) return;
    lastKey.current = settingsKey;
    if (started) ask(question ?? undefined);
  }, [settingsKey, started, ask, question]);

  const answer = useCallback((semitones: number) => {
    if (!question || !intervals.includes(semitones)) return;
    if (flash !== null || wrongs.includes(semitones)) return;
    const right = semitones === question.semitones;
    // Only the first guess on a question scores.
    if (wrongs.length === 0) setScore(sc => ({ correct: sc.correct + (right ? 1 : 0), total: sc.total + 1 }));
    if (!right) {
      // Try again: hear it once more, the answer still hidden.
      setWrongs(w => [...w, semitones]);
      sound(question);
      return;
    }
    // Right: flash green and send up a CORRECT! for a split second, then a new interval.
    setFlash(semitones);
    setPop(p => ({ semitones, id: (p?.id ?? 0) + 1 }));
    flashTimer.current = window.setTimeout(() => { flashTimer.current = null; askRef.current(question); }, FLASH_MS);
  }, [question, flash, wrongs, intervals, sound]);

  // Page keys. Capture on window so Space does not also start the metronome.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.target instanceof HTMLElement && e.target.closest('[role="dialog"]')) return;
      if (e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        if (e.repeat) return;
        next();
        return;
      }
      if (!started) return;
      if (e.key === 'a' || e.key === 'A') { e.stopPropagation(); hearAgain(); return; }
      const idx = HOTKEYS.indexOf(e.key);
      if (idx >= 0) { e.stopPropagation(); answer(idx + 1); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [started, next, hearAgain, answer]);

  // Listen: the interval from middle C, in the chosen direction ("Both" plays it up).
  const listen = (semitones: number) => {
    const dir = direction === 'both' ? 'ascending' : direction;
    sound(questionFrom(FIXED_ROOT, semitones, dir));
  };

  const DIRECTION_LABEL: Record<DirectionSetting, string> = { ascending: 'Up', descending: 'Down', both: 'Up & down', harmonic: 'Together' };
  const summary = `${instrument === 'guitar' ? 'Guitar' : 'Piano'} · ${DIRECTION_LABEL[direction]} · ${intervals.length} intervals${fixedRoot ? ' · Fixed root' : ''}`;

  const lastWrong = wrongs[wrongs.length - 1];
  const feedback = lastWrong !== undefined ? `Not a ${intervalInfo(lastWrong).name} — try again` : '';

  return (
    <main className={s.page}>
      <header className={s.top}>
        <h1 className={s.title}>Ear Training</h1>
        <button type="button" className={s.summary} data-sheet-trigger onClick={() => setPanelOpen(o => !o)}>
          {summary}
        </button>
        <IconButton label="Ear training settings" icon={<SlidersHorizontal size={16} />} data-sheet-trigger
          onClick={() => setPanelOpen(o => !o)} />
      </header>

      <SideSheet open={panelOpen} onClose={() => setPanelOpen(false)} title="Ear training settings">
        <div className={s.panel}>
          <div className={s.field}><span className={s.fieldLabel}>Instrument</span>
            <SegmentedControl<Instrument> label="Instrument" value={instrument} onChange={setInstrument}
              options={[{ value: 'guitar', label: 'Guitar' }, { value: 'piano', label: 'Piano' }]} />
          </div>
          <div className={s.field}><span className={s.fieldLabel}>Direction</span>
            <SegmentedControl<DirectionSetting> label="Direction" value={direction} onChange={setDirection}
              options={[
                { value: 'ascending', label: 'Up' }, { value: 'descending', label: 'Down' },
                { value: 'both', label: 'Both' }, { value: 'harmonic', label: 'Together' },
              ]} />
          </div>
          <label className={s.switchField}>
            <Switch label="Fixed root" checked={fixedRoot} onChange={setFixedRoot} />
            <span>Fixed root (always start on middle C)</span>
          </label>
          <label className={s.switchField}>
            <Switch label="Show the board" checked={showBoard} onChange={setShowBoard} />
            <span>Show the {instrument === 'guitar' ? 'fretboard' : 'piano'} (off = audio only)</span>
          </label>
          <div className={s.field}><span className={s.fieldLabel}>Board labels</span>
            <SegmentedControl<BoardLabels> label="Board labels" value={boardLabels} onChange={setBoardLabels}
              options={[{ value: 'notes', label: 'Notes' }, { value: 'intervals', label: 'Intervals' }, { value: 'dots', label: 'Dots' }]} />
          </div>
          <div className={s.field}><span className={s.fieldLabel}>Intervals</span>
        <div className={s.presets}>
          {(['simple', 'diatonic', 'all'] as const).map(p => {
            const on = sameSet(intervals, PRESETS[p]);
            return (
              <button key={p} type="button" aria-pressed={on} className={[s.preset, on ? s.on : ''].join(' ')}
                onClick={() => setIntervals(PRESETS[p])}>
                {p[0].toUpperCase() + p.slice(1)}
              </button>
            );
          })}
        </div>
        <div className={s.chips} role="group" aria-label="Intervals">
          {INTERVALS.map(i => {
            const on = intervals.includes(i.semitones);
            return (
              <div key={i.semitones} className={[s.chip, on ? s.on : ''].join(' ')}>
                <button type="button" aria-pressed={on} aria-label={i.name} className={s.chipToggle}
                  onClick={() => setIntervals(toggleInterval(intervals, i.semitones))}>
                  {i.short}
                </button>
                <button type="button" aria-label={`Listen to ${i.name}`} className={s.chipListen}
                  onClick={() => listen(i.semitones)}>
                  <Volume2 size={12} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
          </div>
        </div>
      </SideSheet>

      <section className={s.card} aria-label="Practice">
        {!started ? (
          <div className={s.center}>
            <p className={s.hint}>Listen to two notes, then name the interval.</p>
            <Button variant="primary" onClick={() => ask()}>Start</Button>
          </div>
        ) : (
          <>
            <div className={s.promptLine}>
              <span className={s.score}>{score.correct}/{score.total}</span>
              <span role="status" className={[s.feedback, lastWrong !== undefined ? s.bad : ''].join(' ')}>
                {feedback}
              </span>
              <IconButton size="sm" label="Reset" icon={<RotateCcw size={14} />} onClick={reset} />
            </div>

            <div className={s.answers} role="group" aria-label="Answers">
              {INTERVALS.filter(i => intervals.includes(i.semitones)).map(i => {
                const isWrong = wrongs.includes(i.semitones);
                return (
                  <button key={i.semitones} type="button" aria-label={i.name}
                    className={[s.answer, isWrong ? s.wrong : '', flash === i.semitones ? s.right : ''].join(' ')}
                    onClick={() => answer(i.semitones)}>
                    <span className={s.answerName}>{i.name}</span>
                    <span className={s.hotkey}>{HOTKEYS[i.semitones - 1]}</span>
                    {pop?.semitones === i.semitones && (
                      <span key={pop.id} className={s.pop} onAnimationEnd={() => setPop(null)}>CORRECT!</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className={s.controls}>
              <Button onClick={hearAgain}>Hear again (A)</Button>
              <Button variant="primary" onClick={next}>Next (Space)</Button>
            </div>
          </>
        )}
      </section>

      {showBoard && (
        <section className={s.board} aria-label="Notes">
          <IntervalBoard instrument={instrument} notes={shown?.notes ?? null} secondLit={shown?.secondLit ?? false} labels={boardLabels} />
        </section>
      )}
    </main>
  );
};
