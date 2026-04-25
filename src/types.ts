/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameMode = 'CIPHER' | 'WORDSEARCH';

export interface PuzzleCell {
  id: string;
  realLetter: string;    // The actual answer (e.g., 'T')
  number: number;        // The number representing the letter (1-26)
  userGuess: string;     // What the player typed
  isPunctuation: boolean; // true if it's space, comma, etc.
}

export interface WordSearchCell {
  char: string;
  row: number;
  col: number;
  isFound: boolean;
}

export interface WordToFind {
  word: string;
  isFound: boolean;
  start?: { r: number; c: number };
  end?: { r: number; c: number };
}

export interface WordSearchState {
  grid: WordSearchCell[][];
  words: WordToFind[];
  category: string;
  isSolved: boolean;
}

export interface GameState {
  cells: PuzzleCell[];
  quote: string;
  author: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  isSolved: boolean;
  startTime: number | null;
  endTime: number | null;
}

export interface CipherMap {
  [letter: string]: number;
}

export interface UserStats {
  puzzlesCompleted: number;
  totalHintsUsed: number;
}
