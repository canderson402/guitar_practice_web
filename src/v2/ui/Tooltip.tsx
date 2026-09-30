import React, { useId, useState } from 'react';
import s from './Tooltip.module.css';

export const Tooltip: React.FC<{ text: string; children: React.ReactElement<any> }> = ({ text, children }) => {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <span className={s.wrap} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)} onBlur={() => setShow(false)}>
      {React.cloneElement(children, { 'aria-describedby': id })}
      {show && <span role="tooltip" id={id} className={s.tip}>{text}</span>}
    </span>
  );
};
