import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import s from './Circle.module.css';
import { useStore } from '../../../store/useStore';
import { getScaleChords, scales } from '../../../data/musicData';
import { CIRCLE_KEYS, scaleShortName } from '../../shell/KeyPicker';
import { chromaticPosition } from '../../music/intervals';
import { useCardPref } from '../../state/useCardPref';

// Relative minor of each major key, in circle order.
const RELATIVE_MINORS = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'Bbm', 'Fm', 'Cm', 'Gm', 'Dm'];

type Ring = 'chords' | 'relatives';

// Ring radii as a percent of the circle's width. Keys and numerals sit in the
// exact middle of their bands.
const OUTER_R = 50;
const DIVIDER_R = 32.5;
const INNER_R = 18;
const KEY_R = (OUTER_R + DIVIDER_R) / 2;
const NUMERAL_R = (DIVIDER_R + INNER_R) / 2;
const ringInset = (r: number) => ({ inset: `${OUTER_R - r}%` });

/** Polar position (percent of the box) for slot i of 12, starting at 12 o'clock. */
const at = (i: number, radius: number) => {
  const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
  return { left: `${50 + radius * Math.cos(a)}%`, top: `${50 + radius * Math.sin(a)}%` };
};

/** The circle of fifths for the shared key and scale: the key's chords are
 *  highlighted with their Roman numerals (or the ring shows relative keys). */
// The middle of the circle is narrow: the scale name's text shrinks so its
// longest word (it wraps between words) always fits.
const longestWord = (name: string) => Math.max(1, ...name.split(/\s+/).map(w => w.length));

export const CircleFace: React.FC = () => {
  const n = useStore(useShallow(st => ({ root: st.note.selectedNote, scale: st.note.selectedScale, setNote: st.setSelectedNote })));
  const [ring] = useCardPref<Ring>('circle-of-fifths', 'ring', 'chords');
  const valid = n.root && n.scale && scales[n.scale as keyof typeof scales] && n.scale !== 'Chromatic';
  const chords = valid ? getScaleChords(n.root!, n.scale as keyof typeof scales) : [];
  const chordAt = (key: string) => chords.find(c => chromaticPosition(c.note) === chromaticPosition(key));
  const isCurrent = (key: string) => !!n.root && chromaticPosition(key) === chromaticPosition(n.root);

  const qualities = ['major', 'minor', 'diminished', 'augmented'].filter(q => q !== 'augmented' || chords.some(c => c.type === q));

  return (
    <div className={s.face}>
      <div className={s.circleWrap}>
        <div className={s.circle}>
          <span className={s.outer} aria-hidden="true" />
          {/* Separates the keys from the inner ring's numerals. */}
          <span className={s.divider} style={ringInset(DIVIDER_R)} aria-hidden="true" />
          <span className={s.inner} style={ringInset(INNER_R)} aria-hidden="true" />
          {CIRCLE_KEYS.map((key, i) => {
            const chord = ring === 'chords' ? chordAt(key) : undefined;
            const quality = chord?.type ?? '';
            return (
              <React.Fragment key={key}>
                <button type="button" style={at(i, KEY_R)} onClick={() => n.setNote(key)}
                  aria-label={chord ? `${key}, ${chord.roman}` : key}
                  className={[s.key,
                    // The current key is just highlighted: its chord color (e.g.
                    // diminished grey) would be unreadable on the accent.
                    isCurrent(key) ? s.current : ring === 'chords' && !chord ? s.dim : s[quality] ?? '',
                  ].filter(Boolean).join(' ')}>
                  {key}
                </button>
                <span aria-hidden="true" style={at(i, NUMERAL_R)}
                  className={[s.ringLabel, s[quality] ?? '', ring === 'relatives' && isCurrent(key) ? s.relCurrent : ''].join(' ')}>
                  {ring === 'chords' ? chord?.roman ?? '' : RELATIVE_MINORS[i]}
                </span>
              </React.Fragment>
            );
          })}
          <div className={s.center}>
            <span className={s.centerKey}>{n.root ?? '—'}</span>
            <span data-testid="circle-scale" className={[s.centerScale, longestWord(scaleShortName(n.scale)) > 7 ? s.long : ''].join(' ')}
              style={{ ['--chars' as string]: String(longestWord(scaleShortName(n.scale))) }}>
              {scaleShortName(n.scale)}
            </span>
          </div>
        </div>
      </div>
      {ring === 'chords' && chords.length > 0 && (
        <ul aria-label="Chord qualities" className={s.legend}>
          {qualities.map(q => (
            <li key={q} className={s[q]}><span className={s.swatch} aria-hidden="true" />{q[0].toUpperCase() + q.slice(1)}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
