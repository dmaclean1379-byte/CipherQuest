/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PuzzleCell, CipherMap, GameState } from '../types';
import { DEFAULT_QUOTES } from '../data/quotes';
export { DEFAULT_QUOTES };

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Simple deterministic PRNG for daily puzzles
function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  const random = () => {
    h = h * 1664525 + 1013904223 | 0;
    return (h >>> 0) / 4294967296;
  };
  return random;
}

export function generateCipherMap(seed?: string): CipherMap {
  const rng = seed ? seededRandom(seed) : Math.random;
  const shuffled = [...ALPHABET].sort(() => (seed ? rng() : Math.random()) - 0.5);
  const map: CipherMap = {};
  ALPHABET.forEach((letter) => {
    const cipherIndex = shuffled.indexOf(letter) + 1;
    map[letter] = cipherIndex;
  });
  return map;
}

export function getDailyQuote(): { text: string; author: string } {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const rng = seededRandom(today);
  const index = Math.floor(rng() * DEFAULT_QUOTES.length);
  return DEFAULT_QUOTES[index];
}

export function createPuzzle(quote: string, author: string, category: string = "Quote", seed?: string): GameState {
  const cipherMap = generateCipherMap(seed);
  const cells: PuzzleCell[] = [];
  const upperQuote = quote.toUpperCase();

  for (let i = 0; i < upperQuote.length; i++) {
    const char = upperQuote[i];
    const isLetter = /[A-Z]/.test(char);
    
    cells.push({
      id: `cell-${i}`,
      realLetter: char,
      number: isLetter ? cipherMap[char] : 0,
      userGuess: isLetter ? '' : char,
      isPunctuation: !isLetter,
    });
  }

  return {
    cells,
    quote,
    author,
    category,
    difficulty: quote.length < 50 ? 'Easy' : quote.length < 100 ? 'Medium' : 'Hard',
    isSolved: false,
    startTime: Date.now(),
    endTime: null,
  };
}
