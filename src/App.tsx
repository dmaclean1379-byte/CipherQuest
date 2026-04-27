/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Lightbulb, Trophy, Brain, BarChart3, X, Film, Music, Lightbulb as FactIcon, Quote, Palette, Check, Download, ZoomIn, ZoomOut, PawPrint, Rocket, Globe, Cpu, Utensils, Scroll, ArrowRight, Layers, KeyRound, Search } from 'lucide-react';
import { GameState, WordSearchState, WordLadderState, GameMode, UserStats, PuzzleCell } from './types';
import { createPuzzle, DEFAULT_QUOTES, getDailyQuote } from './services/puzzleService';
import { generateAIQuote, generateAIWordList } from './services/geminiService';
import { generateWordSearch } from './services/wordSearchService';
import { generateWordLadder } from './services/wordLadderService';
import { StorageService } from './services/storageService';
import PuzzleGrid from './components/PuzzleGrid';
import WordSearch from './components/WordSearch';
import WordLadder from './components/WordLadder';
import Keyboard from './components/Keyboard';

export default function App() {
  const [mode, setMode] = useState<GameMode>('LOBBY');
  const [game, setGame] = useState<GameState | null>(null);
  const [wsGame, setWSGame] = useState<WordSearchState | null>(null);
  const [wlGame, setWLGame] = useState<WordLadderState | null>(null);
  const lastWSCategory = useRef<string | null>(null);
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
  const [puzzleScale, setPuzzleScale] = useState(1);
  const [theme, setTheme] = useState(() => localStorage.getItem('cipher-quest-theme') || 'theme-quest');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('cipher-quest-stats');
    return saved ? JSON.parse(saved) : { puzzlesCompleted: 0, totalHintsUsed: 0, dailyCompletedDate: null };
  });
  
  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const isRehydrating = useRef(true);

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

  // Persistence Effects
  useEffect(() => {
    if (game && !game.isSolved) {
      StorageService.save(mode === 'DAILY_CIPHER' ? 'daily-cipher' : 'current-cipher', game);
    } else if (game?.isSolved) {
      StorageService.clear(mode === 'DAILY_CIPHER' ? 'daily-cipher' : 'current-cipher');
    }
  }, [game, mode]);

  useEffect(() => {
    if (wsGame && !wsGame.isSolved) {
      StorageService.save('current-wordsearch', wsGame);
    } else if (wsGame?.isSolved) {
      StorageService.clear('current-wordsearch');
    }
  }, [wsGame]);

  useEffect(() => {
    if (wlGame && !wlGame.isSolved) {
      StorageService.save('current-wordladder', wlGame);
    } else if (wlGame?.isSolved) {
      StorageService.clear('current-wordladder');
    }
  }, [wlGame]);

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
    // Don't clear if we're in the middle of rehydrating
    if (isRehydrating.current) return;
    if (mode === 'LOBBY') return;

    setIsLoading(true);
    setShowCategories(false);
    setFeedback(null);
    
    // Clear persistent state when starting fresh
    if (mode === 'CIPHER') StorageService.clear('current-cipher');
    else if (mode === 'DAILY_CIPHER') StorageService.clear('daily-cipher');
    else if (mode === 'WORDSEARCH') StorageService.clear('current-wordsearch');
    else if (mode === 'WORDLADDER') StorageService.clear('current-wordladder');

    try {
      if (mode === 'CIPHER' || mode === 'DAILY_CIPHER') {
        let quoteData: { text: string; author: string } | null = null;
        let isDaily = mode === 'DAILY_CIPHER';
        let seed: string | undefined = undefined;

        if (isDaily) {
          quoteData = getDailyQuote();
          seed = new Date().toISOString().split('T')[0];
        } else if (useAI) {
          quoteData = await generateAIQuote(category);
        }
        
        if (!quoteData) {
          const availableQuotes = DEFAULT_QUOTES.filter(q => !historyRef.current.includes(q.text));
          const sourcePool = availableQuotes.length > 0 ? availableQuotes : DEFAULT_QUOTES;
          quoteData = sourcePool[Math.floor(Math.random() * sourcePool.length)];
        }
        
        if (quoteData) {
          const text = quoteData.text;
          if (!isDaily) {
            setQuoteHistory(prev => {
              const newHistory = [text, ...prev.filter(q => q !== text)].slice(0, 30);
              localStorage.setItem('cipher-quest-history', JSON.stringify(newHistory));
              return newHistory;
            });
          }

          const newGame = createPuzzle(quoteData.text, quoteData.author, isDaily ? "Daily Challenge" : (category || "Quote"), seed);
          setGame(newGame);
          setWLGame(null);
          setWSGame(null);
          setFocusedId(newGame.cells.find(c => !c.isPunctuation)?.id || null);
        }
      } else if (mode === 'WORDSEARCH') {
        // Word Search Mode
        let wsCategory = category || "";
        let customWords: string[] | undefined = undefined;

        if (useAI) {
          const aiWords = await generateAIWordList(category);
          if (aiWords) {
            customWords = aiWords.words;
            wsCategory = aiWords.category;
          }
        }
        
        const newWS = generateWordSearch(wsCategory, 10, customWords);
        
        // If it's a random standard game and same as last, try one more time
        if (!category && !useAI && newWS.category === lastWSCategory.current) {
          const retryWS = generateWordSearch(undefined, 10, undefined);
          lastWSCategory.current = retryWS.category;
          setWSGame(retryWS);
        } else {
          lastWSCategory.current = newWS.category;
          setWSGame(newWS);
        }
        setWLGame(null);
        setGame(null);
      } else if (mode === 'WORDLADDER') {
        const newWL = generateWordLadder();
        setWLGame(newWL);
        setWSGame(null);
        setGame(null);
      }
    } catch (err) {
      console.error(err);
      setFeedback("Error generating puzzle. Try again.");
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  // Rehydration Effect
  useEffect(() => {
    const init = async () => {
      try {
        await StorageService.init();
        const savedCipher = await StorageService.load('current-cipher');
        const savedDaily = await StorageService.load('daily-cipher');
        const savedWS = await StorageService.load('current-wordsearch');
        const savedWL = await StorageService.load('current-wordladder');
        
        if (mode === 'DAILY_CIPHER' && savedDaily) {
          setGame(savedDaily);
          setFocusedId(savedDaily.cells.find((c: any) => !c.isPunctuation)?.id || null);
        } else if (savedCipher) {
          setGame(savedCipher);
          setFocusedId(savedCipher.cells.find((c: any) => !c.isPunctuation)?.id || null);
        }

        if (savedWS) {
          setWSGame(savedWS);
        }

        if (savedWL) {
          setWLGame(savedWL);
        }
        
        isRehydrating.current = false;

        // If no game exists and we aren't loading, start one if not in LOBBY
        if (!savedCipher && !savedWS && !savedWL && mode !== 'LOBBY') {
          startNewGame();
        }
      } catch (err) {
        console.error('Failed to load saved state:', err);
        isRehydrating.current = false;
        startNewGame();
      }
    };
    init();
  }, []); // Run once on mount

  useEffect(() => {
    localStorage.setItem('cipher-quest-mode', mode);
    if (!isRehydrating.current) {
      startNewGame();
    }
  }, [mode, startNewGame]); // Also trigger on mode change

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
      setStats(prev => {
        const newStats = { ...prev, puzzlesCompleted: prev.puzzlesCompleted + 1 };
        if (mode === 'DAILY_CIPHER') {
          newStats.dailyCompletedDate = new Date().toISOString().split('T')[0];
        }
        return newStats;
      });
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
      setStats(prev => {
        const newStats = { ...prev, puzzlesCompleted: prev.puzzlesCompleted + 1 };
        if (mode === 'DAILY_CIPHER') {
          newStats.dailyCompletedDate = new Date().toISOString().split('T')[0];
        }
        return newStats;
      });
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

  const isDailyCompleted = stats.dailyCompletedDate === new Date().toISOString().split('T')[0];

  return (
    <div className={`h-[100dvh] flex flex-col bg-bg-app select-none overflow-hidden pb-[env(safe-area-inset-bottom)] touch-none ${theme}`}>
      {/* Header */}
      <header className="px-4 md:px-10 py-2 md:py-3 flex items-center justify-between border-b border-border bg-surface shrink-0 z-20 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setMode('LOBBY')}
            className={`text-lg md:text-xl font-extrabold tracking-tighter cursor-pointer hover:opacity-80 transition-opacity ${mode === 'DAILY_CIPHER' ? 'text-success' : 'text-accent'}`}
          >
            WordQuest
          </button>
          {mode !== 'LOBBY' && (
            <div className="flex bg-bg-app rounded-lg p-1 border border-border">
              <button 
                onClick={() => setMode('CIPHER')}
                className={`px-3 py-1 text-[10px] md:text-xs font-bold rounded-md transition-all ${mode === 'CIPHER' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-secondary'}`}
              >
                Cipher
              </button>
              <button 
                onClick={() => setMode('DAILY_CIPHER')}
                className={`px-3 py-1 text-[10px] md:text-xs font-bold rounded-md transition-all ${mode === 'DAILY_CIPHER' ? 'bg-success text-white shadow-sm' : 'text-muted hover:text-secondary'}`}
              >
                Daily
              </button>
              <button 
                onClick={() => setMode('WORDSEARCH')}
                className={`px-3 py-1 text-[10px] md:text-xs font-bold rounded-md transition-all ${mode === 'WORDSEARCH' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-secondary'}`}
              >
                Search
              </button>
              <button 
                onClick={() => setMode('WORDLADDER')}
                className={`px-3 py-1 text-[10px] md:text-xs font-bold rounded-md transition-all ${mode === 'WORDLADDER' ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-secondary'}`}
              >
                Ladder
              </button>
            </div>
          )}
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
          {mode !== 'LOBBY' && (
            <>
              <button
                onClick={() => startNewGame(false)}
                disabled={isLoading}
                className="btn-base px-3 h-9 md:h-10 border border-border bg-surface text-secondary hover:bg-bg-app flex items-center gap-1.5 disabled:opacity-50 text-xs md:text-sm"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">New Game</span>
              </button>
              {(mode === 'CIPHER' || mode === 'DAILY_CIPHER') && (
                <button
                  onClick={giveHint}
                  disabled={isLoading || game?.isSolved}
                  className="btn-base px-3 h-9 md:h-10 bg-accent text-white hover:bg-accent/90 flex items-center gap-1.5 disabled:opacity-50 text-xs md:text-sm"
                >
                  <Lightbulb size={14} />
                  Hint
                </button>
              )}
              {mode !== 'WORDLADDER' && (
                <button
                  onClick={() => setShowCategories(true)}
                  disabled={isLoading}
                  className="btn-base px-3 h-9 md:h-10 border border-accent text-accent hover:bg-accent-light flex items-center gap-1.5 disabled:opacity-50 text-xs md:text-sm"
                >
                  <Brain size={14} />
                  AI <span className="hidden sm:inline">Puzzle</span>
                </button>
              )}
            </>
          )}
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
                {((mode === 'CIPHER' || mode === 'DAILY_CIPHER') ? [
                  { id: 'Quote', icon: Quote, label: 'Quotes' },
                  { id: 'Movie Title', icon: Film, label: 'Movies' },
                  { id: 'Song Title', icon: Music, label: 'Songs' },
                  { id: 'Fun Fact', icon: FactIcon, label: 'Facts' },
                ] : [
                  { id: 'Animals', icon: PawPrint, label: 'Animals' },
                  { id: 'Space', icon: Rocket, label: 'Space' },
                  { id: 'Countries', icon: Globe, label: 'Geography' },
                  { id: 'Technology', icon: Cpu, label: 'Tech' },
                  { id: 'Cuisine', icon: Utensils, label: 'Food' },
                  { id: 'History', icon: Scroll, label: 'History' },
                ]).map((cat) => (
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
      <main className="flex-1 min-h-0 flex flex-col p-3 md:p-8 gap-3 md:gap-6 max-w-[1024px] mx-auto w-full box-border overflow-y-auto">
        {/* Stats Bar Container */}
        {((mode === 'CIPHER' || mode === 'DAILY_CIPHER') && game || (mode === 'WORDSEARCH' && wsGame) || (mode === 'WORDLADDER' && wlGame)) && (
          <div className="flex flex-col gap-2 shrink-0">
            <div className="flex items-center bg-surface border border-border px-2 py-1.5 md:px-5 md:py-2 rounded-lg shadow-sm gap-2 md:gap-3 overflow-hidden">
              <div className="flex items-center gap-2 md:gap-5 min-w-0 flex-1">
                {mode === 'DAILY_CIPHER' && game && (
                  <>
                    <div className="flex items-center gap-1 whitespace-nowrap text-success">
                      <Check size={12} className="text-success" />
                      <span className="text-[10px] md:text-xs font-bold">Daily Challenge</span>
                    </div>
                    <div className="w-px h-3 bg-border shrink-0" />
                  </>
                )}

                {mode === 'CIPHER' && game && (
                  <>
                    <div className="flex items-center gap-1 whitespace-nowrap text-secondary">
                      <KeyRound size={12} className="text-accent" />
                      <span className="text-[10px] md:text-xs font-bold">Cipher</span>
                    </div>
                    <div className="w-px h-3 bg-border shrink-0" />
                  </>
                )}

                {mode === 'WORDSEARCH' && wsGame && (
                  <>
                    <div className="flex items-center gap-1 whitespace-nowrap text-secondary">
                      <Search size={12} className="text-accent" />
                      <span className="text-[10px] md:text-xs font-bold">Search</span>
                    </div>
                    <div className="w-px h-3 bg-border shrink-0" />
                  </>
                )}

                {mode === 'WORDLADDER' && wlGame && (
                  <>
                    <div className="flex items-center gap-1 whitespace-nowrap text-secondary">
                      <Layers size={14} className="text-accent" />
                      <span className="text-[10px] md:text-xs font-bold">Ladder</span>
                    </div>
                    <div className="w-px h-3 bg-border shrink-0" />
                  </>
                )}
                
                {/* Dynamic Source/Category Label */}
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <span className="text-[8px] md:text-[9px] uppercase font-bold text-muted hidden sm:inline text-nowrap">
                    {(mode === 'CIPHER' || mode === 'DAILY_CIPHER') && game ? (
                      game.category === 'Movie Title' ? 'Movie:' : 
                      game.category === 'Song Title' ? 'Artist:' : 
                      game.category === 'Fun Fact' ? 'Facts:' : 'Author:'
                    ) : 'Topic:'}
                  </span>
                  <span className="text-[10px] md:text-xs font-bold text-secondary truncate italic">
                    "{(mode === 'CIPHER' || mode === 'DAILY_CIPHER') ? game?.author : (mode === 'WORDSEARCH' ? wsGame?.category : `${wlGame?.startWord} → ${wlGame?.endWord}`)}"
                  </span>
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
            {mode === 'LOBBY' ? (
              <motion.div
                key="lobby"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col items-center py-6 md:py-12 px-4"
              >
                <div className="text-center mb-12">
                  <h2 className="text-5xl font-black tracking-tighter text-primary mb-3">CHOOSE YOUR QUEST</h2>
                  <p className="text-secondary uppercase tracking-[0.3em] text-xs font-bold opacity-60">Daily brain challenges & training</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-6xl">
                  {/* Daily Challenge Card */}
                  <button 
                    onClick={() => setMode('DAILY_CIPHER')}
                    className="group bg-surface border-2 border-success/30 p-5 rounded-[1.5rem] hover:border-success hover:shadow-xl hover:shadow-success/5 transition-all text-left flex flex-col h-full relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-3">
                      {isDailyCompleted ? (
                        <div className="bg-success text-white p-1 rounded-full"><Check size={14} strokeWidth={4} /></div>
                      ) : (
                        <div className="bg-success/20 text-success text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">LIVE</div>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center text-success mb-4 group-hover:scale-110 transition-transform">
                      <Quote size={24} />
                    </div>
                    <h3 className="text-xl font-black text-primary mb-1">Daily Quest</h3>
                    <p className="text-xs text-muted mb-4 flex-1">A unique cryptic quote for everyone today. Can you solve it first?</p>
                    <div className="flex items-center gap-2 text-success font-bold text-[10px] uppercase tracking-widest bg-success/5 self-start px-3 py-1.5 rounded-full">
                      {isDailyCompleted ? 'Review Result' : 'Play Challenge'} <ArrowRight size={12} />
                    </div>
                  </button>

                  {/* Cipher Card */}
                  <button 
                    onClick={() => setMode('CIPHER')}
                    className="group bg-surface border border-border p-5 rounded-[1.5rem] hover:border-accent hover:shadow-xl hover:shadow-accent/5 transition-all text-left flex flex-col h-full"
                  >
                    <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-accent mb-4 group-hover:scale-110 transition-transform">
                      <KeyRound size={24} />
                    </div>
                    <h3 className="text-xl font-black text-primary mb-1">Crypto Cipher</h3>
                    <p className="text-xs text-muted mb-4 flex-1">Decode famous quotes and fun facts using logical deduction. A true classic.</p>
                    <div className="flex items-center gap-2 text-accent font-bold text-[10px] uppercase tracking-widest bg-accent/5 self-start px-3 py-1.5 rounded-full">
                      Start Decoding <ArrowRight size={12} />
                    </div>
                  </button>

                  {/* Word Search Card */}
                  <button 
                    onClick={() => setMode('WORDSEARCH')}
                    className="group bg-surface border border-border p-5 rounded-[1.5rem] hover:border-accent hover:shadow-xl hover:shadow-accent/5 transition-all text-left flex flex-col h-full"
                  >
                    <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center text-success mb-4 group-hover:scale-110 transition-transform">
                      <Search size={24} />
                    </div>
                    <h3 className="text-xl font-black text-primary mb-1">Word Search</h3>
                    <p className="text-xs text-muted mb-4 flex-1">Find hidden words in the grid. Thousands of categories powered by AI intelligence.</p>
                    <div className="flex items-center gap-2 text-success font-bold text-[10px] uppercase tracking-widest bg-success/5 self-start px-3 py-1.5 rounded-full">
                      Find Words <ArrowRight size={12} />
                    </div>
                  </button>

                  {/* Word Ladder Card */}
                  <button 
                    onClick={() => setMode('WORDLADDER')}
                    className="group bg-surface border border-border p-5 rounded-[1.5rem] hover:border-accent hover:shadow-xl hover:shadow-accent/5 transition-all text-left flex flex-col h-full"
                  >
                    <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500 mb-4 group-hover:scale-110 transition-transform">
                      <Layers size={24} />
                    </div>
                    <h3 className="text-xl font-black text-primary mb-1">Word Ladder</h3>
                    <p className="text-xs text-muted mb-4 flex-1">Transform one word into another by changing a single letter at each step.</p>
                    <div className="flex items-center gap-2 text-red-500 font-bold text-[10px] uppercase tracking-widest bg-red-500/5 self-start px-3 py-1.5 rounded-full">
                      Climb Now <ArrowRight size={12} />
                    </div>
                  </button>
                </div>

                <div className="mt-16 flex items-center gap-8 grayscale opacity-40">
                  <div className="flex items-center gap-2 font-black text-xl italic tracking-tighter">
                    <Brain className="text-primary" size={24} />
                    MINDSET
                  </div>
                  <div className="flex items-center gap-2 font-black text-xl italic tracking-tighter">
                    <Trophy className="text-primary" size={24} />
                    LOGIC
                  </div>
                </div>
              </motion.div>
            ) : (mode === 'CIPHER' || mode === 'DAILY_CIPHER') ? (
              game ? (
                <motion.div
                  key={game.quote}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex-1 flex flex-col min-h-0"
                >
                  <div className="bg-surface border border-border rounded-xl shadow-md flex-1 overflow-auto relative group flex flex-col min-h-0">
                    <div className="flex-1 min-h-0 overflow-auto relative group">
                      {/* Floating Zoom Controls */}
                      <div className="absolute bottom-4 right-4 z-40 flex flex-col items-center bg-surface/90 backdrop-blur-sm border border-border shadow-lg rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setPuzzleScale(s => Math.min(s + 0.1, 2.0))}
                          className="p-2 hover:bg-bg-app rounded-full text-accent transition-colors"
                          title="Zoom In"
                        >
                          <ZoomIn size={20} />
                        </button>
                        <button 
                          onClick={() => setPuzzleScale(1)}
                          className="px-2 py-1 text-[10px] hover:bg-bg-app rounded-lg text-secondary transition-colors font-bold border-y border-border my-1"
                          title="Reset Zoom"
                        >
                          {Math.round(puzzleScale * 100)}%
                        </button>
                        <button 
                          onClick={() => setPuzzleScale(s => Math.max(s - 0.1, 0.5))}
                          className="p-2 hover:bg-bg-app rounded-full text-accent transition-colors"
                          title="Zoom Out"
                        >
                          <ZoomOut size={20} />
                        </button>
                      </div>

                      <div 
                        className="min-h-full min-w-full p-4 md:p-10 flex flex-col items-center justify-center transition-transform duration-200 ease-out"
                        style={{ 
                          transform: `scale(${puzzleScale})`, 
                          transformOrigin: 'center center',
                          margin: 'auto'
                        }}
                      >
                        <PuzzleGrid
                          cells={game.cells}
                          selectedNumber={selectedNumber}
                          focusedId={focusedId}
                          onCellClick={handleCellClick}
                          checkStatus={checkStatus}
                        />
                      </div>
                    </div>
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
                      <div className="mt-8 flex flex-col sm:flex-row gap-3">
                        {mode === 'DAILY_CIPHER' ? (
                          <button
                            onClick={() => setMode('LOBBY')}
                            className="btn-base bg-secondary text-white hover:bg-secondary/90 h-11 px-8 flex items-center justify-center gap-2 text-sm font-bold"
                          >
                            Back to Lobby
                          </button>
                        ) : (
                          <button
                            onClick={() => startNewGame(false)}
                            disabled={isLoading}
                            className="btn-base bg-secondary text-white hover:bg-secondary/90 h-11 px-8 flex items-center justify-center gap-2 disabled:opacity-50 text-sm font-bold"
                          >
                            {isLoading && <RefreshCw size={14} className="animate-spin" />}
                            Next Standard
                          </button>
                        )}
                        <button
                          onClick={() => setShowCategories(true)}
                          disabled={isLoading}
                          className="btn-base bg-accent text-white hover:bg-accent/90 h-11 px-8 flex items-center justify-center gap-2 disabled:opacity-50 text-sm font-bold"
                        >
                          <Brain size={14} />
                          AI Challenge
                        </button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ) : null
            ) : mode === 'WORDSEARCH' ? (
              wsGame ? (
                <motion.div
                  key="wordsearch-view"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex-1 flex flex-col min-h-0 overflow-auto"
                >
                  <WordSearch 
                    gameState={wsGame} 
                    onSolve={() => {
                      setWSGame(prev => prev ? { ...prev, isSolved: true } : null);
                      setStats(s => ({ ...s, puzzlesCompleted: s.puzzlesCompleted + 1 }));
                    }}
                    onNewGame={() => startNewGame(false)}
                    onUpdate={(grid, words) => {
                      setWSGame(prev => prev ? { ...prev, grid, words } : null);
                    }}
                  />
                </motion.div>
              ) : null
            ) : mode === 'WORDLADDER' ? (
              wlGame ? (
                 <motion.div
                  key="wordladder-view"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="flex-1 flex flex-col min-h-0 overflow-auto"
                >
                  <WordLadder
                    gameState={wlGame}
                    onSolve={() => {
                      setWLGame(prev => prev ? { ...prev, isSolved: true } : null);
                      setStats(s => ({ ...s, puzzlesCompleted: s.puzzlesCompleted + 1 }));
                    }}
                    onNewGame={() => startNewGame(false)}
                    onUpdate={(steps) => {
                      setWLGame(prev => prev ? { ...prev, steps } : null);
                    }}
                  />
                </motion.div>
              ) : null
            ) : null}
            
            {((mode === 'CIPHER' && !game) || (mode === 'DAILY_CIPHER' && !game) || (mode === 'WORDSEARCH' && !wsGame) || (mode === 'WORDLADDER' && !wlGame)) && mode !== 'LOBBY' && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-secondary font-medium font-mono text-sm uppercase tracking-widest italic animate-pulse">Compiling Puzzle...</p>
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
      {(mode === 'CIPHER' || mode === 'DAILY_CIPHER') && !game?.isSolved && (
        <Keyboard
          onKey={updateGuess}
          onDelete={removeGuess}
        />
      )}
    </div>
  );
}
