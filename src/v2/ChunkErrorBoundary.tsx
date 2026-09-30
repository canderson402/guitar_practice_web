import React from 'react';

interface State { failed: boolean }

/** Wraps the lazily loaded v2 chunk. A failed load (e.g. right after a
 *  deploy renamed the chunk) shows a reload prompt instead of a blank page.
 *  Lives outside the v2 chunk, so it can't use v2 tokens — plain styles. */
export class ChunkErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'system-ui, sans-serif', background: '#14121a', color: '#ece9f2' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: 16 }}>We couldn't load this page.</p>
          <button type="button" onClick={() => window.location.reload()}
            style={{ padding: '8px 18px', borderRadius: 999, border: 'none', background: '#ff3d7f', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
