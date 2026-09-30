import React, { useId, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import s from './Disclosure.module.css';

interface Props {
  title: string;
  /** Short state shown on the header while collapsed (e.g. "Every 4 bars"). */
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/** A contained, collapsible group of related settings. Collapsed by default. */
export const Disclosure: React.FC<Props> = ({ title, summary, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className={[s.box, open ? s.open : ''].join(' ')}>
      <button type="button" className={s.header} aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}>
        <ChevronRight size={14} className={s.chev} aria-hidden="true" />
        <span className={s.title}>{title}</span>
        {!open && summary && <span className={s.summary}>{summary}</span>}
      </button>
      {open && <div id={id} className={s.body}>{children}</div>}
    </section>
  );
};
