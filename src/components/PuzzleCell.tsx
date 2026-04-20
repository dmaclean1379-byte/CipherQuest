/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { memo } from 'react';
import { motion } from 'motion/react';
import { PuzzleCell as PuzzleCellType } from '../types';

interface PuzzleCellProps {
  cell: PuzzleCellType;
  isSelected: boolean;
  isFocused: boolean;
  isCorrect: boolean | null;
  onClick: () => void;
}

const PuzzleCell = memo(({ cell, isSelected, isFocused, isCorrect, onClick }: PuzzleCellProps) => {
  if (cell.isPunctuation) {
    return (
      <div className="w-3 md:w-5 h-12 md:h-16 flex items-center justify-center pb-4 md:pb-6 text-lg md:text-2xl font-semibold text-secondary">
        {cell.realLetter}
      </div>
    );
  }

  // Determine the display color
  let textColor = 'text-transparent';
  if (cell.userGuess) {
    if (isCorrect === true) textColor = 'text-accent';
    else if (isCorrect === false) textColor = 'text-error';
    else textColor = 'text-primary';
  }

  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        relative w-7 h-10 md:w-11 md:h-14 flex flex-col items-center justify-between cursor-pointer transition-all
        ${isSelected ? 'bg-accent-light' : ''}
        ${isFocused ? 'ring-2 ring-accent ring-inset' : ''}
      `}
    >
      <div className={`
        w-full flex-1 flex items-center justify-center text-lg md:text-2xl font-bold uppercase
        border-b-2 transition-colors ${textColor}
        ${isSelected || isFocused ? 'border-accent' : 'border-muted'}
        ${isCorrect === true && cell.userGuess ? 'border-success' : ''}
        ${isCorrect === false && cell.userGuess ? 'border-error' : ''}
      `}>
        {cell.userGuess || (isFocused ? '_' : '')}
      </div>
      <div className="h-3 md:h-5 flex items-center justify-center text-[9px] md:text-sm font-semibold text-secondary">
        {cell.number}
      </div>
    </motion.div>
  );
});

export default PuzzleCell;
