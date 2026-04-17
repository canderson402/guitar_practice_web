import React, { memo } from 'react';
import { MelodyStaff } from '../MelodyStaff';
import { PhrasePrompt as PhrasePromptData } from '../../logic/noteReadingLogic';

interface Props {
  prompt: PhrasePromptData;
  answerState: 'waiting' | 'correct';
  trebleEnabled: boolean;
  bassEnabled: boolean;
}

const PhrasePromptImpl: React.FC<Props> = ({
  prompt, answerState, trebleEnabled, bassEnabled,
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
      />
    </div>
  );
};

export const PhrasePrompt = memo(PhrasePromptImpl);
