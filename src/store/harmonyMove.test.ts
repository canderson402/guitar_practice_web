import { act } from '@testing-library/react';
import { useStore } from './useStore';

const hm = () => useStore.getState().harmonyMaker;
beforeEach(() => act(() => useStore.getState().clearHarmonyMaker()));

it('moves one of your harmony notes to another fret, keeping its interval and place in the order', () => {
  act(() => {
    const st = useStore.getState();
    st.addBaseNote({ stringIndex: 4, fret: 3 });
    st.addBaseNote({ stringIndex: 4, fret: 5 });
    st.setNoteInterval(4, 3, { kind: 'diatonic', degrees: 4 });
    st.cycleNoteVoicing(4, 3, 3);
  });
  act(() => useStore.getState().moveBaseNote({ stringIndex: 4, fret: 3 }, { stringIndex: 5, fret: 8 }));
  expect(hm().notes[0]).toEqual({ stringIndex: 5, fret: 8, interval: { kind: 'diatonic', degrees: 4 }, voicingIdx: 0, harmonized: false });
  expect(hm().notes[1]).toMatchObject({ stringIndex: 4, fret: 5 });
});

it('won\'t move a note onto another of your notes', () => {
  act(() => { useStore.getState().addBaseNote({ stringIndex: 4, fret: 3 }); useStore.getState().addBaseNote({ stringIndex: 4, fret: 5 }); });
  act(() => useStore.getState().moveBaseNote({ stringIndex: 4, fret: 3 }, { stringIndex: 4, fret: 5 }));
  expect(hm().notes.map(n => n.fret)).toEqual([3, 5]);
});

it('swaps two notes\' places in the order (nothing in between moves)', () => {
  act(() => { const st = useStore.getState(); st.addBaseNote({ stringIndex: 4, fret: 3 }); st.addBaseNote({ stringIndex: 4, fret: 5 }); st.addBaseNote({ stringIndex: 4, fret: 7 }); });
  act(() => useStore.getState().swapNotes(0, 2));
  expect(hm().notes.map(n => n.fret)).toEqual([7, 5, 3]);
});

it('new notes wait for Apply to be harmonized; Apply harmonizes them all', () => {
  act(() => useStore.getState().addBaseNote({ stringIndex: 4, fret: 3 }));
  expect(hm().notes[0].harmonized).toBe(false);
  act(() => useStore.getState().applyDefaultToAll());
  expect(hm().notes[0].harmonized).toBe(true);
});

it('a harmony spot you pick is saved on the note; Apply, a new interval, or moving the note clears it', () => {
  const st = () => useStore.getState();
  act(() => { st().addBaseNote({ stringIndex: 4, fret: 3 }); st().setHarmonyPosition(4, 3, { stringIndex: 2, fret: 9 }); });
  expect(hm().notes[0].harmonyAt).toEqual({ stringIndex: 2, fret: 9 });
  act(() => st().applyDefaultToAll());
  expect(hm().notes[0].harmonyAt).toBeUndefined();
  act(() => st().setHarmonyPosition(4, 3, { stringIndex: 2, fret: 9 }));
  act(() => st().setNoteInterval(4, 3, { kind: 'diatonic', degrees: 4 }));
  expect(hm().notes[0].harmonyAt).toBeUndefined();
  act(() => st().setHarmonyPosition(4, 3, { stringIndex: 2, fret: 9 }));
  act(() => st().moveBaseNote({ stringIndex: 4, fret: 3 }, { stringIndex: 5, fret: 8 }));
  expect(hm().notes[0].harmonyAt).toBeUndefined();
});
