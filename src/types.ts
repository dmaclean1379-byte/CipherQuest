/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PuzzleCell {
  id: string;
  realLetter: string;    // The actual answer (e.g., 'T')
  number: number;        // The number representing the letter (1-26)
  userGuess: string;     // What the player typed
  isPunctuation: boolean; // true if it's space, comma, etc.
}

export interface CipherMap {
  [letter: string]: number;
}

export interface ReverseCipherMap {
  [number: number]: string;
}

export interface GameState {
  cells: PuzzleCell[];
  quote: string;
  author: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  isSolved: boolean;
  startTime: number | null;
  endTime: number | null;
}

export interface UserStats {
  puzzlesCompleted: number;
  totalHintsUsed: number;
}
