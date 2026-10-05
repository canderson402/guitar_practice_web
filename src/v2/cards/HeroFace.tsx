import React from 'react';
import s from './HeroFace.module.css';

interface Props {
  /** Small line above the value (beat dots, key, timer mode). */
  top?: React.ReactNode;
  /** The big value (BPM, current note, time). */
  hero: React.ReactNode;
  /** What the value means (BPM, "1 · root", elapsed). */
  caption?: React.ReactNode;
  /** The card's controls. */
  controls?: React.ReactNode;
  /** Tighter spacing above and between the controls, for cards with more to fit. */
  dense?: boolean;
}

/** Shared face layout for small cards. Fixed row heights, aligned from the
 *  top, so every small card's value, caption and controls line up across a
 *  row regardless of content. */
export const HeroFace: React.FC<Props> = ({ top, hero, caption, controls, dense }) => (
  <div data-testid="hero-face" className={[s.face, dense ? s.dense : ''].join(' ')}>
    <div data-slot="top" className={s.top}>{top}</div>
    <div data-slot="hero" className={s.hero}><span data-testid="hero-value" className={s.value}>{hero}</span></div>
    <div data-slot="caption" className={s.caption}>{caption}</div>
    <div data-slot="controls" className={s.controls}>{controls}</div>
  </div>
);
