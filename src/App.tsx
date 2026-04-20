/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Lightbulb, Trophy, Brain, BarChart3, X, Film, Music, Lightbulb as FactIcon, Quote, Palette, Check, Download } from 'lucide-react';
import { GameState, PuzzleCell, UserStats } from './types';
import { createPuzzle, DEFAULT_QUOTES } from './services/puzzleService';
import { generateAIQuote } from './services/geminiService';
import PuzzleGrid from './components/PuzzleGrid';
import Keyboard from './components/Keyboard';

export default function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [quoteHistory, setQuoteHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('cipher-quest-history');
    return saved ? JSON.parse(saved) : [];
  });
  const historyRef = useRef<string[]>([]);
  
  useEffect(() => {
    historyRef.current = quoteHistory;
  }, [quoteHistory]);

  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('cipher-quest-theme') || 'theme-quest');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('cipher-quest-stats');
    return saved ? JSON.parse(saved) : { puzzlesCompleted: 0, totalHintsUsed: 0 };
  });
  
  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    localStorage.setItem('cipher-quest-stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem('cipher-quest-theme', theme);
    // Apply theme to document root to ensure all variables cascade correctly
    const root = document.documentElement;
    root.classList.forEach(cls => {
      if (cls.startsWith('theme-')) root.classList.remove(cls);
    });
    root.classList.add(theme);
  }, [theme]);

  const startNewGame = useCallback(async (useAI = false, category?: string) => {
    setIsLoading(true);
    setShowCategories(false);
    setFeedback(null);
    try {
      let quoteData: { text: string; author: string } | null = null;
      
      if (useAI) {
        quoteData = await generateAIQuote(category);
      }
      
      // Fallback to internal quotes if AI fails or wasn't requested
      if (!quoteData) {
        // Filter out quotes that are in the history
        const availableQuotes = DEFAULT_QUOTES.filter(q => !historyRef.current.includes(q.text));
        
        // If we've seen everything, reset history
        const sourcePool = availableQuotes.length > 0 ? availableQuotes : DEFAULT_QUOTES;
        quoteData = sourcePool[Math.floor(Math.random() * sourcePool.length)];
      }
      
      // Add to history and maintain size (last 30 quotes)
      if (quoteData) {
        const text = quoteData.text;
        setQuoteHistory(prev => {
          const newHistory = [text, ...prev.filter(q => q !== text)].slice(0, 30);
          localStorage.setItem('cipher-quest-history', JSON.stringify(newHistory));
          return newHistory;
        });

        const newGame = createPuzzle(quoteData.text, quoteData.author, category || "Quote");
        setGame(newGame);
        setFocusedId(newGame.cells.find(c => !c.isPunctuation)?.id || null);
      }
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

  const focusedCell = useMemo(() => game?.cells.find(c => c.id === focusedId), [game?.cells, focusedId]);
  const selectedNumber = useMemo(() => focusedCell?.number || null, [focusedCell]);

  const checkStatus = useCallback((cell: PuzzleCell): boolean | null => {
    if (cell.isPunctuation || !cell.userGuess) return null;
    return cell.userGuess === cell.realLetter;
  }, []);

  return (
    <div className={`h-[100dvh] flex flex-col bg-bg-app select-none overflow-hidden pb-[env(safe-area-inset-bottom)] touch-none ${theme}`}>
      {/* Header */}
      <header className="px-4 md:px-10 py-2 md:py-3 flex items-center justify-between border-b border-border bg-surface shrink-0 z-20 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-2">
          <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-accent">
            CipherQuest
          </h1>
        </div>
        
        <div className="flex gap-1.5 md:gap-3">
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="btn-base px-3 h-9 md:h-10 bg-success text-white hover:bg-success/90 flex items-center gap-1.5 text-xs md:text-sm animate-pulse"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}
          <button
            onClick={() => setShowThemes(true)}
            className="btn-base px-3 h-9 md:h-10 border border-border bg-surface text-secondary hover:bg-bg-app flex items-center gap-1.5 text-xs md:text-sm"
          >
            <Palette size={14} />
          </button>
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
            onClick={() => setShowCategories(true)}
            disabled={isLoading}
            className="btn-base px-3 h-9 md:h-10 border border-accent text-accent hover:bg-accent-light flex items-center gap-1.5 disabled:opacity-50 text-xs md:text-sm"
          >
            <Brain size={14} />
            AI <span className="hidden sm:inline">Puzzle</span>
          </button>
        </div>
      </header>

      {/* Category Selector Popup */}
      <AnimatePresence>
        {showCategories && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCategories(false)}
              className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-surface rounded-2xl shadow-2xl border border-border p-6 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Brain size={20} className="text-accent" />
                  <h2 className="text-lg font-bold text-primary">Choose Category</h2>
                </div>
                <button 
                  onClick={() => setShowCategories(false)}
                  className="p-1.5 hover:bg-bg-app rounded-full text-muted transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-2">
                {[
                  { id: 'Quote', icon: Quote, label: 'Quotes' },
                  { id: 'Movie Title', icon: Film, label: 'Movies' },
                  { id: 'Song Title', icon: Music, label: 'Songs' },
                  { id: 'Fun Fact', icon: FactIcon, label: 'Facts' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => startNewGame(true, cat.id)}
                    className="flex flex-col items-center justify-center p-4 bg-surface border border-border rounded-xl hover:border-accent hover:bg-accent-light group transition-all"
                  >
                    <cat.icon size={24} className="text-muted group-hover:text-accent mb-2" />
                    <span className="text-xs font-bold text-secondary group-hover:text-accent">{cat.label}</span>
                  </button>
                ))}
              </div>
              
              <p className="mt-4 text-center text-[10px] text-muted font-medium uppercase tracking-widest">
                AI Powered Generation
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Theme Selector Popup */}
      <AnimatePresence>
        {showThemes && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowThemes(false)}
              className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-sm bg-surface rounded-2xl shadow-2xl border border-border p-6 overflow-hidden ${theme}`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Palette size={20} className="text-accent" />
                  <h2 className="text-lg font-bold text-primary">Visual Themes</h2>
                </div>
                <button 
                  onClick={() => setShowThemes(false)}
                  className="p-1.5 hover:bg-bg-app rounded-full text-muted transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {[
                  { id: 'theme-quest', label: 'Classic Quest', colors: ['bg-[#2563eb]', 'bg-[#1e293b]'] },
                  { id: 'theme-midnight', label: 'Midnight Neon', colors: ['bg-[#8b5cf6]', 'bg-[#020617]'] },
                  { id: 'theme-forest', label: 'Evergreen Nature', colors: ['bg-[#10b981]', 'bg-[#f3f4f6]'] },
                  { id: 'theme-sunset', label: 'Velvet Sunset', colors: ['bg-[#f43f5e]', 'bg-[#fff7ed]'] },
                  { id: 'theme-monochrome', label: 'High Contrast', colors: ['bg-[#000000]', 'bg-[#ffffff]'] },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id);
                      setShowThemes(false);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                      theme === t.id ? 'border-accent bg-accent-light' : 'border-border bg-surface hover:border-accent/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        <div className={`w-6 h-6 rounded-full border border-white ${t.colors[0]}`} />
                        <div className={`w-6 h-6 rounded-full border border-white ${t.colors[1]}`} />
                      </div>
                      <span className={`text-sm font-bold ${theme === t.id ? 'text-accent' : 'text-secondary'}`}>
                        {t.label}
                      </span>
                    </div>
                    {theme === t.id && <Check size={18} className="text-accent" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 min-h-0 flex flex-col p-3 md:p-8 gap-3 md:gap-6 max-w-[1024px] mx-auto w-full box-border overflow-hidden">
        {/* Stats Bar Container */}
        {game && (
          <div className="flex flex-col gap-2 shrink-0">
            <div className="flex items-center bg-surface border border-border px-2 py-1.5 md:px-5 md:py-2 rounded-lg shadow-sm gap-2 md:gap-3 overflow-hidden">
              <div className="flex items-center gap-2 md:gap-5 min-w-0 flex-1">
                {/* Difficulty */}
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <span className="text-[8px] md:text-[9px] uppercase font-bold text-muted hidden sm:inline">Diff:</span>
                  <span className="text-[10px] md:text-xs font-bold text-primary">{game.difficulty}</span>
                </div>
                
                <div className="w-px h-3 bg-border shrink-0" />
                
                {/* Dynamic Source Label */}
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <span className="text-[8px] md:text-[9px] uppercase font-bold text-muted hidden sm:inline text-nowrap">
                    {game.category === 'Movie Title' ? 'Movie:' : 
                     game.category === 'Song Title' ? 'Artist:' : 
                     game.category === 'Fun Fact' ? 'Facts:' : 'Author:'}
                  </span>
                  <span className="text-[10px] md:text-xs font-bold text-secondary truncate italic">"{game.author}"</span>
                </div>

                <div className="w-px h-3 bg-border shrink-0" />

                {/* Lifetime Stats */}
                <div className="flex items-center gap-2 md:gap-4 text-secondary shrink-0">
                  <div className="flex items-center gap-1">
                    <Trophy size={11} className="text-accent" />
                    <span className="text-[10px] md:text-xs font-bold">{stats.puzzlesCompleted}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Lightbulb size={11} className="text-secondary" />
                    <span className="text-[10px] md:text-xs font-bold">{stats.totalHintsUsed}</span>
                  </div>
                </div>
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
                      onClick={() => setShowCategories(true)}
                      disabled={isLoading}
                      className="mt-8 btn-base bg-accent text-white hover:bg-accent/90 h-12 px-10 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isLoading && <RefreshCw size={16} className="animate-spin" />}
                      Next AI Challenge
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
