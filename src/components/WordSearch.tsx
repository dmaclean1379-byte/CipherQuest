/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Trophy, RefreshCw } from 'lucide-react';
import { WordSearchState, WordSearchCell } from '../types';

interface WordSearchProps {
  gameState: WordSearchState;
  onSolve: () => void;
  onNewGame: () => void;
}

interface Selection {
  start: { r: number; c: number };
  end: { r: number; c: number };
}

const WordSearch = memo(({ gameState, onSolve, onNewGame }: WordSearchProps) => {
  const [words, setWords] = useState(gameState.words);
  const [grid, setGrid] = useState(gameState.grid);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWords(gameState.words);
    setGrid(gameState.grid);
  }, [gameState]);

  const getCellFromEvent = (e: React.MouseEvent | React.TouchEvent) => {
    const touch = 'touches' in e ? e.touches[0] : e;
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element && element.hasAttribute('data-row')) {
      return {
        r: parseInt(element.getAttribute('data-row')!),
        c: parseInt(element.getAttribute('data-col')!)
      };
    }
    return null;
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState.isSolved) return;
    const cell = getCellFromEvent(e);
    if (cell) {
      setSelection({ start: cell, end: cell });
      setIsSelecting(true);
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isSelecting || !selection) return;
    const cell = getCellFromEvent(e);
    if (cell) {
      // Logic to restrict selection to 8 directions
      const dr = cell.r - selection.start.r;
      const dc = cell.c - selection.start.c;
      if (Math.abs(dr) === Math.abs(dc) || dr === 0 || dc === 0) {
        setSelection({ ...selection, end: cell });
      }
    }
  };

  const handleEnd = () => {
    if (!selection) return;
    setIsSelecting(false);
    
    // Check if selected word matches any target
    const dr = selection.end.r - selection.start.r;
    const dc = selection.end.c - selection.start.c;
    const length = Math.max(Math.abs(dr), Math.abs(dc)) + 1;
    const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
    const stepC = dc === 0 ? 0 : dc / Math.abs(dc);

    let selectedWord = "";
    const selectedCells: { r: number; c: number }[] = [];
    for (let i = 0; i < length; i++) {
      const r = selection.start.r + stepR * i;
      const c = selection.start.c + stepC * i;
      selectedWord += grid[r][c].char;
      selectedCells.push({ r, c });
    }

    const reversedWord = selectedWord.split('').reverse().join('');
    
    const wordIndex = words.findIndex(w => !w.isFound && (w.word === selectedWord || w.word === reversedWord));
    
    if (wordIndex !== -1) {
      const newWords = [...words];
      newWords[wordIndex].isFound = true;
      setWords(newWords);

      const newGrid = [...grid];
      selectedCells.forEach(({ r, c }) => {
        newGrid[r][c] = { ...newGrid[r][c], isFound: true };
      });
      setGrid(newGrid);

      if (newWords.every(w => w.isFound)) {
        onSolve();
      }
    }

    setSelection(null);
  };

  const isCellInSelection = (r: number, c: number) => {
    if (!selection) return false;
    const dr = selection.end.r - selection.start.r;
    const dc = selection.end.c - selection.start.c;
    const length = Math.max(Math.abs(dr), Math.abs(dc)) + 1;
    const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
    const stepC = dc === 0 ? 0 : dc / Math.abs(dc);

    for (let i = 0; i < length; i++) {
      if (selection.start.r + stepR * i === r && selection.start.c + stepC * i === c) return true;
    }
    return false;
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-4xl mx-auto p-4 select-none">
      <div className="flex justify-between w-full items-center mb-2">
        <h3 className="text-xl font-bold text-primary capitalize">{gameState.category}</h3>
        <button 
          onClick={onNewGame}
          className="p-2 hover:bg-accent-light rounded-lg text-accent transition-colors flex items-center gap-2"
        >
          <RefreshCw size={18} />
          <span className="text-sm font-bold">New Grid</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 w-full">
        {/* Compact Word List */}
        <div className="flex-none lg:w-[180px]">
          <div className="bg-surface/50 border border-border rounded-xl p-2 md:p-3 shadow-sm">
            <h4 className="text-[10px] uppercase tracking-widest font-bold text-muted mb-2 flex items-center gap-1.5">
              Target Words
              <span className="text-accent text-[11px]">({words.filter(w => w.isFound).length}/{words.length})</span>
            </h4>
            <div className="flex flex-wrap lg:flex-col gap-1.5 md:gap-2">
              {words.map((w, idx) => (
                <div 
                  key={idx}
                  className={`text-[11px] md:text-sm font-bold px-2 py-0.5 md:py-1 rounded-md transition-all ${
                    w.isFound ? 'bg-success/10 text-success line-through opacity-50' : 'bg-bg-app/50 text-secondary border border-border/30'
                  }`}
                >
                  {w.word}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Puzzle Grid */}
        <div className="relative flex-none mx-auto touch-none">
          <div 
            ref={gridRef}
            className="grid gap-1 bg-surface border-4 border-border rounded-xl p-2 shadow-xl"
            style={{ 
              gridTemplateColumns: `repeat(${grid.length}, 1fr)`,
              userSelect: 'none' 
            }}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          >
            {grid.map((row, r) => (
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  data-row={r}
                  data-col={c}
                  className={`
                    w-7 h-7 md:w-9 md:h-9 flex items-center justify-center rounded-lg text-xs md:text-sm font-bold transition-all
                    ${cell.isFound ? 'bg-accent/20 text-accent' : 'text-primary'}
                    ${isCellInSelection(r, c) ? 'bg-accent text-white scale-110 !rounded-full' : ''}
                    hover:bg-bg-app cursor-crosshair
                  `}
                >
                  {cell.char}
                </div>
              ))
            ))}
          </div>

          <AnimatePresence>
            {gameState.isSolved && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 bg-accent-light/90 z-20 rounded-xl flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm"
              >
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4 shadow-lg">
                  <Trophy className="text-white" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-primary mb-2">Well Found!</h2>
                <p className="text-secondary font-medium mb-6">You found all the words in the {gameState.category} grid.</p>
                <button
                  onClick={onNewGame}
                  className="btn-base bg-accent text-white hover:bg-accent/90 h-11 px-8 flex items-center gap-2 font-bold shadow-md"
                >
                  Next Grid
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
});

export default WordSearch;
