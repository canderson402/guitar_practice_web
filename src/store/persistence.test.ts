import { act } from '@testing-library/react';
import { APP_STORAGE_KEY, mergeAppPrefs, useStore } from './useStore';

const saved = () => JSON.parse(localStorage.getItem(APP_STORAGE_KEY) ?? '{}').state;

it('saves your preferences in the browser: tuning, key, metronome, volumes, trainer, jam, view…', () => {
  act(() => {
    const st = useStore.getState();
    st.setTuning(['D', 'A', 'G', 'D', 'A', 'D']);
    st.setSelectedNote('Eb');
    st.setSelectedScale('Dorian');
    st.setBpm(92);
    st.setSubdivision('eighth');
    st.setMetronomeVolume(40);
    st.setMasterMuted(true);
    st.setCircleDirection('counterclockwise');
    st.setJamBarsPerChord(2);
    st.setViewMode('piano');
  });
  const s = saved();
  expect(s.note).toMatchObject({ tuning: ['D', 'A', 'G', 'D', 'A', 'D'], selectedNote: 'Eb', selectedScale: 'Dorian' });
  expect(s.metronome).toMatchObject({ bpm: 92, subdivision: 'eighth', volume: 40 });
  expect(s.jam).toMatchObject({ barsPerChord: 2, mixer: { master: { muted: true } } });
  expect(s.circleOfFifths).toMatchObject({ direction: 'counterclockwise' });
  expect(s.viewMode).toBe('piano');
});

it('...but not what only matters while playing', () => {
  act(() => { useStore.getState().setMetronomePlaying(true); useStore.getState().setJamPlaying(true); });
  const s = saved();
  expect(s.metronome.isPlaying).toBeUndefined();
  expect(s.jam.isPlaying).toBeUndefined();
  expect(s.jam.chordQueue).toBeUndefined();
  expect(s.note.currentNoteIndex).toBeUndefined();
  expect(s.noteReading?.score).toBeUndefined();
  act(() => { useStore.getState().setMetronomePlaying(false); useStore.getState().setJamPlaying(false); });
});

it('restores saved preferences over the defaults, ignoring anything malformed', () => {
  const current = useStore.getState();
  const merged = mergeAppPrefs({
    note: { tuning: ['D', 'A', 'G', 'D', 'A', 'D'], selectedScale: 'Lydian' },
    metronome: { bpm: 77, isPlaying: true },
    jam: { mixer: { master: { volume: 60 } } },
    timer: 'garbage',
  }, current);
  expect(merged.note.tuning).toEqual(['D', 'A', 'G', 'D', 'A', 'D']);
  expect(merged.note.selectedScale).toBe('Lydian');
  expect(merged.metronome.bpm).toBe(77);
  expect(merged.metronome.isPlaying).toBe(false);          // never restored
  expect(merged.jam.mixer.master.volume).toBe(60);
  expect(merged.jam.mixer.chords).toEqual(current.jam.mixer.chords);
  expect(merged.timer).toEqual(current.timer);
  expect(mergeAppPrefs({ note: { tuning: 'nope' } }, current).note.tuning).toEqual(current.note.tuning);
});

it('a reload brings them back', () => {
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify({ state: { note: { tuning: ['C', 'G', 'D', 'G', 'C', 'C'] }, metronome: { bpm: 66 } }, version: 1 }));
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fresh = require('./useStore').useStore;
    expect(fresh.getState().note.tuning).toEqual(['C', 'G', 'D', 'G', 'C', 'C']);
    expect(fresh.getState().metronome.bpm).toBe(66);
  });
});
