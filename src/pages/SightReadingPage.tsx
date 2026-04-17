import React from 'react';
import { NoteReading } from '../components/NoteReading';
import './SightReadingPage.css';

const SightReadingPage: React.FC = () => (
  <div className="sight-reading-page">
    <div className="sight-reading-card">
      <div className="sight-reading-header">
        <h2>Sight Reading</h2>
      </div>
      <div className="sight-reading-body">
        <NoteReading />
      </div>
    </div>
  </div>
);

export default SightReadingPage;
