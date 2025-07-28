import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from './Card';
import { Metronome } from './Metronome';
import { Timer } from './Timer';
import { NoteSelector } from './NoteSelector';
import { GuitarNeck } from './GuitarNeck';
import { PracticeProgress } from './PracticeProgress';
import { useStore } from '../store/useStore';
import './SimpleDragDrop.css';

const SortableCard: React.FC<{ card: any }> = ({ card }) => {
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

  const renderCardContent = () => {
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

  if (!card.isActive) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`simple-card-container ${isDragging ? 'dragging' : ''}`}
      data-layout={card.layout}
    >
      <Card title={card.title} isActive={card.isActive}>
        {/* Simple drag handle - entire header is draggable */}
        <div 
          className="simple-drag-handle"
          {...attributes}
          {...listeners}
        />
        {renderCardContent()}
      </Card>
    </div>
  );
};

export const SimpleDragDrop: React.FC = () => {
  const { cards, reorderCards } = useStore();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Small distance to prevent accidental drags
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 250ms delay to prevent accidental drags on mobile
        tolerance: 5,
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

  // Separate cards by layout
  const verticalCards = cards.filter(card => card.layout === 'vertical');
  const horizontalCards = cards.filter(card => card.layout === 'horizontal');
  
  // Split horizontal cards into two columns for balanced layout
  const leftColumnCards = horizontalCards.filter((_, index) => index % 2 === 0);
  const rightColumnCards = horizontalCards.filter((_, index) => index % 2 === 1);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={cards.map(card => card.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="simple-cards-container">
          {/* Vertical cards (full width) */}
          <div className="vertical-section">
            {verticalCards.map(card => (
              <SortableCard key={card.id} card={card} />
            ))}
          </div>
          
          {/* Horizontal cards in columns */}
          {horizontalCards.length > 0 && (
            <div className="horizontal-section">
              <div className="column">
                {leftColumnCards.map(card => (
                  <SortableCard key={card.id} card={card} />
                ))}
              </div>
              <div className="column">
                {rightColumnCards.map(card => (
                  <SortableCard key={card.id} card={card} />
                ))}
              </div>
            </div>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
};