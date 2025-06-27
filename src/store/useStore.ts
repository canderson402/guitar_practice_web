import { create } from 'zustand';

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
}

interface CardInfo {
  id: string;
  title: string;
  isActive: boolean;
  layout: 'vertical' | 'horizontal';
}

interface StoreState {
  timer: TimerState;
  metronome: MetronomeState;
  note: NoteState;
  cards: CardInfo[];
  theme: string;
  
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
  
  // Card management
  toggleCard: (cardId: string) => void;
  reorderCards: (startIndex: number, endIndex: number) => void;
  
  // Theme management
  setTheme: (theme: string) => void;
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
  },
  note: {
    selectedNote: 'C',
    selectedScale: null,
    currentNoteIndex: 0,
    nextNoteIndex: 1,
    changeMode: 'none',
    changeInterval: 4,
    randomize: false,
    showNextNote: true,
    autoAdvanceEnabled: true,
  },
  cards: [
    { id: 'practiceProgress', title: 'Session Status', isActive: true, layout: 'horizontal' },
    { id: 'metronome', title: 'Metronome', isActive: true, layout: 'horizontal' },
    { id: 'noteSelector', title: 'Scale', isActive: true, layout: 'horizontal' },
    { id: 'timer', title: 'Timer', isActive: true, layout: 'horizontal' },
    { id: 'guitarNeck', title: 'Fretboard', isActive: true, layout: 'vertical' },
  ],
  theme: 'forest',
  
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
  
  // Note actions
  setSelectedNote: (selectedNote) => set((state) => ({ 
    note: { ...state.note, selectedNote } 
  })),
  setSelectedScale: (selectedScale) => set((state) => ({ 
    note: { ...state.note, selectedScale } 
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
}));