// ---------------------------------------------------------------------------
// Drum grooves for the Jam card — rules, not fixed 4/4 bars, so they follow
// whatever time signature the transport is in:
//
//   simple meters (x/4)     beats alternate strong/back: kick on the strong
//                           beats (1, 3, 5…), snare on the backbeats (2, 4…)
//   compound (6/8, 9/8,     beats are eighths felt in groups of three: kick
//   12/8)                   on the 1st group, snare on the 2nd, and so on,
//                           with a hat on every eighth
//
// Chord changes are marked simply: the bar before a change lifts with an open
// hat on its last "and", and the new chord lands on a crash. Bars vary a
// little — an extra kick, a ghost note, an open hat — around a backbone that
// never moves. Choices are random but seeded per bar, so every beat of a bar
// agrees.
//
// Hits are offsets into a beat (0 = on the beat, 0.5 = the "and", 2/3 = a
// swung "and"). Gains are velocities: the kit picks a soft or hard recording
// from them — hats lean on the beat and lighten on the "and", beat 1 is
// strongest, backbeats are hit hard, ghost notes barely touched.
// ---------------------------------------------------------------------------

export type DrumVoice = 'kick' | 'snare' | 'hatClosed' | 'hatOpen' | 'ride' | 'crash';

export interface GrooveHit {
  voice: DrumVoice;
  /** Offset into the beat, 0 ≤ at < 1. */
  at: number;
  /** Velocity, 0–1. */
  gain: number;
}

export interface BarHit extends GrooveHit {
  /** Beat within the bar, 0-based. */
  beat: number;
}

export interface GrooveCtx {
  beatsPerBar: number;
  /** Bars since the music started (0 = first bar after the count-in). */
  barIndex: number;
  /** Felt in groups of three eighths (6/8, 9/8, 12/8). */
  compound: boolean;
  /** Where the chord changes fall (crash on each new chord). */
  barsPerChord: number;
  /** Per-run seed for the variations. */
  seed: number;
  /** 0 = the plain groove every bar, 1 = full variation. Default 1. */
  variety?: number;
}

export const GROOVES = [
  { id: 'kick', name: 'Kick only' },
  { id: 'rock', name: 'Rock' },
  { id: 'four', name: 'Four on the floor' },
  { id: 'halftime', name: 'Half-time' },
  { id: 'shuffle', name: 'Shuffle' },
  { id: 'ballad', name: 'Ballad (ride)' },
] as const;

export type GrooveId = typeof GROOVES[number]['id'];

/** 6/8, 9/8, 12/8 — eighth-note beats felt in threes. */
export const isCompound = (beatsPerBar: number, beatUnit: number): boolean =>
  beatUnit === 8 && beatsPerBar % 3 === 0 && beatsPerBar > 3;

const SWING = 2 / 3;
// Hat velocities: beat 1, other beats, the "and".
const HAT_ONE = 0.8, HAT_BEAT = 0.7, HAT_AND = 0.55;
const BACKBEAT = 0.92;
const GHOST = 0.12;

const hit = (voice: DrumVoice, at: number, gain: number): GrooveHit => ({ voice, at, gain });
const swung = (id: string) => id === 'shuffle' || id === 'ballad';

// ---- The backbone: one beat of the plain groove ----

const simpleBeat = (id: string, b: number, n: number): GrooveHit[] => {
  const strong = b % 2 === 0;
  const down = b === 0;
  switch (id) {
    case 'rock': return [
      ...(strong ? [hit('kick', 0, down ? 1 : 0.9)] : [hit('snare', 0, BACKBEAT)]),
      hit('hatClosed', 0, down ? HAT_ONE : HAT_BEAT),
      hit('hatClosed', 0.5, HAT_AND),
    ];
    case 'four': return [
      hit('kick', 0, down ? 1 : 0.9),
      ...(strong ? [] : [hit('snare', 0, BACKBEAT)]),
      hit('hatClosed', 0, down ? HAT_BEAT : HAT_AND),
      hit('hatOpen', 0.5, 0.5),
    ];
    case 'halftime': {
      const snare = b === Math.floor(n / 2);
      return [
        ...(down ? [hit('kick', 0, 1)] : []),
        ...(snare ? [hit('snare', 0, 0.95)] : []),
        ...(b === n - 1 && !snare ? [hit('kick', 0.5, 0.7)] : []),
        hit('hatClosed', 0, down ? HAT_ONE : HAT_BEAT - 0.04),
        hit('hatClosed', 0.5, HAT_AND - 0.04),
      ];
    }
    case 'shuffle': return [
      ...(strong ? [hit('kick', 0, down ? 1 : 0.85)] : [hit('snare', 0, BACKBEAT)]),
      hit('hatClosed', 0, down ? HAT_ONE : HAT_BEAT),
      hit('hatClosed', SWING, HAT_AND - 0.05),
    ];
    case 'ballad': return [
      ...(strong ? [hit('kick', 0, down ? 0.65 : 0.45)] : [hit('snare', 0, 0.3), hit('hatClosed', 0, 0.3)]),
      hit('ride', 0, down ? 0.62 : 0.55),
      ...(strong ? [] : [hit('ride', SWING, 0.42)]),
    ];
    default: return [];
  }
};

const compoundBeat = (id: string, b: number, n: number): GrooveHit[] => {
  const group = Math.floor(b / 3);
  const groupStart = b % 3 === 0;
  const evenGroup = group % 2 === 0;
  const cymbal: DrumVoice = swung(id) ? 'ride' : 'hatClosed';
  const out: GrooveHit[] = [];
  if (groupStart) {
    if (id === 'four') {
      out.push(hit('kick', 0, b === 0 ? 1 : 0.9));
      if (!evenGroup) out.push(hit('snare', 0, 0.85));
    } else if (id === 'halftime') {
      if (b === 0) out.push(hit('kick', 0, 1));
      if (group === Math.max(1, Math.floor(n / 3 / 2))) out.push(hit('snare', 0, 0.95));
    } else if (evenGroup) {
      out.push(hit('kick', 0, b === 0 ? 1 : 0.85));
    } else {
      out.push(hit('snare', 0, id === 'ballad' ? 0.3 : BACKBEAT));
    }
  }
  out.push(hit(cymbal, 0, b === 0 ? HAT_ONE : groupStart ? HAT_BEAT : HAT_AND));
  return out;
};

// ---- Seeded randomness per bar ----

const rngFor = (seed: number, bar: number) => {
  let a = (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(bar + 1, 0x85ebca6b)) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ---- Variation: small changes around the backbone ----

const vary = (id: string, hits: BarHit[], ctx: GrooveCtx, rand: () => number): BarHit[] => {
  const v = ctx.variety ?? 1;
  const n = ctx.beatsPerBar;
  const and = swung(id) ? SWING : 0.5;
  const pickBeat = (ok: (b: number) => boolean) => {
    const beats = Array.from({ length: n }, (_, b) => b).filter(ok);
    return beats.length ? beats[Math.floor(rand() * beats.length)] : null;
  };
  const out = [...hits];
  if (ctx.compound) {
    // A pickup kick into the next group, or a ghost snare on a weak eighth.
    if (rand() < 0.3 * v) { const b = pickBeat(x => x % 6 === 2 && x < n - 1); if (b !== null) out.push({ beat: b, ...hit('kick', 0, 0.6) }); }
    if (rand() < 0.3 * v) { const b = pickBeat(x => x % 3 !== 0); if (b !== null) out.push({ beat: b, ...hit('snare', 0.5, GHOST) }); }
    return out;
  }
  if (id === 'ballad') {
    if (rand() < 0.3 * v) { const b = pickBeat(x => x % 2 === 1); if (b !== null) out.push({ beat: b, ...hit('kick', SWING, 0.4) }); }
    if (rand() < 0.3 * v) { const b = pickBeat(x => x % 2 === 0); if (b !== null) out.push({ beat: b, ...hit('ride', SWING, 0.38) }); }
    return out;
  }
  // An extra kick on an "and" leading into a strong beat.
  if (id !== 'four' && rand() < 0.4 * v) {
    const b = pickBeat(x => x % 2 === 1 && x < n - 1);
    if (b !== null) out.push({ beat: b, ...hit('kick', and, 0.75) });
  }
  // A ghost note on the snare just before a backbeat.
  if (rand() < 0.45 * v) {
    const b = pickBeat(x => x % 2 === 0 && x < n - 1);
    if (b !== null) out.push({ beat: b, ...hit('snare', swung(id) ? SWING : 0.75, GHOST) });
  }
  // An open hat on one "and" (the next hat chokes it).
  if ((id === 'rock' || id === 'halftime' || id === 'shuffle') && rand() < 0.25 * v) {
    const b = pickBeat(x => x > 0);
    if (b !== null) {
      const i = out.findIndex(h => h.beat === b && h.voice === 'hatClosed' && h.at === and);
      if (i >= 0) out[i] = { ...out[i], voice: 'hatOpen', gain: 0.6 };
    }
  }
  return out;
};

/** Every hit in one bar of a groove. */
export const grooveBar = (id: string, ctx: GrooveCtx): BarHit[] => {
  if (!GROOVES.some(g => g.id === id)) return [];
  const n = ctx.beatsPerBar;
  if (id === 'kick') {
    const beats = Array.from({ length: n }, (_, b) => b).filter(b => !ctx.compound || b % 3 === 0);
    return beats.map(beat => ({ beat, ...hit('kick', 0, beat === 0 ? 1 : 0.9) }));
  }
  const rand = rngFor(ctx.seed, ctx.barIndex);
  const beat = ctx.compound ? compoundBeat : simpleBeat;
  let hits: BarHit[] = Array.from({ length: n }, (_, b) => beat(id, b, n).map(h => ({ beat: b, ...h }))).flat();

  hits = vary(id, hits, ctx, rand);
  const bars = Math.max(1, ctx.barsPerChord);
  // The bar before a chord change lifts with an open hat on its last "and"
  // (on the last eighth in compound time).
  if ((ctx.barIndex + 1) % bars === 0 && id !== 'ballad' && id !== 'four') {
    const at = ctx.compound ? 0 : swung(id) ? SWING : 0.5;
    const i = hits.findIndex(h => h.beat === n - 1 && h.voice === 'hatClosed' && Math.abs(h.at - at) < 1e-9);
    if (i >= 0) hits[i] = { ...hits[i], voice: 'hatOpen', gain: 0.6 };
  }
  // Each new chord lands on a crash, in place of the cymbal on beat 1.
  if (ctx.barIndex % bars === 0) {
    hits = hits.filter(h => !(h.beat === 0 && h.at === 0 && ['hatClosed', 'hatOpen', 'ride'].includes(h.voice)));
    hits.push({ beat: 0, ...hit('crash', 0, id === 'ballad' ? 0.55 : 0.85) });
  }
  return hits;
};

/** What plays during one beat of a groove. */
export const grooveHits = (id: string, ctx: GrooveCtx & { beatInBar: number }): GrooveHit[] =>
  grooveBar(id, ctx).filter(h => h.beat === ctx.beatInBar).map(({ beat, ...h }) => h);
