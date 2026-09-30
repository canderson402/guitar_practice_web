import {
  Label,
  labelToPitchClass,
  pitchClassToLabels,
  pickStaffPrompt,
  foldIntoRange,
  noteNameWithOctave,
  RANGE_MIN,
  RANGE_MAX,
  pickFretboardPrompt,
  validateAnswer,
  nextPromptAvoidingRepeat,
  midiFromTuningAndFret,
} from './noteReadingLogic';

describe('labelToPitchClass', () => {
  it('maps naturals and accidentals to pitch classes 0..11', () => {
    expect(labelToPitchClass('C')).toBe(0);
    expect(labelToPitchClass('C#')).toBe(1);
    expect(labelToPitchClass('Db')).toBe(1);
    expect(labelToPitchClass('E#')).toBe(5);
    expect(labelToPitchClass('Fb')).toBe(4);
  });
});

describe('pitchClassToLabels', () => {
  it('returns all spellings for each pitch class', () => {
    expect(pitchClassToLabels(0)).toEqual(['C']);
    expect(pitchClassToLabels(1).sort()).toEqual(['C#', 'Db'].sort());
    expect(pitchClassToLabels(4).sort()).toEqual(['E', 'Fb'].sort());
    expect(pitchClassToLabels(5).sort()).toEqual(['E#', 'F'].sort());
    expect(pitchClassToLabels(11)).toEqual(['B']);
    expect(pitchClassToLabels(2)).toEqual(['D']);
  });
});

describe('midiFromTuningAndFret', () => {
  const std = ['E', 'B', 'G', 'D', 'A', 'E']; // high-E first
  it('low E open = MIDI 40', () => {
    expect(midiFromTuningAndFret(std, 5, 0)).toBe(40);
  });
  it('high E fret 12 = MIDI 76 (one octave above E4)', () => {
    expect(midiFromTuningAndFret(std, 0, 12)).toBe(76);
  });
  it('A open = MIDI 45', () => {
    expect(midiFromTuningAndFret(std, 4, 0)).toBe(45);
  });
});

describe('pickStaffPrompt', () => {
  it('returns a prompt with MIDI in the correct clef range and a matching spelling', () => {
    for (let i = 0; i < 200; i++) {
      const p = pickStaffPrompt();
      expect(p.kind).toBe('staff');
      const [lo, hi] = p.clef === 'treble' ? [60, RANGE_MAX] : [RANGE_MIN, 60];
      expect(p.midi).toBeGreaterThanOrEqual(lo);
      expect(p.midi).toBeLessThanOrEqual(hi);
      expect(labelToPitchClass(p.spelling)).toBe(((p.midi % 12) + 12) % 12);
    }
  });

  it('always spells C and B as naturals', () => {
    const spellings = new Set<Label>();
    for (let i = 0; i < 2000; i++) {
      const p = pickStaffPrompt();
      const pc = ((p.midi % 12) + 12) % 12;
      if (pc === 0 || pc === 11) spellings.add(p.spelling);
    }
    expect(Array.from(spellings).sort()).toEqual(['B', 'C']);
  });
});

describe('pickFretboardPrompt', () => {
  const tuning = ['E', 'B', 'G', 'D', 'A', 'E'];
  it('only picks positions within A1..G6, even on 24 frets', () => {
    for (let i = 0; i < 500; i++) {
      const p = pickFretboardPrompt(tuning, 24);
      expect(p.midi).toBeGreaterThanOrEqual(RANGE_MIN);
      expect(p.midi).toBeLessThanOrEqual(RANGE_MAX);
    }
  });

  it('returns string 0..5, fret 0..12, with at least one acceptable answer', () => {
    for (let i = 0; i < 200; i++) {
      const p = pickFretboardPrompt(tuning);
      expect(p.stringIndex).toBeGreaterThanOrEqual(0);
      expect(p.stringIndex).toBeLessThanOrEqual(5);
      expect(p.fret).toBeGreaterThanOrEqual(0);
      expect(p.fret).toBeLessThanOrEqual(12);
      expect(p.acceptableAnswers.length).toBeGreaterThanOrEqual(1);
      p.acceptableAnswers.forEach(lbl =>
        expect(labelToPitchClass(lbl)).toBe(((p.midi % 12) + 12) % 12),
      );
    }
  });
});

describe('validateAnswer', () => {
  it('staff: only the exact key (right octave) counts', () => {
    const prompt = {
      kind: 'staff' as const, midi: 60, clef: 'treble' as const, spelling: 'C' as Label,
    };
    expect(validateAnswer(prompt, 60)).toBe('correct');
    expect(validateAnswer(prompt, 72)).toBe('wrong');
    expect(validateAnswer(prompt, 48)).toBe('wrong');
  });

  it('fretboard: only the exact key (right octave) counts', () => {
    const prompt = {
      kind: 'fretboard' as const,
      midi: 61, stringIndex: 5, fret: 9,
      acceptableAnswers: ['C#', 'Db'] as Label[],
    };
    expect(validateAnswer(prompt, 61)).toBe('correct');
    expect(validateAnswer(prompt, 73)).toBe('wrong');
  });

  it('note-name buttons match any octave and either enharmonic', () => {
    const prompt = {
      kind: 'fretboard' as const,
      midi: 61, stringIndex: 5, fret: 9,
      acceptableAnswers: ['C#', 'Db'] as Label[],
    };
    expect(validateAnswer(prompt, 'C#')).toBe('correct');
    expect(validateAnswer(prompt, 'Db')).toBe('correct');
    expect(validateAnswer(prompt, 'D')).toBe('wrong');
  });
});

describe('nextPromptAvoidingRepeat', () => {
  it('terminates and returns a valid prompt', () => {
    let prev: ReturnType<typeof pickStaffPrompt> | null = null;
    for (let i = 0; i < 30; i++) {
      const next = nextPromptAvoidingRepeat(prev, 'staff', ['E','B','G','D','A','E']);
      expect(next).toBeTruthy();
      prev = next as any;
    }
  });

  it('fretboard mode also terminates', () => {
    let prev: ReturnType<typeof pickFretboardPrompt> | null = null;
    for (let i = 0; i < 30; i++) {
      const next = nextPromptAvoidingRepeat(prev, 'fretboard', ['E','B','G','D','A','E']);
      expect(next).toBeTruthy();
      prev = next as any;
    }
  });
});

describe('foldIntoRange', () => {
  it('moves pitches by octaves into A1..G6', () => {
    expect(foldIntoRange(20)).toBe(44);
    expect(foldIntoRange(100)).toBe(88);
    expect(foldIntoRange(33)).toBe(33);
    expect(foldIntoRange(91)).toBe(91);
  });
});

describe('noteNameWithOctave', () => {
  it('appends the octave to the spelled label', () => {
    expect(noteNameWithOctave('C', 60)).toBe('C4');
    expect(noteNameWithOctave('Db', 61)).toBe('Db4');
    expect(noteNameWithOctave('A', 33)).toBe('A1');
    expect(noteNameWithOctave('G', 91)).toBe('G6');
    expect(noteNameWithOctave('E#', 65)).toBe('E#4');
  });
});
