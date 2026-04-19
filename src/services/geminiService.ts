/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function generateAIQuote(): Promise<{ text: string; author: string }> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Generate a short, inspiring, or funny quote for a cryptogram game. The quote should be between 30 and 120 characters. Return only a JSON object like { \"text\": \"Quote here\", \"author\": \"Author Name\" }.",
      config: {
        responseMimeType: "application/json",
      }
    });

    const data = JSON.parse(response.text || '{}');
    return {
      text: data.text || "The journey of a thousand miles begins with one step.",
      author: data.author || "Lao Tzu"
    };
  } catch (error) {
    console.error("Failed to generate AI quote:", error);
    return {
      text: "The journey of a thousand miles begins with one step.",
      author: "Lao Tzu"
    };
  }
}
