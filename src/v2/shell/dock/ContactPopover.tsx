import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import s from './Dock.module.css';
import { Popover, Button } from '../../ui';

export const CONTACT_EMAIL = 'canderson1192@gmail.com';

/** The contact email with a Copy button (works without a mail app — a
 *  mailto link does nothing when none is set up) and an optional mail link.
 *  Used by the dock's Contact pop-up and the About modal. */
export const ContactEmail: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(CONTACT_EMAIL).then(() => setCopied(true), () => {});
  };
  return (
    <>
      <div className={s.contactRow}>
        <span className={s.contactEmail}>{CONTACT_EMAIL}</span>
        <Button size="sm" variant={copied ? 'secondary' : 'primary'} aria-label={copied ? 'Copied' : 'Copy email'} onClick={copy}>
          {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <a className={s.contactMail} href={`mailto:${CONTACT_EMAIL}`}>Open in mail app</a>
    </>
  );
};

export const ContactPopover: React.FC<{ open: boolean; onClose(): void; anchorRef: React.RefObject<HTMLElement | null> }> = (p) => (
  <Popover {...p} width={340} title="Contact">
    <p className={s.contactNote}>Questions, ideas or bugs? Email me:</p>
    {/* Remounts each time it opens, so "Copied" resets. */}
    {p.open && <ContactEmail />}
  </Popover>
);
