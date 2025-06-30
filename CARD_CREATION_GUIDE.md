# Card Creation Guide for Guitar Practice App

## Overview
The Guitar Practice app uses a modular card system that allows for easy addition of new practice tools. Each card is a self-contained component that can be toggled on/off and arranged via drag-and-drop.

## Card System Architecture

### 1. Card Component Structure
- **Base Card Component** (`src/components/Card.tsx`):
  - Wraps content with consistent styling
  - Takes `title`, `children`, and `isActive` props
  - Automatically applies theme-based styling based on card title
  - Returns null if `isActive` is false

### 2. Card State Management (Zustand Store)
- **Store Location**: `src/store/useStore.ts`
- **Card Definition**:
  ```typescript
  interface CardInfo {
    id: string;           // Unique identifier
    title: string;        // Display title
    isActive: boolean;    // Show/hide state
    layout: 'vertical' | 'horizontal';  // Layout type
  }
  ```

### 3. Card Registration
Cards are registered in the store's initial state:
```typescript
cards: [
  { id: 'practiceProgress', title: 'Session Status', isActive: true, layout: 'horizontal' },
  { id: 'metronome', title: 'Metronome', isActive: true, layout: 'horizontal' },
  // ... more cards
]
```

## Steps to Create a New Card

### 1. Create the Component
Create a new component file in `src/components/`:
```typescript
// src/components/YourNewCard.tsx
import React from 'react';
import './YourNewCard.css';

export const YourNewCard: React.FC = () => {
  // Component logic here
  return (
    <div className="your-new-card">
      {/* Your card content */}
    </div>
  );
};
```

### 2. Add Component Styles
Create corresponding CSS file:
```css
/* src/components/YourNewCard.css */
.your-new-card {
  /* Your styles */
}
```

### 3. Update the Store
Add state interface and actions in `src/store/useStore.ts`:
```typescript
// Add to state interfaces
interface YourCardState {
  // Your state properties
}

// Add to StoreState
interface StoreState {
  // ... existing state
  yourCard: YourCardState;
  // ... actions
}

// Initialize in store
yourCard: {
  // Initial state
},

// Add actions
setYourCardProperty: (value) => set((state) => ({
  yourCard: { ...state.yourCard, property: value }
})),
```

### 4. Register the Card
Add to the cards array in `useStore.ts`:
```typescript
cards: [
  // ... existing cards
  { id: 'yourNewCard', title: 'Your Card Title', isActive: true, layout: 'horizontal' },
]
```

### 5. Import and Wire Up in App.tsx

1. Import the component:
```typescript
import { YourNewCard } from './components/YourNewCard';
```

2. Add to the `renderCardContent` function:
```typescript
const renderCardContent = (card: any) => {
  switch (card.id) {
    // ... existing cases
    case 'yourNewCard':
      return <YourNewCard />;
    default:
      return null;
  }
};
```

### 6. Add Theme Styling (Optional)
In `Card.tsx`, update `getCardType` if you want custom header styling:
```typescript
const getCardType = (title: string) => {
  // ... existing conditions
  if (title.includes('Your Card')) return 'yourCardType';
  return 'default';
};
```

Then add corresponding styles in `themes.css` for each theme.

## Card Layout Types

### Horizontal Layout
- Cards appear in a two-column grid
- Good for compact controls (metronome, timer, etc.)
- Multiple horizontal cards stack in alternating columns

### Vertical Layout
- Cards take full width
- Good for larger visualizations (guitar neck, chord diagrams)
- Vertical cards create distinct sections

## Card Features

### Drag and Drop
- All cards are draggable via the toggle controls in the header
- Order is preserved in the store's cards array
- `reorderCards` action handles array reordering

### Enable/Disable
- Each card has a checkbox toggle
- `toggleCard` action updates the `isActive` state
- Disabled cards don't render but maintain their position

### Theme Integration
- Card headers automatically get themed based on card type
- Themes are defined in `themes.json` and generated dynamically
- Each card type can have unique colors per theme

## Best Practices

1. **Keep Cards Self-Contained**: Each card should manage its own state and UI
2. **Use the Store**: Leverage Zustand for any state that needs persistence
3. **Follow Naming Conventions**: Use consistent naming for IDs, components, and styles
4. **Consider Layout**: Choose horizontal for controls, vertical for visualizations
5. **Theme Compatibility**: Ensure your card looks good with all available themes

## Example: Creating a Chord Diagram Card

1. **Component**: `ChordDiagram.tsx` - displays guitar chord fingerings
2. **State**: Selected chord, chord library
3. **Layout**: Vertical (for better visualization)
4. **Theme**: Custom "chordDiagram" type with musical notation colors
5. **Features**: Chord selection, fingering display, audio playback