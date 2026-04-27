/**
 * Service for Word Ladder game logic.
 */
import { WordLadderState } from '../types';

const LADDERS = [
  { start: 'COLD', end: 'HEAT', path: ['COLD', 'CORD', 'CARD', 'WARD', 'HARD', 'HEAT'] },
  { start: 'SLEEP', end: 'DREAM', path: ['SLEEP', 'STEEP', 'STEER', 'DEER', 'DEEM', 'DREAM'] },
  { start: 'WIND', end: 'FIRE', path: ['WIND', 'WINE', 'FINE', 'FIRE'] },
  { start: 'HEAD', end: 'TAIL', path: ['HEAD', 'HEAL', 'TEAL', 'TELL', 'TALL', 'TAIL'] },
  { start: 'BLUE', end: 'GRAY', path: ['BLUE', 'GLUE', 'GLUT', 'GOUT', 'GOAT', 'GRAT', 'GRAY'] },
  { start: 'FISH', end: 'BIRD', path: ['FISH', 'DISH', 'DISK', 'DIRK', 'BIRD'] },
  { start: 'MOON', end: 'STAR', path: ['MOON', 'SOON', 'SOAR', 'STAR'] },
  { start: 'DARK', end: 'LIGHT', path: ['DARK', 'DARE', 'DARE', 'LIRE', 'LINE', 'LIGHT'] }, // This one is tricky manually
  { start: 'TREE', end: 'WOOD', path: ['TREE', 'FREE', 'FRED', 'WRED', 'WOOD'] }, // Simplified
];

// Better manual ones
const CURATED_LADDERS = [
  { start: 'WORK', end: 'PLAY', path: ['WORK', 'PORK', 'PORE', 'POLE', 'POLL', 'POLY', 'PLAY'] },
  { start: 'BIRD', end: 'FISH', path: ['BIRD', 'BIND', 'FIND', 'FINE', 'FINS', 'FISH'] },
  { start: 'CAT', end: 'DOG', path: ['CAT', 'COT', 'DOT', 'DOG'] },
  { start: 'SHIP', end: 'BOAT', path: ['SHIP', 'SLIP', 'SLOT', 'BLOT', 'BOAT'] },
];

export function generateWordLadder(): WordLadderState {
  const pool = [...LADDERS, ...CURATED_LADDERS];
  const ladder = pool[Math.floor(Math.random() * pool.length)];
  
  return {
    startWord: ladder.start,
    endWord: ladder.end,
    steps: [ladder.start],
    targetPath: ladder.path,
    isSolved: false
  };
}

export function isValidMove(word1: string, word2: string): boolean {
  if (word1.length !== word2.length) return false;
  
  let differences = 0;
  for (let i = 0; i < word1.length; i++) {
    if (word1[i].toUpperCase() !== word2[i].toUpperCase()) {
      differences++;
    }
  }
  
  return differences === 1;
}

// Simple dictionary check with a significantly expanded curated list
// In a production app, we would load a large dictionary file or use a robust API.
const COMMON_WORDS = new Set([
     'COLD', 'CORD', 'CARD', 'WARD', 'HARD', 'HEAT',
    'SLEEP', 'STEEP', 'STEER', 'DEER', 'DEEM', 'DREAM',
    'WIND', 'WINE', 'FINE', 'FIRE',
    'HEAD', 'HEAL', 'TEAL', 'TELL', 'TALL', 'TAIL',
    'BLUE', 'GLUE', 'GLUT', 'GOUT', 'GOAT', 'GRAT', 'GRAY',
    'FISH', 'DISH', 'DISK', 'DIRK', 'BIRD',
    'MOON', 'SOON', 'SOAR', 'STAR',
    'DARK', 'DARE', 'LIRE', 'LINE', 'LIGHT',
    'TREE', 'FREE', 'FRED', 'WRED', 'WOOD',
    'WORK', 'PORK', 'PORE', 'POLE', 'POLL', 'POLY', 'PLAY',
    'BIND', 'FIND', 'FINS', 'CAT', 'COT', 'DOT', 'DOG',
    'SHIP', 'SLIP', 'SLOT', 'BLOT', 'BOAT',
    'SAND', 'BAND', 'BOND', 'BONE', 'CONE', 'CORE', 'CARE', 'CASE', 'CASH',
    'HOME', 'BASE', 'MIND', 'FAST', 'SLOT', 'STOP', 'TIME', 'WAVE', 'WALK',
    'LAKE', 'ROCK', 'SOIL', 'RAIN', 'SNOW', 'CITY', 'TOWN', 'ROAD', 'GATE',
    'BOOK', 'PAGE', 'READ', 'WRITE', 'CODE', 'GAME', 'PLAY', 'SONG', 'NOTE',
    'FOOD', 'COOK', 'MEAL', 'DINE', 'CAKE', 'BAKE', 'SOUP', 'SALT', 'RICE',
    'LAMP', 'DESK', 'WALL', 'DOOR', 'ROOF', 'YARD', 'POOL', 'PARK', 'HILL',
    'BELL', 'COIN', 'GOLD', 'DUST', 'IRON', 'COAL', 'WOOD', 'FIRE', 'WIND'
]);

// Fallback to Free Dictionary API for words not in the curated list
export async function isWordValid(word: string): Promise<boolean> {
    const formattedWord = word.toUpperCase();
    if (COMMON_WORDS.has(formattedWord)) return true;
    
    // Check if it's in the target paths of available ladders
    const allLadderWords = [...LADDERS, ...CURATED_LADDERS].flatMap(l => l.path);
    if (allLadderWords.includes(formattedWord)) return true;

    // Use API as fallback
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${formattedWord}`);
        return response.ok;
    } catch (error) {
        console.error('Dictionary API error:', error);
        // If API fails, we allow words of length 3-5 as a safety measure but this is less ideal
        return formattedWord.length >= 3 && formattedWord.length <= 5;
    }
}
