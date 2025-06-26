import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  Active,
  Over,
  useDroppable,
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
import './DragDropSystem.css';

interface DragDropSystemProps {}

interface DragState {
  activeId: string | null;
  overId: string | null;
  insertPosition: 'before' | 'after' | null;
}

const SortableCard: React.FC<{ card: any; isDragOverlay?: boolean }> = ({ 
  card, 
  isDragOverlay = false 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: card.id,
    disabled: isDragOverlay
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragOverlay ? 1000 : 'auto',
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

  if (!card.isActive && !isDragOverlay) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card-container draggable-card ${isDragging ? 'dragging' : ''} ${isDragOverlay ? 'drag-overlay' : ''}`}
      data-layout={card.layout}
    >
      <Card title={card.title} isActive={card.isActive}>
        {!isDragOverlay && (
          <div 
            className="drag-handle-overlay"
            {...attributes}
            {...listeners}
          />
        )}
        {renderCardContent()}
      </Card>
    </div>
  );
};

const DropZone: React.FC<{
  position: 'before' | 'after';
  targetId: string;
  isActive: boolean;
  layout: 'vertical' | 'horizontal';
}> = ({ position, targetId, isActive, layout }) => {
  const { setNodeRef } = useDroppable({
    id: `${targetId}-${position}`,
  });
  
  return (
    <div 
      ref={setNodeRef}
      className={`drop-zone ${layout} ${position} ${isActive ? 'active' : ''}`}
      data-drop-target={`${targetId}-${position}`}
    >
      <div className="drop-indicator">
        <div className="drop-line" />
        <div className="drop-text">
          Drop here to place {position} {targetId}
        </div>
      </div>
    </div>
  );
};

export const DragDropSystem: React.FC<DragDropSystemProps> = () => {
  const { cards, toggleCard, reorderCards } = useStore();
  
  const [dragState, setDragState] = useState<DragState>({
    activeId: null,
    overId: null,
    insertPosition: null,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Separate cards by layout for rendering
  const verticalCards = cards.filter(card => card.layout === 'vertical');
  const horizontalCards = cards.filter(card => card.layout === 'horizontal');

  // Distribute horizontal cards into columns
  const leftColumnCards = horizontalCards.filter((_, index) => index % 2 === 0);
  const rightColumnCards = horizontalCards.filter((_, index) => index % 2 === 1);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setDragState({
      activeId: active.id as string,
      overId: null,
      insertPosition: null,
    });
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setDragState({
        activeId: dragState.activeId,
        overId: null,
        insertPosition: null,
      });
      return;
    }

    const overId = over.id as string;
    let insertPosition: 'before' | 'after' = 'after';
    let targetId = overId;

    // Handle drop zone targets
    if (overId.includes('-before')) {
      targetId = overId.replace('-before', '');
      insertPosition = 'before';
    } else if (overId.includes('-after')) {
      targetId = overId.replace('-after', '');
      insertPosition = 'after';
    }

    setDragState({
      activeId: dragState.activeId,
      overId: targetId,
      insertPosition,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      let overId = over.id as string;
      let insertPosition: 'before' | 'after' = 'after';

      // Handle drop zone targets
      if (overId.includes('-before')) {
        overId = overId.replace('-before', '');
        insertPosition = 'before';
      } else if (overId.includes('-after')) {
        overId = overId.replace('-after', '');
        insertPosition = 'after';
      }

      const oldIndex = cards.findIndex(card => card.id === active.id);
      const overIndex = cards.findIndex(card => card.id === overId);
      
      if (oldIndex !== -1 && overIndex !== -1) {
        const newIndex = insertPosition === 'before' ? overIndex : overIndex + 1;
        reorderCards(oldIndex, newIndex > oldIndex ? newIndex - 1 : newIndex);
      }
    }

    setDragState({
      activeId: null,
      overId: null,
      insertPosition: null,
    });
  };

  const activeCard = dragState.activeId ? cards.find(card => card.id === dragState.activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={cards.map(card => card.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="enhanced-cards-container">
          {/* Vertical Cards Section */}
          <div className="vertical-section">
            {verticalCards.map((card, index) => (
              <React.Fragment key={card.id}>
                {dragState.activeId && dragState.activeId !== card.id && (
                  <DropZone
                    position="before"
                    targetId={card.id}
                    isActive={dragState.overId === card.id && dragState.insertPosition === 'before'}
                    layout="vertical"
                  />
                )}
                <SortableCard card={card} />
                {dragState.activeId && dragState.activeId !== card.id && (
                  <DropZone
                    position="after"
                    targetId={card.id}
                    isActive={dragState.overId === card.id && dragState.insertPosition === 'after'}
                    layout="vertical"
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Horizontal Cards Section */}
          {horizontalCards.length > 0 && (
            <div className="horizontal-section">
              <div className="column">
                {leftColumnCards.map((card) => (
                  <React.Fragment key={card.id}>
                    {dragState.activeId && dragState.activeId !== card.id && (
                      <DropZone
                        position="before"
                        targetId={card.id}
                        isActive={dragState.overId === card.id && dragState.insertPosition === 'before'}
                        layout="horizontal"
                      />
                    )}
                    <SortableCard card={card} />
                    {dragState.activeId && dragState.activeId !== card.id && (
                      <DropZone
                        position="after"
                        targetId={card.id}
                        isActive={dragState.overId === card.id && dragState.insertPosition === 'after'}
                        layout="horizontal"
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
              <div className="column">
                {rightColumnCards.map((card) => (
                  <React.Fragment key={card.id}>
                    {dragState.activeId && dragState.activeId !== card.id && (
                      <DropZone
                        position="before"
                        targetId={card.id}
                        isActive={dragState.overId === card.id && dragState.insertPosition === 'before'}
                        layout="horizontal"
                      />
                    )}
                    <SortableCard card={card} />
                    {dragState.activeId && dragState.activeId !== card.id && (
                      <DropZone
                        position="after"
                        targetId={card.id}
                        isActive={dragState.overId === card.id && dragState.insertPosition === 'after'}
                        layout="horizontal"
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      </SortableContext>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeCard ? (
          <SortableCard card={activeCard} isDragOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};