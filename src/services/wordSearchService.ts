/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WordSearchState, WordSearchCell, WordToFind } from '../types';

const THEMES: Record<string, string[]> = {
  'Planets': ['MERCURY', 'VENUS', 'EARTH', 'MARS', 'JUPITER', 'SATURN', 'URANUS', 'NEPTUNE'],
  'Fruits': ['APPLE', 'BANANA', 'CHERRY', 'ORANGE', 'GRAPE', 'MANGO', 'PEAR', 'PEACH'],
  'Colors': ['RED', 'GREEN', 'BLUE', 'YELLOW', 'PURPLE', 'ORANGE', 'BLACK', 'WHITE'],
  'Animals': ['LION', 'TIGER', 'ELEPHANT', 'GIRAFFE', 'ZEBRA', 'MONKEY', 'PANDA', 'KOALA'],
  'Nature': ['MOUNTAIN', 'OCEAN', 'FOREST', 'DESERT', 'VALLEY', 'RIVER', 'ISLAND', 'JUNGLE'],
  'Space': ['GALAXY', 'NEBULA', 'COMET', 'ASTEROID', 'METEOR', 'QUASAR', 'PULSAR', 'ORBIT'],
  'Ocean Life': ['SHARK', 'WHALE', 'DOLPHIN', 'TURTLE', 'OCTOPUS', 'CORAL', 'SHRIMP', 'LOBSTER'],
  'Technology': ['COMPUTER', 'INTERNET', 'SOFTWARE', 'HARDWARE', 'NETWORK', 'ROBOT', 'CAMERA', 'MOBILE'],
  'Instruments': ['GUITAR', 'PIANO', 'VIOLIN', 'DRUMS', 'FLUTE', 'TRUMPET', 'CELLO', 'HARP'],
  'Countries': ['CANADA', 'BRAZIL', 'FRANCE', 'JAPAN', 'EGYPT', 'INDIA', 'ITALY', 'MEXICO'],
  'Gemstones': ['DIAMOND', 'RUBY', 'SAPPHIRE', 'EMERALD', 'PEARL', 'TOPAZ', 'OPAL', 'QUARTZ'],
  'Weather': ['THUNDER', 'LIGHTNING', 'TORNADO', 'BLIZZARD', 'RAINBOW', 'SUNSHINE', 'DRIZZLE', 'CYCLONE'],
  'Sports': ['SOCCER', 'TENNIS', 'HOCKEY', 'CRICKET', 'BOXING', 'RUGBY', 'KARATE', 'FENCING']
};

export function generateWordSearch(category?: string, gridSize: number = 10, customWords?: string[]): WordSearchState {
  const themeKey = category && THEMES[category] ? category : (customWords ? 'Custom' : Object.keys(THEMES)[Math.floor(Math.random() * Object.keys(THEMES).length)]);
  const wordsToPlace = customWords ? customWords : (THEMES[themeKey] ? THEMES[themeKey].map(w => w.toUpperCase()) : []);
  
  const grid: WordSearchCell[][] = Array(gridSize).fill(null).map((_, r) => 
    Array(gridSize).fill(null).map((_, c) => ({
      char: '',
      row: r,
      col: c,
      isFound: false
    }))
  );

  const placedWords: WordToFind[] = [];

  const directions = [
    { r: 0, c: 1 },   // Horizontal
    { r: 1, c: 0 },   // Vertical
    { r: 1, c: 1 },   // Diagonal Down
    { r: -1, c: 1 },  // Diagonal Up
  ];

  for (const word of wordsToPlace) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 100) {
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const startR = Math.floor(Math.random() * gridSize);
      const startC = Math.floor(Math.random() * gridSize);
      
      const endR = startR + dir.r * (word.length - 1);
      const endC = startC + dir.c * (word.length - 1);

      if (endR >= 0 && endR < gridSize && endC >= 0 && endC < gridSize) {
        // Check if can place
        let canPlace = true;
        for (let i = 0; i < word.length; i++) {
          const r = startR + dir.r * i;
          const c = startC + dir.c * i;
          if (grid[r][c].char !== '' && grid[r][c].char !== word[i]) {
            canPlace = false;
            break;
          }
        }

        if (canPlace) {
          for (let i = 0; i < word.length; i++) {
            const r = startR + dir.r * i;
            const c = startC + dir.c * i;
            grid[r][c].char = word[i];
          }
          placedWords.push({
            word,
            isFound: false,
            start: { r: startR, c: startC },
            end: { r: endR, c: endC }
          });
          placed = true;
        }
      }
      attempts++;
    }
  }

  // Fill empty spaces
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c].char === '') {
        grid[r][c].char = alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    }
  }

  return {
    grid,
    words: placedWords,
    category: themeKey,
    isSolved: false
  };
}
