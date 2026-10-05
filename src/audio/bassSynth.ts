// ---------------------------------------------------------------------------
// Bass synth for the Jam card — a round, plucky electric-bass stand-in: a saw
// and a sine at the note's pitch through a lowpass that closes quickly after
// the pluck, with a short decay to a held level.
// ---------------------------------------------------------------------------

import { midiToFreq } from './pitch';

export interface BassSynth {
  /** Play `midi` at `time` for `dur` seconds, velocity 0–1. */
  play: (midi: number, time: number, dur: number, velocity: number) => void;
  /** Stop everything scheduled for later, fade anything sounding. */
  panic: () => void;
}


export const createBassSynth = (ctx: BaseAudioContext, destination: AudioNode): BassSynth => {
  const pending = new Map<OscillatorNode[], { start: number; gain: GainNode }>();
  return {
    play(midi, time, dur, velocity) {
      const freq = midiToFreq(midi);
      const saw = ctx.createOscillator();
      saw.type = 'sawtooth';
      saw.frequency.value = freq;
      const sine = ctx.createOscillator();
      sine.type = 'sine';
      sine.frequency.value = freq;
      const sawLevel = ctx.createGain();
      sawLevel.gain.value = 0.35;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 1.2;
      // Pluck: bright for a moment, then round.
      filter.frequency.setValueAtTime(1500, time);
      filter.frequency.setTargetAtTime(420, time, 0.07);
      const amp = ctx.createGain();
      const peak = 0.5 * velocity;
      amp.gain.setValueAtTime(0, time);
      amp.gain.linearRampToValueAtTime(peak, time + 0.006);
      amp.gain.setTargetAtTime(peak * 0.6, time + 0.01, 0.25);
      amp.gain.setTargetAtTime(0, time + dur, 0.03);
      saw.connect(sawLevel);
      sawLevel.connect(filter);
      sine.connect(filter);
      filter.connect(amp);
      amp.connect(destination);
      const oscs = [saw, sine];
      const end = time + dur + 0.2;
      oscs.forEach(o => { o.start(time); o.stop(end); });
      pending.set(oscs, { start: time, gain: amp });
      saw.onended = () => {
        pending.delete(oscs);
        [saw, sine, sawLevel, filter, amp].forEach(n => n.disconnect());
      };
    },
    panic() {
      const now = ctx.currentTime;
      pending.forEach(({ start, gain }, oscs) => {
        if (start > now) {
          oscs.forEach(o => { try { o.stop(); } catch { /* already stopped */ } });
          pending.delete(oscs);
        } else {
          gain.gain.cancelScheduledValues(now);
          gain.gain.setTargetAtTime(0, now, 0.02);
        }
      });
    },
  };
};
