import React, { useState, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowDown, Check, X, RefreshCw, Undo2, HelpCircle } from 'lucide-react';
import { WordLadderState } from '../types';
import { isValidMove, isWordValid } from '../services/wordLadderService';

interface WordLadderProps {
  gameState: WordLadderState;
  onSolve: () => void;
  onNewGame: () => void;
  onUpdate: (steps: string[]) => void;
}

const WordLadder = memo(({ gameState, onSolve, onNewGame, onUpdate }: WordLadderProps) => {
  const [currentGuess, setCurrentGuess] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [gameState.steps]);

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    const word = currentGuess.trim().toUpperCase();
    
    if (word.length !== gameState.startWord.length) {
      setError(`Word must be ${gameState.startWord.length} letters long`);
      return;
    }

    const lastWord = gameState.steps[gameState.steps.length - 1];
    
    if (word === lastWord) return;

    if (!isValidMove(lastWord, word)) {
      setError('Only one letter can change at a time');
      return;
    }

    if (gameState.steps.includes(word)) {
      setError('Word already used');
      return;
    }

    setIsValidating(true);
    const valid = await isWordValid(word);
    setIsValidating(false);

    if (!valid) {
      setError('Not a recognized word');
      return;
    }

    const newSteps = [...gameState.steps, word];
    onUpdate(newSteps);
    setCurrentGuess('');
    setError(null);

    if (word === gameState.endWord) {
      onSolve();
    }
  };

  const undoLastStep = () => {
    if (gameState.steps.length > 1) {
      onUpdate(gameState.steps.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="flex items-center justify-between gap-8 mb-4">
          <div className="bg-surface border border-border px-6 py-4 rounded-2xl shadow-sm">
            <p className="text-xs uppercase tracking-widest text-muted mb-1 font-bold">Start</p>
            <p className="text-2xl font-black tracking-tighter text-primary">{gameState.startWord}</p>
          </div>
          <ArrowDown className="text-muted opacity-20" size={32} />
          <div className="bg-accent/10 border border-accent/20 px-6 py-4 rounded-2xl shadow-sm">
            <p className="text-xs uppercase tracking-widest text-accent mb-1 font-bold">Target</p>
            <p className="text-2xl font-black tracking-tighter text-accent">{gameState.endWord}</p>
          </div>
        </div>
        <p className="text-sm text-muted">Change one letter at a time to reach the destination.</p>
      </div>

      <div 
        ref={scrollRef}
        className="w-full bg-surface/30 border border-border/50 rounded-3xl p-6 mb-6 max-h-[400px] overflow-y-auto space-y-4 scroll-smooth"
      >
        <AnimatePresence initial={false}>
          {gameState.steps.map((word, idx) => (
            <motion.div
              key={`${word}-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-4 ${idx === 0 ? 'opacity-50' : ''}`}
            >
              <div className="flex-none w-8 h-8 rounded-full bg-border/20 flex items-center justify-center text-xs font-bold text-muted">
                {idx + 1}
              </div>
              <div className={`flex-1 py-3 px-5 rounded-2xl font-bold tracking-widest text-lg border transition-all ${
                word === gameState.endWord 
                  ? 'bg-success/10 border-success text-success shadow-[0_0_15px_rgba(34,197,94,0.1)]' 
                  : 'bg-surface border-border text-primary'
              }`}>
                {word}
              </div>
              {idx === gameState.steps.length - 1 && idx > 0 && !gameState.isSolved && (
                <button 
                  onClick={undoLastStep}
                  className="p-2 hover:bg-red-500/10 text-muted hover:text-red-500 rounded-lg transition-colors"
                  title="Undo last step"
                >
                  <Undo2 size={18} />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {!gameState.isSolved ? (
        <form onSubmit={handleAddWord} className="w-full space-y-4">
          <div className="relative">
            <input
              type="text"
              value={currentGuess}
              onChange={(e) => setCurrentGuess(e.target.value.toUpperCase())}
              placeholder={`Next word (${gameState.startWord.length} letters)...`}
              maxLength={gameState.startWord.length}
              className={`w-full bg-surface border-2 ${error ? 'border-red-500/50' : 'border-border'} rounded-2xl px-6 py-4 text-xl font-bold tracking-widest focus:outline-none focus:border-accent transition-all uppercase text-center`}
              autoFocus
            />
            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }} 
                animate={{ opacity: 1, y: 0 }}
                className="absolute -bottom-6 left-0 right-0 text-center text-xs font-bold text-red-500 uppercase tracking-tighter"
              >
                {error}
              </motion.p>
            )}
          </div>
          
          <div className="flex gap-3">
             <button
              type="submit"
              disabled={isValidating}
              className="flex-1 bg-primary text-bg-app py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isValidating ? 'Checking...' : 'Confirm Step'}
            </button>
            <button
               type="button"
               onClick={onNewGame}
               className="p-4 bg-surface border border-border text-muted hover:text-primary rounded-2xl transition-all"
               title="New Game"
            >
              <RefreshCw size={24} />
            </button>
          </div>
        </form>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full text-center space-y-6"
        >
          <div className="bg-success/10 border border-success/30 rounded-3xl p-8 shadow-xl">
            <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center mx-auto mb-4 text-white">
              <Check size={32} strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black text-success mb-2 tracking-tight">LADDER CLIMBED!</h3>
            <p className="text-secondary font-medium italic">You connected the words in {gameState.steps.length - 1} steps.</p>
          </div>
          
          <button
            onClick={onNewGame}
            className="w-full bg-accent text-white py-5 rounded-2xl font-bold uppercase tracking-[0.2em] hover:bg-accent/90 transition-all shadow-lg hover:shadow-accent/40 active:scale-95"
          >
            Play Another
          </button>
        </motion.div>
      )}
    </div>
  );
});

export default WordLadder;
