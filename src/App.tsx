import React from 'react';
import './App.css';
import './themes.css';
import { Card } from './components/Card';
import { Metronome } from './components/Metronome';
import { Timer } from './components/Timer';
import { NoteSelector } from './components/NoteSelector';
import { GuitarNeck } from './components/GuitarNeck';
import { PracticeProgress } from './components/PracticeProgress';
import { useStore } from './store/useStore';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const DraggableToggle: React.FC<{ card: any }> = ({ card }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  const { toggleCard } = useStore();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card-toggle ${card.id} ${card.isActive ? 'active' : ''} ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="toggle-content">
        <input
          type="checkbox"
          checked={card.isActive}
          onChange={() => toggleCard(card.id)}
          onClick={(e) => e.stopPropagation()}
        />
        <span onClick={() => toggleCard(card.id)}>{card.title}</span>
      </div>
      <div className="drag-icon">
        <div className="drag-dots">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      </div>
    </div>
  );
};

function App() {
  const { cards, reorderCards, theme, setTheme } = useStore();
  
  // Apply theme class to document body
  React.useEffect(() => {
    document.body.className = `theme-${theme}`;
  }, [theme]);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = cards.findIndex(card => card.id === active.id);
      const newIndex = cards.findIndex(card => card.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderCards(oldIndex, newIndex);
      }
    }
  };
  
  const renderCardContent = (card: any) => {
    switch (card.id) {
      case 'metronome':
        return <Metronome />;
      case 'timer':
        return <Timer />;
      case 'noteSelector':
        return <NoteSelector />;
      case 'guitarNeck':
        return <GuitarNeck />;
      case 'practiceProgress':
        return <PracticeProgress />;
      default:
        return null;
    }
  };
  
  // Process cards in exact toggle order
  const processCardsInOrder = () => {
    const orderedElements: any[] = [];
    let pendingHorizontalCards: any[] = [];
    
    cards.forEach((card, index) => {
      if (!card.isActive) return;
      
      if (card.layout === 'vertical') {
        // If we have pending horizontal cards, render them first
        if (pendingHorizontalCards.length > 0) {
          orderedElements.push({
            type: 'horizontal-group',
            cards: [...pendingHorizontalCards],
            key: `horizontal-${orderedElements.length}`
          });
          pendingHorizontalCards = [];
        }
        
        // Add the vertical card
        orderedElements.push({
          type: 'vertical',
          card: card,
          key: card.id
        });
      } else {
        // Collect horizontal cards
        pendingHorizontalCards.push(card);
      }
    });
    
    // Add any remaining horizontal cards
    if (pendingHorizontalCards.length > 0) {
      orderedElements.push({
        type: 'horizontal-group',
        cards: pendingHorizontalCards,
        key: `horizontal-${orderedElements.length}`
      });
    }
    
    return orderedElements;
  };
  
  const orderedElements = processCardsInOrder();

  return (
    <div className={`app theme-${theme}`}>
      <header className="app-header">
        <h1>Guitar Practice</h1>
        <div className="header-theme-selector">
          <select value={theme} onChange={(e) => setTheme(e.target.value as any)}>
            <option value="forest">🌲 Forest</option>
            <option value="mountain">🏔️ Mountain</option>
            <option value="desert">🏜️ Desert</option>
            <option value="ocean">🌊 Ocean</option>
            <option value="eighties">🎸 80s</option>
            <option value="nineties">📼 90s</option>
            <option value="mars">🚀 Mars</option>
            <option value="metal">🤘 Metal</option>
            <option value="disco">🕺 Disco</option>
          </select>
        </div>
      </header>
      
      <main className="app-main">

        {/* Draggable Card Controls */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={cards.map(card => card.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="card-controls">
              {cards.map(card => (
                <DraggableToggle key={card.id} card={card} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Cards Display - Exact Toggle Order */}
        <div className="cards-container">
          {orderedElements.map(element => {
            if (element.type === 'vertical') {
              return (
                <div key={element.key} className="card-container vertical-card" data-layout={element.card.layout}>
                  <Card title={element.card.title} isActive={element.card.isActive}>
                    {renderCardContent(element.card)}
                  </Card>
                </div>
              );
            } else if (element.type === 'horizontal-group') {
              const leftCards = element.cards.filter((_: any, index: number) => index % 2 === 0);
              const rightCards = element.cards.filter((_: any, index: number) => index % 2 === 1);
              
              return (
                <div key={element.key} className="horizontal-section">
                  <div className="column">
                    {leftCards.map((card: any) => (
                      <div key={card.id} className="card-container" data-layout={card.layout}>
                        <Card title={card.title} isActive={card.isActive}>
                          {renderCardContent(card)}
                        </Card>
                      </div>
                    ))}
                  </div>
                  <div className="column">
                    {rightCards.map((card: any) => (
                      <div key={card.id} className="card-container" data-layout={card.layout}>
                        <Card title={card.title} isActive={card.isActive}>
                          {renderCardContent(card)}
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            
            return null;
          })}
        </div>
      </main>
    </div>
  );
}

export default App;