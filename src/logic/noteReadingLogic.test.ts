import {
  Label,
  labelToPitchClass,
  pitchClassToLabels,
  pickStaffPrompt,
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
    expect(labelToPitchClass('B#')).toBe(0);
    expect(labelToPitchClass('Cb')).toBe(11);
    expect(labelToPitchClass('E#')).toBe(5);
    expect(labelToPitchClass('Fb')).toBe(4);
  });
});

describe('pitchClassToLabels', () => {
  it('returns all 21-label-set spellings for each pitch class', () => {
    expect(pitchClassToLabels(0).sort()).toEqual(['B#', 'C'].sort());
    expect(pitchClassToLabels(1).sort()).toEqual(['C#', 'Db'].sort());
    expect(pitchClassToLabels(4).sort()).toEqual(['E', 'Fb'].sort());
    expect(pitchClassToLabels(5).sort()).toEqual(['E#', 'F'].sort());
    expect(pitchClassToLabels(11).sort()).toEqual(['B', 'Cb'].sort());
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
      if (p.clef === 'treble') {
        expect(p.midi).toBeGreaterThanOrEqual(60);
        expect(p.midi).toBeLessThanOrEqual(84);
      } else {
        expect(p.midi).toBeGreaterThanOrEqual(40);
        expect(p.midi).toBeLessThanOrEqual(60);
      }
      expect(labelToPitchClass(p.spelling)).toBe(((p.midi % 12) + 12) % 12);
    }
  });
});

describe('pickFretboardPrompt', () => {
  const tuning = ['E', 'B', 'G', 'D', 'A', 'E'];
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
  it('staff: only the exact spelling counts', () => {
    const prompt = {
      kind: 'staff' as const, midi: 61, clef: 'treble' as const, spelling: 'C#' as Label,
    };
    expect(validateAnswer(prompt, 'C#')).toBe('correct');
    expect(validateAnswer(prompt, 'Db')).toBe('wrong');
    expect(validateAnswer(prompt, 'C')).toBe('wrong');
  });

  it('fretboard: any enharmonic counts', () => {
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
