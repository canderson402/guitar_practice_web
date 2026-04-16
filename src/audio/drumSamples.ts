// ---------------------------------------------------------------------------
// Drum sampler — loads a real sampled drum kit via smplr's DrumMachine and
// exposes the same playKick/playSnare/playHat API shape as the synth fallback
// in drums.ts. The `play*Sample` functions return `true` when they scheduled a
// real sample, `false` when the kit isn't loaded yet — the synth path in
// drums.ts uses that to decide whether to fall back.
//
// The kit is loaded once on first preload call and cached for the session.
// The destination (part channel) can be set *before* preload and is baked
// into the DrumMachine at construction time (smplr doesn't support
// changing destination after load).
// ---------------------------------------------------------------------------

import { DrumMachine } from 'smplr';
import { getAudioContext, getMasterGain } from './engine';

// Default kit — LinnDrum LM-2 is a sampled acoustic drum machine (not a pure
// synth like TR-808). Other options shipped by smplr: TR-808, Casio-RZ1,
// MFB-512, Roland CR-8000.
const DEFAULT_KIT = 'LM-2';

let kit: DrumMachine | null = null;
let kitReady = false;
let pendingDestination: AudioNode | null = null;

/**
 * Set the destination node used when the drum kit is constructed. Must be
 * called before `preloadDrumKit()` for the override to apply. If the kit is
 * already constructed, this is a no-op with a console warning.
 */
export const setDrumKitDestination = (node: AudioNode | null): void => {
  if (kit) {
    // smplr doesn't expose a way to rewire a loaded DrumMachine's output,
    // so once the kit exists the destination is locked in. This is a
    // lifecycle bug for the caller, not something to silently ignore.
    if (node !== pendingDestination) {
      console.warn('setDrumKitDestination called after kit construction; ignored.');
    }
    return;
  }
  pendingDestination = node;
};

/**
 * Start loading the drum kit. Idempotent — calling multiple times is a no-op.
 * Returns a Promise so callers can `await` readiness if they want to.
 */
export const preloadDrumKit = async (): Promise<void> => {
  if (kit) return;
  const ctx = getAudioContext();
  kit = new DrumMachine(ctx, {
    instrument: DEFAULT_KIT,
    destination: pendingDestination ?? getMasterGain(),
    volume: 127,
  });
  await kit.load;
  kitReady = true;
};

/** True once samples are fully loaded. */
export const isDrumKitReady = (): boolean => kitReady;

/**
 * Map our drum instrument names to smplr DrumMachine group names. smplr
 * accepts group names (e.g. 'kick') and picks a velocity-appropriate
 * variation automatically. LM-2 / TR-808 naming conventions differ slightly;
 * we try aliases in order.
 */
const SAMPLE_ALIASES: Record<string, string[]> = {
  kick:    ['kick', 'bd', 'bass'],
  snare:   ['snare', 'sd'],
  hihat:   ['hihat-close', 'hihat', 'hh', 'hat', 'closed-hihat'],
  openhat: ['hihat-open', 'openhat', 'open-hihat', 'ohh'],
};

const pickSampleName = (logical: string): string | null => {
  if (!kit) return null;
  const groups = new Set(kit.getGroupNames());
  const samples = kit.getSampleNames();
  const aliases = SAMPLE_ALIASES[logical] ?? [logical];
  for (const name of aliases) {
    if (groups.has(name)) return name;
  }
  for (const name of aliases) {
    const match = samples.find(s => s.startsWith(name + '/') || s === name);
    if (match) return match;
  }
  return null;
};

const triggerSample = (logical: string, startTime: number, gain: number): boolean => {
  if (!kit || !kitReady) return false;
  const sampleName = pickSampleName(logical);
  if (!sampleName) return false;
  // sqrt lift: pattern gains around 0.3–0.7 would map linearly to velocity
  // 38–89, which smplr then attenuates further. sqrt pulls moderate hits up
  // (0.5 → ~90); floor of 60 prevents whisper-quiet ghosting.
  const lifted = Math.sqrt(Math.max(0, Math.min(1, gain)));
  const velocity = gain <= 0 ? 0 : Math.max(60, Math.min(127, Math.round(lifted * 127)));
  kit.start({ note: sampleName, time: startTime, velocity });
  return true;
};

export const playKickSample    = (t: number, g: number): boolean => triggerSample('kick',    t, g);
export const playSnareSample   = (t: number, g: number): boolean => triggerSample('snare',   t, g);
export const playClosedHatSample = (t: number, g: number): boolean => triggerSample('hihat',   t, g);
export const playOpenHatSample = (t: number, g: number): boolean => triggerSample('openhat', t, g);
