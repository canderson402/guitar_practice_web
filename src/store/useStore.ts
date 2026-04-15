import { create } from 'zustand';
import { IntervalSpec } from '../data/musicData';

interface TimerState {
  isRunning: boolean;
  elapsedSeconds: number;
  mode: 'countUp' | 'countDown';
  targetSeconds: number;
}

interface MetronomeState {
  bpm: number;
  isPlaying: boolean;
  currentBeat: number;
  beatsPerMeasure: number;
  subdivision: 'quarter' | 'eighth' | 'sixteenth' | 'eighthTriplet' | 'sixteenthTriplet';
  emphasizeFirstBeat: boolean;
  soundType: 'synth' | 'asrx';
}

export interface SelectedChord {
  note: string;
  type: string;
  symbol: string;
  roman: string;
}

interface NoteState {
  selectedNote: string | null;
  selectedScale: string | null;
  currentNoteIndex: number;
  nextNoteIndex: number;
  changeMode: 'none' | 'bars' | 'time';
  changeInterval: number;
  randomize: boolean;
  showNextNote: boolean;
  autoAdvanceEnabled: boolean;
  selectedChord: SelectedChord | null;
}

interface ChordProgressionState {
  selectedProgression: string | null;
  currentChordIndex: number;
  autoAdvance: boolean;
  barsPerChord: number;
  keyType: 'major' | 'minor';
  selectedStyle: string;
  showProgression: boolean;
}

interface CircleOfFifthsState {
  autoAdvance: boolean;
  direction: 'clockwise' | 'counterclockwise';
  changeMode: 'none' | 'bars' | 'time' | 'beats';
  changeInterval: number;
  randomize: boolean;
  showNext: boolean;
  nextNote: string | null;
  countIn: number;
}

export interface FretPosition {
  stringIndex: number;
  fret: number;
  note: string;
}

// One entry per base note placed on the HarmonyMaker fretboard. Insertion
// order of `notes` is also the play order surfaced in the analysis panel.
export interface HarmonyNote {
  stringIndex: number;
  fret: number;
  note: string;
  interval: IntervalSpec;  // per-note spec — overrides are simply a value diff
  voicingIdx: number;      // index into the currently-computed voicings list
}

interface HarmonyMakerState {
  notes: HarmonyNote[];
  defaultInterval: IntervalSpec;
}

interface CardInfo {
  id: string;
  title: string;
  isActive: boolean;
  layout: 'vertical' | 'horizontal';
}

interface ConfigurationPreset {
  id: string;
  name: string;
  enabledCards: string[];
}

export const configurationPresets: ConfigurationPreset[] = [
  {
    id: 'default',
    name: 'Default',
    enabledCards: ['metronome', 'noteSelector', 'noteTrainer'],
  },
  {
    id: 'theory',
    name: 'Theory',
    enabledCards: ['noteSelector', 'circleOfFifths', 'chordProgression', 'guitarNeck'],
  },
  {
    id: 'harmony',
    name: 'Harmony',
    enabledCards: ['noteSelector', 'harmonyMaker', 'guitarNeck'],
  },
  {
    id: 'all',
    name: 'All',
    enabledCards: ['metronome', 'timer', 'noteSelector', 'noteTrainer', 'circleOfFifths', 'chordProgression', 'harmonyMaker', 'guitarNeck'],
  },
];

interface StoreState {
  timer: TimerState;
  metronome: MetronomeState;
  note: NoteState;
  chordProgression: ChordProgressionState;
  circleOfFifths: CircleOfFifthsState;
  harmonyMaker: HarmonyMakerState;
  cards: CardInfo[];
  theme: string;
  currentConfiguration: string;
  
  // Timer actions
  setTimerRunning: (isRunning: boolean) => void;
  setElapsedSeconds: (seconds: number) => void;
  setTimerMode: (mode: 'countUp' | 'countDown') => void;
  setTargetSeconds: (seconds: number) => void;
  
  // Metronome actions
  setMetronomePlaying: (isPlaying: boolean) => void;
  setBpm: (bpm: number) => void;
  setCurrentBeat: (beat: number) => void;
  setBeatsPerMeasure: (beats: number) => void;
  setSubdivision: (subdivision: 'quarter' | 'eighth' | 'sixteenth' | 'eighthTriplet' | 'sixteenthTriplet') => void;
  setEmphasizeFirstBeat: (emphasize: boolean) => void;
  setMetronomeSoundType: (soundType: 'synth' | 'asrx') => void;
  
  // Note actions
  setSelectedNote: (note: string | null) => void;
  setSelectedScale: (scale: string | null) => void;
  setCurrentNoteIndex: (index: number | ((prev: number) => number)) => void;
  setNextNoteIndex: (index: number) => void;
  setChangeMode: (mode: 'none' | 'bars' | 'time') => void;
  setChangeInterval: (interval: number) => void;
  setRandomize: (randomize: boolean) => void;
  setShowNextNote: (show: boolean) => void;
  setAutoAdvanceEnabled: (enabled: boolean) => void;
  setSelectedChord: (chord: SelectedChord | null) => void;
  
  // Chord Progression actions
  setSelectedChordProgression: (progression: string | null) => void;
  setCurrentChordIndex: (index: number) => void;
  setChordAutoAdvance: (enabled: boolean) => void;
  setChordBarsPerChord: (bars: number) => void;
  setChordKeyType: (keyType: 'major' | 'minor') => void;
  setChordSelectedStyle: (style: string) => void;
  setChordShowProgression: (show: boolean) => void;
  
  // Circle of Fifths actions
  setCircleAutoAdvance: (enabled: boolean) => void;
  setCircleDirection: (direction: 'clockwise' | 'counterclockwise') => void;
  setCircleChangeMode: (mode: 'none' | 'bars' | 'time' | 'beats') => void;
  setCircleChangeInterval: (interval: number) => void;
  setCircleRandomize: (randomize: boolean) => void;
  setCircleShowNext: (showNext: boolean) => void;
  setCircleNextNote: (nextNote: string | null) => void;
  setCircleCountIn: (countIn: number) => void;
  
  // Harmony Maker actions — unified model: one list of HarmonyNote records +
  // a default interval for new clicks. Reorder/delete carries each note's
  // interval + voicing with it automatically.
  addBaseNote: (pos: FretPosition) => void;
  removeBaseNote: (stringIndex: number, fret: number) => void;
  reorderNotes: (fromIdx: number, toIdx: number) => void;
  setNoteInterval: (stringIndex: number, fret: number, spec: IntervalSpec) => void;
  cycleNoteVoicing: (stringIndex: number, fret: number, totalVoicings: number) => void;
  setNoteVoicingIdx: (stringIndex: number, fret: number, idx: number) => void;
  setDefaultInterval: (spec: IntervalSpec) => void;
  applyDefaultToAll: () => void;
  clearHarmonyMaker: () => void;

  // Card management
  toggleCard: (cardId: string) => void;
  reorderCards: (startIndex: number, endIndex: number) => void;
  
  // Theme management
  setTheme: (theme: string) => void;

  // Configuration presets
  applyConfiguration: (presetId: string) => void;
}

export const useStore = create<StoreState>((set) => ({
  timer: {
    isRunning: false,
    elapsedSeconds: 0,
    mode: 'countUp',
    targetSeconds: 300,
  },
  metronome: {
    bpm: 120,
    isPlaying: false,
    currentBeat: 0,
    beatsPerMeasure: 4,
    subdivision: 'quarter',
    emphasizeFirstBeat: false,
    soundType: 'asrx',
  },
  note: {
    selectedNote: 'C',
    selectedScale: 'Major (Ionian)',
    currentNoteIndex: 0,
    nextNoteIndex: 1,
    changeMode: 'none',
    changeInterval: 4,
    randomize: false,
    showNextNote: true,
    autoAdvanceEnabled: true,
    selectedChord: null,
  },
  chordProgression: {
    selectedProgression: null,
    currentChordIndex: 0,
    autoAdvance: false,
    barsPerChord: 2,
    keyType: 'major',
    selectedStyle: 'Rock',
    showProgression: false,
  },
  circleOfFifths: {
    autoAdvance: false,
    direction: 'clockwise',
    changeMode: 'beats',
    changeInterval: 11,
    randomize: false,
    showNext: true,
    nextNote: null,
    countIn: 4,
  },
  harmonyMaker: {
    notes: [],
    // Default to the diatonic 3rd — the most musically useful starting harmony.
    defaultInterval: { kind: 'diatonic', degrees: 2 },
  },
  cards: [
    { id: 'metronome', title: 'Metronome', isActive: true, layout: 'horizontal' },
    { id: 'timer', title: 'Timer', isActive: false, layout: 'horizontal' },
    { id: 'noteSelector', title: 'Scale', isActive: true, layout: 'horizontal' },
    { id: 'noteTrainer', title: 'Note Trainer', isActive: true, layout: 'horizontal' },
    { id: 'circleOfFifths', title: 'Circle of Fifths', isActive: false, layout: 'horizontal' },
    { id: 'chordProgression', title: 'Chord', isActive: false, layout: 'horizontal' },
    { id: 'harmonyMaker', title: 'Harmony Maker', isActive: false, layout: 'vertical' },
    { id: 'guitarNeck', title: 'Fretboard', isActive: false, layout: 'vertical' },
  ],
  theme: 'eighties',
  currentConfiguration: 'default',
  
  // Timer actions
  setTimerRunning: (isRunning) => set((state) => ({ 
    timer: { ...state.timer, isRunning } 
  })),
  setElapsedSeconds: (elapsedSeconds) => set((state) => ({ 
    timer: { ...state.timer, elapsedSeconds } 
  })),
  setTimerMode: (mode) => set((state) => ({ 
    timer: { ...state.timer, mode } 
  })),
  setTargetSeconds: (targetSeconds) => set((state) => ({ 
    timer: { ...state.timer, targetSeconds } 
  })),
  
  // Metronome actions
  setMetronomePlaying: (isPlaying) => set((state) => ({ 
    metronome: { ...state.metronome, isPlaying } 
  })),
  setBpm: (bpm) => set((state) => ({ 
    metronome: { ...state.metronome, bpm } 
  })),
  setCurrentBeat: (currentBeat) => set((state) => ({ 
    metronome: { ...state.metronome, currentBeat } 
  })),
  setBeatsPerMeasure: (beatsPerMeasure) => set((state) => ({ 
    metronome: { ...state.metronome, beatsPerMeasure } 
  })),
  setSubdivision: (subdivision) => set((state) => ({ 
    metronome: { ...state.metronome, subdivision } 
  })),
  setEmphasizeFirstBeat: (emphasizeFirstBeat) => set((state) => ({ 
    metronome: { ...state.metronome, emphasizeFirstBeat } 
  })),
  setMetronomeSoundType: (soundType) => set((state) => ({
    metronome: { ...state.metronome, soundType }
  })),
  
  // Note actions
  setSelectedNote: (selectedNote) => set((state) => ({
    // Clear any highlighted chord when the key changes — the old chord no
    // longer fits the new scale context.
    note: { ...state.note, selectedNote, selectedChord: null }
  })),
  setSelectedScale: (selectedScale) => set((state) => ({
    // Same: chord highlight is scoped to the active scale.
    note: { ...state.note, selectedScale, selectedChord: null }
  })),
  setSelectedChord: (selectedChord) => set((state) => ({
    note: { ...state.note, selectedChord }
  })),
  setCurrentNoteIndex: (currentNoteIndex) => set((state) => ({ 
    note: { 
      ...state.note, 
      currentNoteIndex: typeof currentNoteIndex === 'function' 
        ? currentNoteIndex(state.note.currentNoteIndex) 
        : currentNoteIndex 
    } 
  })),
  setNextNoteIndex: (nextNoteIndex) => set((state) => ({ 
    note: { ...state.note, nextNoteIndex } 
  })),
  setChangeMode: (changeMode) => set((state) => ({ 
    note: { ...state.note, changeMode } 
  })),
  setChangeInterval: (changeInterval) => set((state) => ({ 
    note: { ...state.note, changeInterval } 
  })),
  setRandomize: (randomize) => set((state) => ({ 
    note: { ...state.note, randomize } 
  })),
  setShowNextNote: (showNextNote) => set((state) => ({ 
    note: { ...state.note, showNextNote } 
  })),
  setAutoAdvanceEnabled: (autoAdvanceEnabled) => set((state) => ({ 
    note: { ...state.note, autoAdvanceEnabled } 
  })),
  
  // Chord Progression actions
  setSelectedChordProgression: (selectedProgression) => set((state) => ({ 
    chordProgression: { ...state.chordProgression, selectedProgression } 
  })),
  setCurrentChordIndex: (currentChordIndex) => set((state) => ({ 
    chordProgression: { ...state.chordProgression, currentChordIndex } 
  })),
  setChordAutoAdvance: (autoAdvance) => set((state) => ({ 
    chordProgression: { ...state.chordProgression, autoAdvance } 
  })),
  setChordBarsPerChord: (barsPerChord) => set((state) => ({ 
    chordProgression: { ...state.chordProgression, barsPerChord } 
  })),
  setChordKeyType: (keyType) => set((state) => ({ 
    chordProgression: { ...state.chordProgression, keyType, selectedProgression: null } 
  })),
  setChordSelectedStyle: (selectedStyle) => set((state) => ({
    chordProgression: { ...state.chordProgression, selectedStyle }
  })),
  setChordShowProgression: (showProgression) => set((state) => ({
    chordProgression: { ...state.chordProgression, showProgression }
  })),
  
  // Circle of Fifths actions
  setCircleAutoAdvance: (autoAdvance) => set((state) => ({
    circleOfFifths: { ...state.circleOfFifths, autoAdvance }
  })),
  setCircleDirection: (direction) => set((state) => ({
    circleOfFifths: { ...state.circleOfFifths, direction }
  })),
  setCircleChangeMode: (changeMode) => set((state) => ({
    circleOfFifths: { ...state.circleOfFifths, changeMode }
  })),
  setCircleChangeInterval: (changeInterval) => set((state) => ({
    circleOfFifths: { ...state.circleOfFifths, changeInterval }
  })),
  setCircleRandomize: (randomize) => set((state) => ({
    circleOfFifths: { ...state.circleOfFifths, randomize }
  })),
  setCircleShowNext: (showNext) => set((state) => ({
    circleOfFifths: { ...state.circleOfFifths, showNext }
  })),
  setCircleNextNote: (nextNote) => set((state) => ({
    circleOfFifths: { ...state.circleOfFifths, nextNote }
  })),
  setCircleCountIn: (countIn) => set((state) => ({
    circleOfFifths: { ...state.circleOfFifths, countIn }
  })),
  
  // Harmony Maker actions — see interface comments above for the data model.
  addBaseNote: (pos) => set((state) => {
    // Toggle: clicking an existing note removes it; clicking a new spot adds
    // it with the current default interval and voicing 0.
    const exists = state.harmonyMaker.notes.some(
      n => n.stringIndex === pos.stringIndex && n.fret === pos.fret
    );
    const notes = exists
      ? state.harmonyMaker.notes.filter(
          n => !(n.stringIndex === pos.stringIndex && n.fret === pos.fret)
        )
      : [
          ...state.harmonyMaker.notes,
          {
            stringIndex: pos.stringIndex,
            fret: pos.fret,
            note: pos.note,
            interval: state.harmonyMaker.defaultInterval,
            voicingIdx: 0,
          },
        ];
    return { harmonyMaker: { ...state.harmonyMaker, notes } };
  }),
  removeBaseNote: (stringIndex, fret) => set((state) => ({
    harmonyMaker: {
      ...state.harmonyMaker,
      notes: state.harmonyMaker.notes.filter(
        n => !(n.stringIndex === stringIndex && n.fret === fret)
      ),
    },
  })),
  reorderNotes: (fromIdx, toIdx) => set((state) => {
    const arr = [...state.harmonyMaker.notes];
    if (
      fromIdx < 0 || fromIdx >= arr.length ||
      toIdx < 0 || toIdx >= arr.length ||
      fromIdx === toIdx
    ) {
      return state;
    }
    const [item] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, item);
    return { harmonyMaker: { ...state.harmonyMaker, notes: arr } };
  }),
  setNoteInterval: (stringIndex, fret, spec) => set((state) => ({
    harmonyMaker: {
      ...state.harmonyMaker,
      // Changing the interval changes the target note, so reset voicingIdx —
      // the previous voicing was for a different pitch.
      notes: state.harmonyMaker.notes.map(n =>
        n.stringIndex === stringIndex && n.fret === fret
          ? { ...n, interval: spec, voicingIdx: 0 }
          : n
      ),
    },
  })),
  cycleNoteVoicing: (stringIndex, fret, totalVoicings) => set((state) => {
    if (totalVoicings <= 1) return state;
    return {
      harmonyMaker: {
        ...state.harmonyMaker,
        notes: state.harmonyMaker.notes.map(n =>
          n.stringIndex === stringIndex && n.fret === fret
            ? { ...n, voicingIdx: (n.voicingIdx + 1) % totalVoicings }
            : n
        ),
      },
    };
  }),
  setNoteVoicingIdx: (stringIndex, fret, idx) => set((state) => ({
    harmonyMaker: {
      ...state.harmonyMaker,
      notes: state.harmonyMaker.notes.map(n =>
        n.stringIndex === stringIndex && n.fret === fret
          ? { ...n, voicingIdx: idx }
          : n
      ),
    },
  })),
  setDefaultInterval: (spec) => set((state) => ({
    // Existing notes are untouched — "Apply to all" is the separate action
    // that propagates the default.
    harmonyMaker: { ...state.harmonyMaker, defaultInterval: spec },
  })),
  applyDefaultToAll: () => set((state) => ({
    harmonyMaker: {
      ...state.harmonyMaker,
      notes: state.harmonyMaker.notes.map(n => ({
        ...n,
        interval: state.harmonyMaker.defaultInterval,
        voicingIdx: 0,
      })),
    },
  })),
  clearHarmonyMaker: () => set((state) => ({
    harmonyMaker: { ...state.harmonyMaker, notes: [] },
  })),

  // Card management
  toggleCard: (cardId) => set((state) => ({
    cards: state.cards.map(card => 
      card.id === cardId 
        ? { ...card, isActive: !card.isActive }
        : card
    )
  })),
  reorderCards: (startIndex, endIndex) => set((state) => {
    const newCards = [...state.cards];
    const [removed] = newCards.splice(startIndex, 1);
    newCards.splice(endIndex, 0, removed);
    return { cards: newCards };
  }),
  
  // Theme actions
  setTheme: (theme) => set({ theme }),

  // Configuration presets
  applyConfiguration: (presetId) => set((state) => {
    const preset = configurationPresets.find(p => p.id === presetId);
    if (!preset) return state;

    return {
      currentConfiguration: presetId,
      cards: state.cards.map(card => ({
        ...card,
        isActive: preset.enabledCards.includes(card.id),
      })),
    };
  }),
}));