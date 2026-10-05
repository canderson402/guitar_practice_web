// ---------------------------------------------------------------------------
// Reference pitch — the frequency of A4 everything is tuned to (440 Hz by
// default). Synths turn notes into frequencies with `midiToFreq`; sampled
// instruments (recorded at 440) are retuned by `referenceCents()`.
// ---------------------------------------------------------------------------

let referenceHz = 440;

export const setReferencePitch = (hz: number): void => { referenceHz = hz; };
export const getReferencePitch = (): number => referenceHz;

/** MIDI note → frequency at the current reference pitch (A4 = MIDI 69). */
export const midiToFreq = (midi: number): number => referenceHz * Math.pow(2, (midi - 69) / 12);

/** How far the reference is from 440, in cents — to retune samples. */
export const referenceCents = (): number => 1200 * Math.log2(referenceHz / 440);
