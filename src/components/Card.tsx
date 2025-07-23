import React from 'react';
import './Card.css';

interface CardProps {
  title: string;
  children: React.ReactNode;
  isActive?: boolean;
}

export const Card: React.FC<CardProps> = ({ title, children, isActive = true }) => {
  if (!isActive) return null;
  
  // Determine card type from title for styling
  const getCardType = (title: string) => {
    if (title.includes('Metronome')) return 'metronome';
    if (title.includes('Timer')) return 'timer';
    if (title.includes('Scale') || title.includes('Note Selector')) return 'noteSelector';
    if (title.includes('Session Status') || title.includes('Practice Progress')) return 'practiceProgress';
    if (title.includes('Fretboard') || title.includes('Guitar Fretboard')) return 'guitarNeck';
    if (title.includes('Chord Progression') || title.includes('Chord')) return 'chordProgression';
    if (title.includes('Circle of Fifths')) return 'circleOfFifths';
    return 'default';
  };
  
  const cardType = getCardType(title);
  
  return (
    <div className="card">
      <div className={`card-header ${cardType}`}>
        <h2 className="card-title">{title}</h2>
      </div>
      <div className="card-content">
        {children}
      </div>
    </div>
  );
};