import React, { useEffect } from 'react';
import s from './Toast.module.css';

interface Props { message: string; actionLabel?: string; onAction?(): void; onDismiss(): void; timeoutMs?: number }

export const Toast: React.FC<Props> = ({ message, actionLabel, onAction, onDismiss, timeoutMs = 6000 }) => {
  useEffect(() => {
    const id = setTimeout(onDismiss, timeoutMs);
    return () => clearTimeout(id);
  }, [message, onDismiss, timeoutMs]);
  return (
    <div role="status" className={s.toast}>
      <span>{message}</span>
      {actionLabel && onAction && <button type="button" className={s.action} onClick={onAction}>{actionLabel}</button>}
    </div>
  );
};
