import { useStore } from '../../../store/useStore';
import { useCardPref } from '../../state/useCardPref';
import { chordType } from '../../../data/chordBuilder';

export interface BuilderState { root: string; typeId: string }

/** The "Any chord" picker: a root and a chord type (remembered in the
 *  browser). Picking shows that chord app-wide. */
export const useChordBuilder = () => {
  const [saved, setSaved] = useCardPref<Partial<BuilderState> | undefined>('chord', 'builder', undefined);
  const keyRoot = useStore(st => st.note.selectedNote ?? 'C');
  const selected = useStore(st => st.note.selectedChord);
  const setChord = useStore(st => st.setSelectedChord);
  const state: BuilderState = { root: saved?.root ?? keyRoot, typeId: chordType(saved?.typeId ?? '') ? saved!.typeId! : 'major' };
  const type = chordType(state.typeId)!;
  // A chord from this picker (rather than an in-key chord) is showing.
  const showing = selected?.type === 'custom';

  const show = (next: BuilderState) => {
    const t = chordType(next.typeId)!;
    setChord({ note: next.root, type: 'custom', symbol: t.symbol, roman: '', intervals: t.intervals });
  };
  const apply = (patch: Partial<BuilderState>) => {
    const next = { ...state, ...patch };
    setSaved(next);
    show(next);
  };

  return {
    state, type, showing,
    setRoot: (root: string) => apply({ root }),
    /** Picking the type that's showing again clears it (like an in-key chord). */
    setType: (typeId: string, toggle = false) => (toggle && showing && typeId === state.typeId ? setChord(null) : apply({ typeId })),
    /** Show the last built chord (e.g. on switching to the Any chord tab). */
    showCurrent: () => show(state),
    clear: () => setChord(null),
  };
};
