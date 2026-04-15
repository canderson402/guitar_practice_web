import React from 'react';
import {
  Button,
  IconButton,
  ToggleButtonGroup,
  Select,
  Checkbox,
  Slider,
  Chip,
  Badge,
  Card,
} from './index';
import { Fretboard, DotInfo, posKey } from '../components/Fretboard';
import { PianoKeyboard } from '../components/PianoKeyboard';

// ---------------------------------------------------------------------------
// DesignSystemPreview — visual catalog of every primitive in every variant.
// Rendered when the URL hash is `#design` (see App.tsx). Not part of the
// normal app shell; exists so we can sanity-check components in one place
// without hunting through live screens.
// ---------------------------------------------------------------------------

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section style={{ marginBottom: 'var(--ds-space-8)' }}>
    <h2
      style={{
        fontSize: 'var(--ds-font-xl)',
        fontWeight: 'var(--ds-font-bold)' as any,
        color: 'var(--ds-color-neutral-900)',
        marginBottom: 'var(--ds-space-3)',
        paddingBottom: 'var(--ds-space-2)',
        borderBottom: '1px solid var(--ds-border-color)',
      }}
    >
      {title}
    </h2>
    {children}
  </section>
);

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--ds-space-4)',
      padding: 'var(--ds-space-2) 0',
      borderBottom: '1px dashed var(--ds-color-neutral-200)',
    }}
  >
    <div
      style={{
        width: 140,
        fontSize: 'var(--ds-font-xs)',
        color: 'var(--ds-color-neutral-500)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontWeight: 'var(--ds-font-semibold)' as any,
      }}
    >
      {label}
    </div>
    <div style={{ display: 'flex', gap: 'var(--ds-space-2)', flexWrap: 'wrap', flex: 1 }}>
      {children}
    </div>
  </div>
);

export const DesignSystemPreview: React.FC = () => {
  // Each section has its own state so flipping one toggle doesn't change
  // the unrelated previews elsewhere on the page.

  // ToggleButtonGroup (segmented-only nowadays) section
  const [tSegMode, setTSegMode] = React.useState<'base' | 'harmony' | 'both'>('both');

  // Chip section
  const [chipValue, setChipValue] = React.useState('3rd');

  // Select section
  const [selFlat, setSelFlat] = React.useState('d:2');
  const [selGroup, setSelGroup] = React.useState('c:4');
  const [selLabeled, setSelLabeled] = React.useState('d:4');

  // Checkbox section
  const [cbPlain, setCbPlain] = React.useState(true);
  const [cbInverted, setCbInverted] = React.useState(false);
  const [cbSwatchBlue, setCbSwatchBlue] = React.useState(true);
  const [cbSwatchGreen, setCbSwatchGreen] = React.useState(false);
  const [cbSwatchOrange, setCbSwatchOrange] = React.useState(true);

  // Slider section
  const [slPlain, setSlPlain] = React.useState(50);
  const [slFormatted, setSlFormatted] = React.useState(300);

  return (
    <div
      style={{
        maxWidth: 960,
        margin: '0 auto',
        padding: 'var(--ds-space-8)',
        background: 'var(--ds-color-white)',
        minHeight: '100vh',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <header style={{ marginBottom: 'var(--ds-space-8)' }}>
        <h1
          style={{
            fontSize: 'var(--ds-font-3xl)',
            fontWeight: 'var(--ds-font-bold)' as any,
            margin: 0,
            color: 'var(--ds-color-neutral-900)',
          }}
        >
          Design System
        </h1>
        <p style={{ color: 'var(--ds-color-neutral-500)', marginTop: 'var(--ds-space-2)' }}>
          Remove <code>#design</code> from the URL to return to the app.
        </p>
      </header>

      <Section title="Button">
        <Row label="Variants">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="warning">Warning</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
        </Row>
        <Row label="Sizes">
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="md">Medium</Button>
          <Button variant="primary" size="lg">Large</Button>
        </Row>
        <Row label="Disabled">
          <Button variant="primary" disabled>Primary</Button>
          <Button variant="outline" disabled>Outline</Button>
          <Button variant="warning" disabled>Warning</Button>
        </Row>
        <Row label="Pill">
          <Button variant="primary" pill>Pill Primary</Button>
          <Button variant="outline" pill>Pill Outline</Button>
        </Row>
      </Section>

      <Section title="IconButton">
        <Row label="Variants">
          <IconButton aria-label="Help" variant="outline">?</IconButton>
          <IconButton aria-label="Close" variant="ghost">✕</IconButton>
          <IconButton aria-label="Add" variant="primary">+</IconButton>
          <IconButton aria-label="Refresh" variant="secondary">↻</IconButton>
          <IconButton aria-label="Remove" variant="danger">−</IconButton>
        </Row>
        <Row label="Round">
          <IconButton aria-label="Help" round variant="outline">?</IconButton>
          <IconButton aria-label="Close" round variant="danger">✕</IconButton>
          <IconButton aria-label="Next" round variant="primary">▶</IconButton>
          <IconButton aria-label="Previous" round variant="primary">◀</IconButton>
        </Row>
      </Section>

      <Section title="ToggleButtonGroup (segmented exclusive choice)">
        <Row label="Segmented">
          <ToggleButtonGroup label="Mode" layout="segmented">
            <Button variant="ghost" active={tSegMode === 'base'} onClick={() => setTSegMode('base')}>Base</Button>
            <Button variant="ghost" active={tSegMode === 'harmony'} onClick={() => setTSegMode('harmony')}>Harmony</Button>
            <Button variant="ghost" active={tSegMode === 'both'} onClick={() => setTSegMode('both')}>Both</Button>
          </ToggleButtonGroup>
        </Row>
      </Section>

      <Section title="Chip">
        <Row label="Preset bar">
          {['3rd', '4th', '5th', '6th', '7th', 'Oct'].map(v => (
            <Chip key={v} active={chipValue === v} onClick={() => setChipValue(v)}>
              {v}
            </Chip>
          ))}
        </Row>
      </Section>

      <Section title="Select">
        <Row label="Flat options">
          <Select
            value={selFlat}
            onChange={e => setSelFlat(e.target.value)}
            options={[
              { value: 'd:2', label: '3rd' },
              { value: 'd:3', label: '4th' },
              { value: 'd:4', label: '5th' },
            ]}
          />
        </Row>
        <Row label="Grouped">
          <Select
            value={selGroup}
            onChange={e => setSelGroup(e.target.value)}
            groups={[
              {
                label: 'Diatonic',
                options: [
                  { value: 'd:2', label: '3rd' },
                  { value: 'd:3', label: '4th' },
                  { value: 'd:4', label: '5th' },
                ],
              },
              {
                label: 'Chromatic',
                options: [
                  { value: 'c:3', label: 'm3' },
                  { value: 'c:4', label: 'M3' },
                  { value: 'c:7', label: 'P5' },
                ],
              },
            ]}
          />
        </Row>
        <Row label="With label">
          <Select label="Interval" value={selLabeled} onChange={e => setSelLabeled(e.target.value)}
            options={[{ value: 'd:2', label: '3rd' }, { value: 'd:4', label: '5th' }]} />
        </Row>
      </Section>

      <Section title="Checkbox">
        <Row label="Plain">
          <Checkbox checked={cbPlain} onCheckedChange={setCbPlain} label="Show scale notes" />
          <Checkbox checked={cbInverted} onCheckedChange={setCbInverted} label="Inverted" />
          <Checkbox checked={false} onCheckedChange={() => {}} label="Disabled" disabled />
        </Row>
        <Row label="Swatched">
          <Checkbox checked={cbSwatchBlue} onCheckedChange={setCbSwatchBlue} label="Root" swatchColor="#1E90FF" />
          <Checkbox checked={cbSwatchGreen} onCheckedChange={setCbSwatchGreen} label="Scale" swatchColor="#228B22" />
          <Checkbox checked={cbSwatchOrange} onCheckedChange={setCbSwatchOrange} label="Interval" swatchColor="#FF8C00" />
        </Row>
      </Section>

      <Section title="Slider">
        <Row label="Plain">
          <Slider value={slPlain} onValueChange={setSlPlain} min={0} max={100} />
        </Row>
        <Row label="With label + units">
          <Slider
            value={slFormatted}
            onValueChange={setSlFormatted}
            min={100}
            max={800}
            step={50}
            label="Speed"
            valueFormatter={v => `${v}ms`}
          />
        </Row>
      </Section>

      <Section title="Badge">
        <Row label="Variants">
          <Badge variant="primary">Primary</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="neutral">Neutral</Badge>
        </Row>
      </Section>

      <Section title="Fretboard">
        <p style={{ color: 'var(--ds-color-neutral-500)', margin: '0 0 var(--ds-space-3)', fontSize: 'var(--ds-font-sm)' }}>
          Six variants of dot, each demoed on the same fretboard. New variants
          land as additions to <code>DotVariant</code> + one CSS rule.
        </p>
        {(() => {
          // Build a demo dots map hitting every variant + modifier.
          const demo = new Map<string, DotInfo>();
          demo.set(posKey(5, 3), { variant: 'root', label: 'G' });               // low E str, fret 3 → G
          demo.set(posKey(4, 5), { variant: 'scale' });                           // scale ghost
          demo.set(posKey(3, 7), { variant: 'scale' });
          demo.set(posKey(2, 9), { variant: 'current' });                         // cycle highlight
          demo.set(posKey(1, 8), { variant: 'base', label: '1' });                // placed base note
          demo.set(posKey(0, 10), { variant: 'harmony', label: '1' });            // selected harmony
          demo.set(posKey(0, 5), { variant: 'alternate' });                       // alternate voicing
          demo.set(posKey(1, 12), { variant: 'alternate', nonDiatonic: true });   // non-diatonic alternate
          demo.set(posKey(2, 12), { variant: 'harmony', dropTargetHint: true });  // pulsing drop target
          return (
            <Fretboard
              strings={6}
              fretCount={12}
              tuning={['E', 'B', 'G', 'D', 'A', 'E']}
              dots={demo}
              title="All variants"
            />
          );
        })()}
      </Section>

      <Section title="PianoKeyboard">
        <p style={{ color: 'var(--ds-color-neutral-500)', margin: '0 0 var(--ds-space-3)', fontSize: 'var(--ds-font-sm)' }}>
          Same DotInfo data, pitch-oriented layout. Fretboard positions get
          bucketed by MIDI pitch; variant priority resolves collisions.
        </p>
        {(() => {
          const demo = new Map<string, DotInfo>();
          demo.set(posKey(5, 3), { variant: 'root', label: 'G' });
          demo.set(posKey(4, 5), { variant: 'scale' });
          demo.set(posKey(3, 7), { variant: 'scale' });
          demo.set(posKey(2, 9), { variant: 'current' });
          demo.set(posKey(1, 8), { variant: 'base', label: '1' });
          demo.set(posKey(0, 10), { variant: 'harmony', label: '1' });
          return (
            <PianoKeyboard
              strings={6}
              fretCount={12}
              tuning={['E', 'B', 'G', 'D', 'A', 'E']}
              dots={demo}
              title="All variants"
            />
          );
        })()}
      </Section>

      <Section title="Card">
        <Row label="Default">
          <div style={{ flex: 1 }}>
            <Card title="Interval Analysis">
              <p style={{ margin: 0, color: 'var(--ds-color-neutral-700)' }}>
                Content goes here. The card provides the panel chrome; inner layout is up to you.
              </p>
            </Card>
          </div>
        </Row>
        <Row label="Subtle">
          <div style={{ flex: 1 }}>
            <Card subtle title="Sequencer">
              <p style={{ margin: 0, color: 'var(--ds-color-neutral-700)' }}>
                Subtle variant drops the border — useful when a card sits inside another card.
              </p>
            </Card>
          </div>
        </Row>
      </Section>
    </div>
  );
};
