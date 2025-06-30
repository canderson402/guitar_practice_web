import React from 'react';
import './Card.css';

interface CardProps {
  title: string;
  children: React.ReactNode;
  isActive?: boolean;
  isMinimized?: boolean;
  onToggleMinimized?: () => void;
}

export const Card: React.FC<CardProps> = ({ title, children, isActive = true, isMinimized = false, onToggleMinimized }) => {
  if (!isActive) return null;
  
  // Determine card type from title for styling
  const getCardType = (title: string) => {
    if (title.includes('Metronome')) return 'metronome';
    if (title.includes('Timer')) return 'timer';
    if (title.includes('Scale') || title.includes('Note Selector')) return 'noteSelector';
    if (title.includes('Session Status') || title.includes('Practice Progress')) return 'practiceProgress';
    if (title.includes('Fretboard') || title.includes('Guitar Fretboard')) return 'guitarNeck';
    if (title.includes('Chord Progression')) return 'chordProgression';
    return 'default';
  };
  
  const cardType = getCardType(title);
  
  return (
    <div className={`card ${isMinimized ? 'minimized' : ''}`}>
      <div 
        className={`card-header ${cardType}`}
        onClick={onToggleMinimized}
        style={{ cursor: onToggleMinimized ? 'pointer' : 'default' }}
      >
        <h2 className="card-title">{title}</h2>
        {onToggleMinimized && (
          <div className="minimize-indicator" title={isMinimized ? 'Click to expand' : 'Click to minimize'}>
            {isMinimized ? '▼' : '▲'}
          </div>
        )}
      </div>
      {!isMinimized && (
        <div className="card-content">
          {children}
        </div>
      )}
    </div>
  );
};