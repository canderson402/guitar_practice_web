import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import s from './ConceptsMenu.module.css';
import { getConcept } from './concepts';
import { useEscape } from '../ui/useEscape';

const titleCase = (label: string) => label.charAt(0).toUpperCase() + label.slice(1);

/** One circled "?" per card (or pop-up). Opens the list of concepts it uses;
 *  each opens its Learn article section. Renders inline (not portalled) so
 *  it works inside pop-ups without closing them. */
export const ConceptsMenu: React.FC<{ title: string; concepts: string[] }> = ({ title, concepts }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const items = concepts.map(id => ({ id, c: getConcept(id) })).filter(x => x.c);

  useEscape(open, () => { setOpen(false); ref.current?.querySelector<HTMLElement>('button')?.focus(); });
  useEffect(() => {
    if (!open) return;
    ref.current?.querySelector<HTMLElement>('a')?.focus();
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  if (items.length === 0) return null;
  const label = `Concepts in ${title}`;
  return (
    <span ref={ref} className={s.wrap} onPointerDown={e => e.stopPropagation()}>
      <button type="button" className={s.q} aria-label={label} aria-haspopup="dialog" aria-expanded={open}
        onClick={() => setOpen(o => !o)}>?</button>
      {open && (
        <div role="dialog" aria-label={label} className={s.panel}>
          <span className={s.head}>Learn</span>
          {items.map(({ id, c }) => (
            <Link key={id} to={`/v2/learn/${c!.slug}${c!.section ? `#${c!.section}` : ''}`} className={s.item}
              onClick={() => setOpen(false)}>
              {titleCase(c!.label)}
            </Link>
          ))}
        </div>
      )}
    </span>
  );
};
