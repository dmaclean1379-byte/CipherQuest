/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PuzzleCell, CipherMap, GameState } from '../types';
export { DEFAULT_QUOTES } from '../data/quotes';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function generateCipherMap(): CipherMap {
  const shuffled = [...ALPHABET].sort(() => Math.random() - 0.5);
  const map: CipherMap = {};
  ALPHABET.forEach((letter, index) => {
    // Map A-Z to a number between 1 and 26 based on shuffled index
    const cipherIndex = shuffled.indexOf(letter) + 1;
    map[letter] = cipherIndex;
  });
  return map;
}

export function createPuzzle(quote: string, author: string): GameState {
  const cipherMap = generateCipherMap();
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
    difficulty: quote.length < 50 ? 'Easy' : quote.length < 100 ? 'Medium' : 'Hard',
    isSolved: false,
    startTime: Date.now(),
    endTime: null,
  };
}
