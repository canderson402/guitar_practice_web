import React, { memo, useMemo } from 'react';
import { Fretboard } from '../Fretboard/Fretboard';
import { DotInfo, posKey } from '../Fretboard/types';
import { FretboardPrompt as FretboardPromptData, Label } from '../../logic/noteReadingLogic';
import { useStore } from '../../store/useStore';

interface Props {
  prompt: FretboardPromptData;
  answerState: 'waiting' | 'correct';
  justPressedCorrect: Label | null;
}

const FretboardPromptImpl: React.FC<Props> = ({ prompt, answerState, justPressedCorrect }) => {
  const tuning = useStore(s => s.note.tuning);
  const fretCount = useStore(s => s.noteReading.fretCount);

  const dots = useMemo(() => {
    const m = new Map<string, DotInfo>();
    const isCorrect = answerState === 'correct';
    const dot: DotInfo = isCorrect
      ? {
          variant: 'current',
          label: justPressedCorrect ?? prompt.acceptableAnswers[0],
          color: 'var(--ds-color-primary)',
        }
      : { variant: 'current', label: '?' };
    m.set(posKey(prompt.stringIndex, prompt.fret), dot);
    return m;
  }, [prompt.stringIndex, prompt.fret, prompt.acceptableAnswers, answerState, justPressedCorrect]);

  return (
    <Fretboard
      strings={6}
      fretCount={fretCount}
      tuning={tuning}
      dots={dots}
      showStringLabels={true}
      showFretNumbers="bottom"
      textMode="white"
    />
  );
};

export const FretboardPrompt = memo(FretboardPromptImpl);
