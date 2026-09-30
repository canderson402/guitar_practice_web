import React from 'react';
import { Toast } from '../ui';
import { useV2Store } from '../state/useV2Store';

export const ToastHost: React.FC = () => {
  const toast = useV2Store(st => st.toast);
  const undo = useV2Store(st => st.undoLast);
  const dismissToast = useV2Store(st => st.dismissToast);
  if (!toast) return null;
  return (
    <Toast key={toast.id} message={toast.message} actionLabel={toast.undoable ? 'Undo' : undefined}
      onAction={toast.undoable ? undo : undefined} onDismiss={dismissToast} />
  );
};
