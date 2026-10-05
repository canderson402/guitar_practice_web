import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { SideSheet, SegmentedControl, Slider } from '../ui';
import { useV2Store, ThemeMode } from '../state/useV2Store';
import { useStore } from '../../store/useStore';
import { TuningEditor } from './TuningEditor';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <span style={{ fontSize: 'var(--text-12)', color: 'var(--text-muted)' }}>{label}</span>{children}
  </div>
);

export const SettingsSheet: React.FC = () => {
  const open = useV2Store(st => st.overlay?.kind === 'settings');
  const setOverlay = useV2Store(st => st.setOverlay);
  const themeMode = useV2Store(st => st.themeMode);
  const setThemeMode = useV2Store(st => st.setThemeMode);
  const { master, setJamMixerVolume, noteVolumes, setNoteVolume } = useStore(useShallow(st => ({
    master: st.jam.mixer.master.volume, setJamMixerVolume: st.setJamMixerVolume,
    noteVolumes: st.noteVolumes, setNoteVolume: st.setNoteVolume,
  })));
  return (
    <SideSheet open={open} onClose={() => setOverlay(null)} title="App settings">
      <Field label="Theme">
        <SegmentedControl<ThemeMode> label="Theme" value={themeMode} onChange={setThemeMode}
          options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'system', label: 'System' }]} />
      </Field>
      <TuningEditor testTone />
      <Field label="Master volume">
        <Slider label="Master volume" value={Math.min(master, 100)} min={0} max={100}
          onChange={v => setJamMixerVolume('master', v)} showValue format={v => `${v}%`} />
      </Field>
      {/* Notes you play on the fretboard / piano and the cards' Play buttons. 50% is as recorded. */}
      <Field label="Guitar notes">
        <Slider label="Guitar notes volume" value={noteVolumes.guitar} min={0} max={100}
          onChange={v => setNoteVolume('guitar', v)} showValue format={v => `${v}%`} />
      </Field>
      <Field label="Piano notes">
        <Slider label="Piano notes volume" value={noteVolumes.piano} min={0} max={100}
          onChange={v => setNoteVolume('piano', v)} showValue format={v => `${v}%`} />
      </Field>
    </SideSheet>
  );
};
