import React from 'react';
import { Card } from '../components/Card';
import { Metronome } from '../components/Metronome';
import { Timer } from '../components/Timer';
import { NoteSelector } from '../components/NoteSelector';
import { GuitarNeck } from '../components/GuitarNeck';
import { ChordProgression } from '../components/ChordProgression';
import { CircleOfFifths } from '../components/CircleOfFifths';
import { NoteTrainer } from '../components/NoteTrainer';
import { HarmonyMaker } from '../components/HarmonyMaker';
import { JamCard } from '../components/JamCard';
import { useStore } from '../store/useStore';
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

const displayTitle = (card: { id: string; title: string }, viewMode: string): string => {
  if (card.id === 'guitarNeck') {
    return viewMode === 'piano' ? 'Piano' : 'Fretboard';
  }
  return card.title;
};

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

  const { toggleCard, viewMode } = useStore();

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
        <span onClick={() => toggleCard(card.id)}>{displayTitle(card, viewMode)}</span>
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
    case 'chordProgression':
      return <ChordProgression />;
    case 'circleOfFifths':
      return <CircleOfFifths />;
    case 'noteTrainer':
      return <NoteTrainer />;
    case 'harmonyMaker':
      return <HarmonyMaker />;
    case 'jam':
      return <JamCard />;
    default:
      return null;
  }
};

const processCardsInOrder = (cards: any[]) => {
  const orderedElements: any[] = [];
  let pendingHorizontalCards: any[] = [];

  cards.forEach((card) => {
    if (!card.isActive) return;

    if (card.layout === 'vertical') {
      if (pendingHorizontalCards.length > 0) {
        orderedElements.push({
          type: 'horizontal-group',
          cards: [...pendingHorizontalCards],
          key: `horizontal-${orderedElements.length}`,
        });
        pendingHorizontalCards = [];
      }
      orderedElements.push({
        type: 'vertical',
        card,
        key: card.id,
      });
    } else {
      pendingHorizontalCards.push(card);
    }
  });

  if (pendingHorizontalCards.length > 0) {
    orderedElements.push({
      type: 'horizontal-group',
      cards: pendingHorizontalCards,
      key: `horizontal-${orderedElements.length}`,
    });
  }

  return orderedElements;
};

const distributeCards = (cards: any[]) => {
  const leftCards: any[] = [];
  const rightCards: any[] = [];

  const cardWeights: { [key: string]: number } = {
    metronome: 2,
    timer: 2,
    noteSelector: 3,
    noteTrainer: 3,
    chordProgression: 2,
    circleOfFifths: 4,
    harmonyMaker: 4,
    jam: 3,
    guitarNeck: 5,
  };

  let leftWeight = 0;
  let rightWeight = 0;

  cards.forEach((card) => {
    const cardWeight = cardWeights[card.id] || 2;
    if (leftWeight <= rightWeight) {
      leftCards.push(card);
      leftWeight += cardWeight;
    } else {
      rightCards.push(card);
      rightWeight += cardWeight;
    }
  });

  return { leftCards, rightCards };
};

const PracticePage: React.FC = () => {
  const { cards, reorderCards, viewMode } = useStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = cards.findIndex((card) => card.id === active.id);
      const newIndex = cards.findIndex((card) => card.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderCards(oldIndex, newIndex);
      }
    }
  };

  const orderedElements = processCardsInOrder(cards);

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={cards.map((card) => card.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="card-controls">
            {cards.map((card) => (
              <DraggableToggle key={card.id} card={card} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="cards-container">
        {orderedElements.map((element) => {
          if (element.type === 'vertical') {
            return (
              <div
                key={element.key}
                className="card-container vertical-card"
                data-layout={element.card.layout}
              >
                <Card
                  title={displayTitle(element.card, viewMode)}
                  isActive={element.card.isActive}
                >
                  {renderCardContent(element.card)}
                </Card>
              </div>
            );
          } else if (element.type === 'horizontal-group') {
            const { leftCards, rightCards } = distributeCards(element.cards);
            return (
              <div key={element.key} className="horizontal-section">
                <div className="column">
                  {leftCards.map((card: any) => (
                    <div key={card.id} className="card-container" data-layout={card.layout}>
                      <Card
                        title={displayTitle(card, viewMode)}
                        isActive={card.isActive}
                      >
                        {renderCardContent(card)}
                      </Card>
                    </div>
                  ))}
                </div>
                <div className="column">
                  {rightCards.map((card: any) => (
                    <div key={card.id} className="card-container" data-layout={card.layout}>
                      <Card
                        title={displayTitle(card, viewMode)}
                        isActive={card.isActive}
                      >
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
    </>
  );
};

export default PracticePage;
