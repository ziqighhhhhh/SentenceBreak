import { GoogleGenerativeAI } from "@google/generative-ai";
import { SentenceBreakdown } from "../types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateBreakdown(sentence: string): Promise<SentenceBreakdown> {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  const prompt = `
    You are an expert English teacher specializing in deconstructing complex sentences for Chinese learners, specifically in the style of "Xiaohongshu" (Red) education content.
    
    TASK:
    Break down the following target English sentence into a progressive sequence of learning cards.
    
    TARGET SENTENCE: "${sentence}"
    
    RULES:
    1. Identify the source label (e.g., BBC News, The Economist, CET-4).
    2. Start with a very simple "base sentence" (Subject + Verb + Object).
    3. Rebuild the sentence one small change at a time (add one modifier, clause, or phrase per step).
    4. Each step must have:
       - English sentence
       - Natural Chinese translation
       - Grammatical label (e.g., 修饰成分, 复合句)
       - Concise Chinese explanation of what changed.
    5. The final step must reach the full target sentence.
    
    OUTPUT FORMAT:
    Return a JSON object matching this structure:
    {
      "sourceLabel": "string",
      "targetSentence": "string",
      "steps": [
        {
          "pageNumber": number,
          "english": "string",
          "chinese": "string",
          "label": "string",
          "explanation": "string"
        }
      ],
      "totalSentences": number,
      "totalWords": number
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text());
  } catch (error) {
    console.error("AI Error:", error);
    throw new Error("Failed to generate breakdown. Please check your API key or input.");
  }
}
