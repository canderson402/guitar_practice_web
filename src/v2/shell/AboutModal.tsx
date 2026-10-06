import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import s from './AboutModal.module.css';
import { useV2Store } from '../state/useV2Store';
import { IconButton } from '../ui';
import { useFocusTrap } from '../ui/useFocusTrap';
import { useEscape } from '../ui/useEscape';
import { AboutContent } from './AboutContent';
import { ContactEmail } from './dock/ContactPopover';

// How long the closing animation runs before the modal is removed.
const CLOSE_MS = 180;
// The notes that float up behind the panel as it opens (decoration).
const NOTES = [
  { glyph: '♪', left: '8%', delay: 0 }, { glyph: '♫', left: '22%', delay: 90 },
  { glyph: '♩', left: '41%', delay: 40 }, { glyph: '♬', left: '60%', delay: 140 },
  { glyph: '♪', left: '77%', delay: 60 }, { glyph: '♫', left: '91%', delay: 120 },
];

/** A little fun: the About panel springs up like a plucked string while a
 *  few notes float away; it shrinks and fades out when closed. Reduced
 *  motion: a plain fade. */
export const AboutModal: React.FC = () => {
  const open = useV2Store(st => st.overlay?.kind === 'about');
  const setOverlay = useV2Store(st => st.setOverlay);
  const [closing, setClosing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  useEffect(() => { if (open) setClosing(false); }, [open]);
  const close = () => {
    if (closing) return;
    setClosing(true);
    timer.current = window.setTimeout(() => { setClosing(false); setOverlay(null); }, CLOSE_MS);
  };
  useFocusTrap(ref, open);
  useEscape(open, close);
  if (!open) return null;
  const root = document.querySelector('.gp2') ?? document.body;
  return createPortal(
    <div className={s.scrim} data-state={closing ? 'closing' : 'open'}
      onPointerDown={e => { if (e.target === e.currentTarget) close(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label="About" className={s.stage} data-state={closing ? 'closing' : 'open'}>
        {/* Behind the panel: they rise out of its top edge and float away. */}
        {NOTES.map((n, i) => (
          <span key={i} data-testid="about-note" aria-hidden="true" className={s.note}
            style={{ left: n.left, animationDelay: `${n.delay}ms` }}>{n.glyph}</span>
        ))}
        <div className={s.panel}>
        <IconButton className={s.close} label="Close" icon={<X size={16} />} onClick={close} />
        <div className={s.body}>
          <AboutContent />
          <section className={s.contact}>
            <p>Questions, ideas or bugs? Email me:</p>
            <ContactEmail />
          </section>
        </div>
        </div>
      </div>
    </div>,
    root,
  );
};
