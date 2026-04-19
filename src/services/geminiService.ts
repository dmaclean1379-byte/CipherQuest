/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function generateAIQuote(category: string = "Quote"): Promise<{ text: string; author: string } | null> {
  try {
    const prompt = `Generate a short, interesting ${category} for a cryptogram game. 
    If category is "Quote", generate an inspiring or funny quote. 
    If category is "Movie Title", provide a famous movie title. 
    If category is "Song Title", provide a well-known song title.
    If category is "Fun Fact", provide a short surprising fact.
    The text should be between 30 and 120 characters. 
    Return only a JSON object like { "text": "Content here", "author": "Source/Category Name" }.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
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
