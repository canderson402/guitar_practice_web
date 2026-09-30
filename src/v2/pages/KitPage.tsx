import React, { useRef, useState } from 'react';
import { Settings, Play } from 'lucide-react';
import s from './KitPage.module.css';
import {
  Button, IconButton, Chip, SegmentedControl, Switch, Stepper, Slider, Picker, Tabs,
  Popover, SideSheet, Dialog, Toast, Tooltip,
} from '../ui';
import { useV2Store } from '../state/useV2Store';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className={s.section}><h2 className={s.h}>{title}</h2><div className={s.row}>{children}</div></section>
);

export const KitPage: React.FC = () => {
  const themeMode = useV2Store(st => st.themeMode);
  const setThemeMode = useV2Store(st => st.setThemeMode);
  const [seg, setSeg] = useState<'3' | '4' | '6'>('4');
  const [on, setOn] = useState(true);
  const [bpm, setBpm] = useState(96);
  const [vol, setVol] = useState(80);
  const [key, setKey] = useState('A');
  const [tab, setTab] = useState('warm-up');
  const [pop, setPop] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [toast, setToast] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);

  return (
    <main className={s.page}>
      <div className={s.top}>
        <h1>Component kit</h1>
        <SegmentedControl label="Theme" value={themeMode} onChange={setThemeMode}
          options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'system', label: 'System' }]} />
      </div>
      <Section title="Buttons">
        <Button variant="primary">Primary</Button><Button>Secondary</Button>
        <Button variant="ghost">Ghost</Button><Button variant="danger">Delete</Button>
        <Button size="sm">Small</Button><Button disabled>Disabled</Button>
      </Section>
      <Section title="Icon buttons">
        <IconButton label="Settings" icon={<Settings size={16} />} />
        <IconButton label="Settings (active)" active icon={<Settings size={16} />} />
        <Tooltip text="Play"><IconButton label="Play" icon={<Play size={16} />} /></Tooltip>
      </Section>
      <Section title="Chips"><Chip>Streak 4</Chip><Chip onClick={() => {}}>A minor</Chip><Chip onClick={() => {}} active>96 BPM</Chip></Section>
      <Section title="Segmented control">
        <SegmentedControl<"3" | "4" | "6"> label="Time" value={seg} onChange={setSeg}
          options={[{ value: '3', label: '3/4' }, { value: '4', label: '4/4' }, { value: '6', label: '6/8' }]} />
      </Section>
      <Section title="Switch"><Switch label="Accent first beat" checked={on} onChange={setOn} /></Section>
      <Section title="Stepper"><Stepper label="Tempo" value={bpm} min={40} max={300} small={1} big={5} onChange={setBpm} /></Section>
      <Section title="Slider"><div style={{ width: 240 }}><Slider label="Volume" value={vol} min={0} max={100} onChange={setVol} showValue format={v => `${v}%`} /></div></Section>
      <Section title="Picker">
        <div style={{ width: 260 }}>
          <Picker label="Key" value={key} onChange={setKey}
            options={['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'].map(k => ({ value: k, label: k }))} />
        </div>
      </Section>
      <Section title="Tabs">
        <Tabs label="Workspaces" activeId={tab} onSelect={setTab}
          items={[{ id: 'warm-up', label: 'Warm-up' }, { id: 'theory', label: 'Theory' }, { id: 'jam', label: 'Jam' }]} />
      </Section>
      <Section title="Overlays">
        <Button ref={anchor} onClick={() => setPop(p => !p)}>Popover</Button>
        <Button onClick={() => setSheet(true)}>Side sheet</Button>
        <Button onClick={() => setDialog(true)}>Dialog</Button>
        <Button onClick={() => setToast(true)}>Toast</Button>
      </Section>
      <Popover open={pop} onClose={() => setPop(false)} anchorRef={anchor} title="Tempo" placement="bottom">
        <Stepper label="Tempo" value={bpm} min={40} max={300} small={1} big={5} onChange={setBpm} />
      </Popover>
      <SideSheet open={sheet} onClose={() => setSheet(false)} title="Metronome">
        <SegmentedControl<"3" | "4" | "6"> label="Time" value={seg} onChange={setSeg} options={[{ value: '3', label: '3/4' }, { value: '4', label: '4/4' }, { value: '6', label: '6/8' }]} />
        <Slider label="Click volume" value={vol} min={0} max={100} onChange={setVol} />
      </SideSheet>
      <Dialog open={dialog} onClose={() => setDialog(false)} title="Add card"><p>Dialog content</p></Dialog>
      {toast && <Toast message="Card removed" actionLabel="Undo" onAction={() => setToast(false)} onDismiss={() => setToast(false)} />}
    </main>
  );
};
