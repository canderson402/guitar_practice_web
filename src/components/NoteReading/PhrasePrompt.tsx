import React, { memo } from 'react';
import { MelodyStaff } from '../MelodyStaff';
import { PhrasePrompt as PhrasePromptData } from '../../logic/noteReadingLogic';

interface Props {
  prompt: PhrasePromptData;
  answerState: 'waiting' | 'correct';
  trebleEnabled: boolean;
  bassEnabled: boolean;
  showLabels: boolean;
  /** Passed through to MelodyStaff. */
  scale?: number;
}

const PhrasePromptImpl: React.FC<Props> = ({
  prompt, answerState, trebleEnabled, bassEnabled, showLabels, scale,
}) => {
  const clef: 'treble' | 'bass' | 'grand' =
    trebleEnabled && bassEnabled ? 'grand' : bassEnabled ? 'bass' : 'treble';
  return (
    <div className="phrase-prompt">
      <MelodyStaff
        measures={prompt.melody.measures}
        timeSignature={prompt.melody.timeSignature}
        keySignature={prompt.melody.keySignature}
        clef={clef}
        currentNoteIndex={prompt.noteIndex}
        currentJustCompleted={answerState === 'correct'}
        showLabels={showLabels}
        scale={scale}
      />
    </div>
  );
};

export const PhrasePrompt = memo(PhrasePromptImpl);
