/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { PuzzleCell as PuzzleCellType } from '../types';
import PuzzleCell from './PuzzleCell';

interface PuzzleGridProps {
  cells: PuzzleCellType[];
  selectedNumber: number | null;
  focusedId: string | null;
  onCellClick: (cell: PuzzleCellType) => void;
  checkStatus: (cell: PuzzleCellType) => boolean | null;
}

export default function PuzzleGrid({ cells, selectedNumber, focusedId, onCellClick, checkStatus }: PuzzleGridProps) {
  // Group cells by words (simple logic: split by spaces)
  const words: PuzzleCellType[][] = [];
  let currentWord: PuzzleCellType[] = [];

  cells.forEach((cell) => {
    if (cell.realLetter === ' ') {
      if (currentWord.length > 0) {
        words.push(currentWord);
        currentWord = [];
      }
      words.push([cell]); // The space itself as a single-cell "word"
    } else {
      currentWord.push(cell);
    }
  });
  if (currentWord.length > 0) words.push(currentWord);

  return (
    <div className="flex flex-wrap gap-x-2 gap-y-4 justify-center max-w-4xl mx-auto p-4 select-none">
      {words.map((word, wordIndex) => (
        <motion.div
          key={`word-${wordIndex}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: wordIndex * 0.05 }}
          className="flex gap-1 items-center"
        >
          {word.map((cell) => (
            <PuzzleCell
              key={cell.id}
              cell={cell}
              isSelected={!cell.isPunctuation && cell.number === selectedNumber}
              isFocused={cell.id === focusedId}
              isCorrect={checkStatus(cell)}
              onClick={() => onCellClick(cell)}
            />
          ))}
        </motion.div>
      ))}
    </div>
  );
}
