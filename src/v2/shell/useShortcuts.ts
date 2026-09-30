import { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { useV2Store } from '../state/useV2Store';
import { clampBpm } from './dock/tapTempo';

const isTyping = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
};

/** Keyboard drag handles (dnd-kit card headers) and other button-like
 *  elements own Space/arrows while focused — e.g. Space picks a card up and
 *  arrows move it; those keys must not also drive the transport. */
const ownsKeys = (el: EventTarget | null): boolean =>
  el instanceof HTMLElement && !!el.closest('[aria-roledescription="sortable"], [role="button"]');

/** Global v2 shortcuts. Space: play/stop · ↑/↓: BPM ±1 (Shift ±5) · K: key pop-up. */
export const useShortcuts = (): void => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') && ownsKeys(e.target)) return;
      const st = useStore.getState();
      if (e.key === ' ') {
        if (e.repeat) { e.preventDefault(); return; }   // holding Space must not re-toggle
        // Let focused buttons handle Space themselves.
        if (e.target instanceof HTMLButtonElement) return;
        e.preventDefault();
        st.setMetronomePlaying(!st.metronome.isPlaying);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const step = (e.shiftKey ? 5 : 1) * (e.key === 'ArrowUp' ? 1 : -1);
        st.setBpm(clampBpm(st.metronome.bpm + step));
      } else if (e.key === 'k' || e.key === 'K') {
        if (e.repeat) return;
        useV2Store.getState().setPopover('key');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
};
