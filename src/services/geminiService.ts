/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function generateAIWordList(category: string = "Words"): Promise<{ category: string; words: string[] } | null> {
  try {
    const prompt = `Generate a list of 8 unique and interesting words related to the category: "${category}".
    The words should be between 3 and 10 letters long.
    Return ONLY a JSON object: { "category": "Specific Theme Name", "words": ["WORD1", "WORD2", ...] }.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.8,
      }
    });

    const data = JSON.parse(response.text || '{}');
    if (!data.words || !Array.isArray(data.words)) return null;
    return {
      category: data.category || category,
      words: data.words.map((w: string) => w.toUpperCase().replace(/[^A-Z]/g, ''))
    };
  } catch (error) {
    console.error("Failed to generate AI word list:", error);
    return null;
  }
}

export async function generateAIQuote(category: string = "Quote"): Promise<{ text: string; author: string } | null> {
  try {
    const prompt = `CRITICAL: You are an expert at generating content for the following specific category: "${category}".

    STRICT CATEGORY RULES:
    1. If category is "Movie Title":
       - The 'text' MUST be the official title of a movie (e.g., "The Shawshank Redemption").
       - DO NOT provide quotes, monologues, or character names.
       - DO NOT provide commercial slogans, advertisements, or brand taglines.
       - The 'author' MUST be the Director or the Release Year.

    2. If category is "Song Title":
       - The 'text' MUST be the official title of a song (e.g., "Bohemian Rhapsody").
       - DO NOT provide song lyrics or album titles.
       - The 'author' MUST be the Artist or Band name.

    3. If category is "Quote":
       - The 'text' MUST be a spoken or written quote from a famous person or fictional character.
       - The 'author' MUST be the person who said it.

    4. If category is "Fun Fact":
       - The 'text' MUST be a surprising, true, and verifiable fact.
       - The 'author' MUST be a brief description of the fact's origin (e.g., "Nature Fact", "History Snippet").

    GENERAL CONSTRAINTS:
    - Text length: 25 to 80 characters (strictly enforced).
    - Creativity: Avoid the most common "cliché" entries (e.g., don't just pick "Star Wars" every time). Choose interesting, recognizable, but non-obvious entries.
    - Formatting: Return ONLY a valid JSON object.

    JSON Structure: { "text": "...", "author": "..." }`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.8, // Slightly lower for better instruction following while maintaining variety
      }
    });

    const data = JSON.parse(response.text || '{}');
    if (!data.text) return null;
    return {
      text: data.text,
      author: data.author || "Unknown"
    };
  } catch (error) {
    console.error("Failed to generate AI quote:", error);
    return null;
  }
}
