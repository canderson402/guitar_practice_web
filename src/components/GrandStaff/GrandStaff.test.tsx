import React from 'react';
import { render } from '@testing-library/react';
import { GrandStaff } from './GrandStaff';

describe('GrandStaff', () => {
  it('renders a single treble whole note as an SVG', () => {
    const { container } = render(
      <GrandStaff notes={[{ midi: 60 }]} clef="treble" />
    );
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('renders a single bass whole note', () => {
    const { container } = render(
      <GrandStaff notes={[{ midi: 43 }]} clef="bass" />
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders a grand staff with one note auto-placed on treble', () => {
    const { container } = render(
      <GrandStaff notes={[{ midi: 72 }]} clef="grand" />
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders a grand staff with one note auto-placed on bass', () => {
    const { container } = render(
      <GrandStaff notes={[{ midi: 40 }]} clef="grand" />
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders a 3-note chord on a single clef', () => {
    const { container } = render(
      <GrandStaff
        notes={[{ midi: 60 }, { midi: 64 }, { midi: 67 }]}
        clef="treble"
      />
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders a cross-clef chord via voices', () => {
    const { container } = render(
      <GrandStaff
        voices={[
          { clef: 'treble', notes: [{ midi: 72 }, { midi: 76 }] },
          { clef: 'bass', notes: [{ midi: 48 }, { midi: 55 }] },
        ]}
        clef="grand"
      />
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders every accidental case without throwing', () => {
    const cases: Array<{
      midi: number;
      spelling: 'sharp' | 'flat' | 'natural-C' | 'natural-F';
    }> = [
      { midi: 61, spelling: 'sharp' },     // C#
      { midi: 61, spelling: 'flat' },      // Db
      { midi: 60, spelling: 'natural-C' }, // B# (respelled from C)
      { midi: 59, spelling: 'natural-C' }, // Cb (respelled from B)
      { midi: 65, spelling: 'natural-F' }, // E# (respelled from F)
      { midi: 64, spelling: 'natural-F' }, // Fb (respelled from E)
    ];
    cases.forEach(c => {
      const { container, unmount } = render(
        <GrandStaff notes={[{ midi: c.midi, spelling: c.spelling }]} clef="treble" />
      );
      expect(container.querySelector('svg')).not.toBeNull();
      unmount();
    });
  });

  it('renders every supported duration', () => {
    (['whole', 'half', 'quarter', 'eighth', 'sixteenth'] as const).forEach(d => {
      const { container, unmount } = render(
        <GrandStaff notes={[{ midi: 67, duration: d }]} clef="treble" />
      );
      expect(container.querySelector('svg')).not.toBeNull();
      unmount();
    });
  });
});
