/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Lightbulb, Trophy, Brain, BarChart3 } from 'lucide-react';
import { GameState, PuzzleCell, UserStats } from './types';
import { createPuzzle, DEFAULT_QUOTES } from './services/puzzleService';
import { generateAIQuote } from './services/geminiService';
import PuzzleGrid from './components/PuzzleGrid';
import Keyboard from './components/Keyboard';

export default function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('cipher-quest-stats');
    return saved ? JSON.parse(saved) : { puzzlesCompleted: 0, totalHintsUsed: 0 };
  });

  useEffect(() => {
    localStorage.setItem('cipher-quest-stats', JSON.stringify(stats));
  }, [stats]);

  const startNewGame = useCallback(async (useAI = false) => {
    setIsLoading(true);
    // If resetting from a solved state, we don't clear until we have the new one to prevent flicker
    // except when solving.
    setFeedback(null);
    try {
      let quoteData;
      if (useAI) {
        quoteData = await generateAIQuote();
      } else {
        quoteData = DEFAULT_QUOTES[Math.floor(Math.random() * DEFAULT_QUOTES.length)];
      }
      
      const newGame = createPuzzle(quoteData.text, quoteData.author);
      setGame(newGame);
      setFocusedId(newGame.cells.find(c => !c.isPunctuation)?.id || null);
    } catch (err) {
      console.error(err);
      setFeedback("Error generating puzzle. Try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  const handleCellClick = (cell: PuzzleCell) => {
    if (cell.isPunctuation) return;
    setFocusedId(cell.id);
  };

  const updateGuess = useCallback((letter: string) => {
    if (!game || !focusedId || game.isSolved) return;

    const focusedCell = game.cells.find(c => c.id === focusedId);
    if (!focusedCell || focusedCell.isPunctuation) return;

    const number = focusedCell.number;
    const newCells = game.cells.map(cell => {
      if (cell.number === number) {
        return { ...cell, userGuess: letter };
      }
      return cell;
    });

    const solved = newCells.every(c => c.isPunctuation || c.userGuess === c.realLetter);
    
    if (solved && !game.isSolved) {
      setStats(prev => ({ ...prev, puzzlesCompleted: prev.puzzlesCompleted + 1 }));
    }

    setGame({
      ...game,
      cells: newCells,
      isSolved: solved,
      endTime: solved ? Date.now() : null
    });

    if (!solved) {
      const currentIndex = game.cells.findIndex(c => c.id === focusedId);
      const nextCell = game.cells.slice(currentIndex + 1).find(c => !c.isPunctuation);
      if (nextCell) setFocusedId(nextCell.id);
    }
  }, [game, focusedId]);

  const removeGuess = useCallback(() => {
    if (!game || !focusedId || game.isSolved) return;

    const focusedCell = game.cells.find(c => c.id === focusedId);
    if (!focusedCell || focusedCell.isPunctuation) return;

    const number = focusedCell.number;
    const newCells = game.cells.map(cell => {
      if (cell.number === number) {
        return { ...cell, userGuess: '' };
      }
      return cell;
    });

    setGame({ ...game, cells: newCells });

    const currentIndex = game.cells.findIndex(c => c.id === focusedId);
    const prevCell = game.cells.slice(0, currentIndex).reverse().find(c => !c.isPunctuation);
    if (prevCell) setFocusedId(prevCell.id);
  }, [game, focusedId]);

  const giveHint = () => {
    if (!game || game.isSolved) return;

    const unsolvedCells = game.cells.filter(c => !c.isPunctuation && c.userGuess !== c.realLetter);
    if (unsolvedCells.length === 0) return;

    const randomCell = unsolvedCells[Math.floor(Math.random() * unsolvedCells.length)];
    const letterToReveal = randomCell.realLetter;
    const numberToReveal = randomCell.number;

    const newCells = game.cells.map(cell => {
      if (cell.number === numberToReveal) {
        return { ...cell, userGuess: letterToReveal };
      }
      return cell;
    });

    const solved = newCells.every(c => c.isPunctuation || c.userGuess === c.realLetter);

    if (solved && !game.isSolved) {
      setStats(prev => ({ ...prev, puzzlesCompleted: prev.puzzlesCompleted + 1 }));
    }

    setStats(prev => ({ ...prev, totalHintsUsed: prev.totalHintsUsed + 1 }));
    
    setGame({
      ...game,
      cells: newCells,
      isSolved: solved,
      endTime: solved ? Date.now() : null
    });
    
    // Focus the revealed letter to make it obvious
    setFocusedId(randomCell.id);
    setFeedback(`Revealed: ${letterToReveal}`);
    setTimeout(() => setFeedback(null), 2000);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (game?.isSolved) return;
      if (e.key === 'Backspace') {
        removeGuess();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        updateGuess(e.key.toUpperCase());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [game?.isSolved, updateGuess, removeGuess]);

  const focusedCell = game?.cells.find(c => c.id === focusedId);
  const selectedNumber = focusedCell?.number || null;

  const checkStatus = (cell: PuzzleCell): boolean | null => {
    if (cell.isPunctuation || !cell.userGuess) return null;
    return cell.userGuess === cell.realLetter;
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-bg-app select-none overflow-hidden">
      {/* Header */}
      <header className="px-4 md:px-10 py-3 md:py-4 flex items-center justify-between border-b border-border bg-surface shrink-0 z-20">
        <div className="flex items-center gap-2">
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-accent">
            CipherQuest
          </h1>
        </div>
        
        <div className="flex gap-1.5 md:gap-3">
          <button
            onClick={() => startNewGame(false)}
            disabled={isLoading}
            className="btn-base px-3 h-9 md:h-10 border border-border bg-surface text-secondary hover:bg-bg-app flex items-center gap-1.5 disabled:opacity-50 text-xs md:text-sm"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Reset</span>
          </button>
          <button
            onClick={giveHint}
            disabled={isLoading || game?.isSolved}
            className="btn-base px-3 h-9 md:h-10 bg-accent text-white hover:bg-accent/90 flex items-center gap-1.5 disabled:opacity-50 text-xs md:text-sm"
          >
            <Lightbulb size={14} />
            Hint
          </button>
          <button
            onClick={() => startNewGame(true)}
            disabled={isLoading}
            className="btn-base px-3 h-9 md:h-10 border border-accent text-accent hover:bg-accent-light flex items-center gap-1.5 disabled:opacity-50 text-xs md:text-sm"
          >
            <Brain size={14} />
            AI <span className="hidden sm:inline">Puzzle</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 flex flex-col p-4 md:p-10 gap-4 md:gap-6 max-w-[1024px] mx-auto w-full box-border overflow-hidden">
        {/* Stats Bar */}
        {game && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 md:flex md:gap-8 bg-surface border border-border px-4 py-3 md:px-6 md:py-4 rounded-xl shadow-sm shrink-0 gap-y-2">
              <div className="flex flex-col">
                <span className="text-[10px] md:text-[11px] uppercase font-bold text-muted tracking-wider">Difficulty</span>
                <span className="text-sm md:text-lg font-bold text-primary leading-tight">{game.difficulty}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] md:text-[11px] uppercase font-bold text-muted tracking-wider">Progress</span>
                <span className="text-sm md:text-lg font-bold text-primary leading-tight">
                  {game.cells.filter(c => !c.isPunctuation && c.userGuess).length} / {game.cells.filter(c => !c.isPunctuation).length}
                </span>
              </div>
              <div className="flex flex-col col-span-2 md:ml-auto md:text-right">
                <span className="text-[10px] md:text-[11px] uppercase font-bold text-muted tracking-wider">Quote Author</span>
                <span className="text-sm md:text-lg font-bold text-primary leading-tight line-clamp-1">{game.author}</span>
              </div>
            </div>

            <div className="flex gap-4 md:gap-6 bg-accent-light/30 border border-accent/10 px-4 py-2 rounded-lg shrink-0">
              <div className="flex items-center gap-2">
                <BarChart3 size={14} className="text-accent" />
                <span className="text-xs font-bold text-secondary uppercase tracking-tight">Lifetime Stats:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted">Completed:</span>
                <span className="text-xs font-bold text-primary">{stats.puzzlesCompleted}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted">Hints:</span>
                <span className="text-xs font-bold text-primary">{stats.totalHintsUsed}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 flex flex-col relative">
          <AnimatePresence mode="wait">
            {game ? (
              <motion.div
                key={game.quote}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex-1 flex flex-col min-h-0"
              >
                <div className="bg-surface border border-border rounded-xl p-4 md:p-8 shadow-md flex-1 overflow-y-auto">
                  <PuzzleGrid
                    cells={game.cells}
                    selectedNumber={selectedNumber}
                    focusedId={focusedId}
                    onCellClick={handleCellClick}
                    checkStatus={checkStatus}
                  />
                </div>

                {game.isSolved && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute inset-0 bg-accent-light/95 rounded-xl z-30 flex flex-col items-center justify-center p-6 text-center border-l-4 border-accent shadow-sm"
                  >
                    <Trophy className="text-accent mb-2" size={40} />
                    <h2 className="text-2xl font-bold text-primary">Mastered!</h2>
                    <p className="mt-4 text-base md:text-lg italic text-secondary leading-relaxed max-w-md">
                      "{game.quote}"
                    </p>
                    <button
                      onClick={() => startNewGame(true)}
                      disabled={isLoading}
                      className="mt-8 btn-base bg-accent text-white hover:bg-accent/90 h-12 px-10 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLoading && <RefreshCw size={16} className="animate-spin" />}
                      Next Challenge
                    </button>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-secondary font-medium font-mono text-sm uppercase tracking-widest italic animate-pulse">Compiling Cipher...</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-60 right-4 md:right-10 px-6 py-3 bg-primary text-white text-sm font-bold rounded-lg shadow-2xl z-50 pointer-events-none"
          >
            {feedback}
          </motion.div>
        )}
      </main>

      {/* Keyboard Footer */}
      {!game?.isSolved && (
        <Keyboard
          onKey={updateGuess}
          onDelete={removeGuess}
        />
      )}
    </div>
  );
}
