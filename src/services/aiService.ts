import { GoogleGenerativeAI } from "@google/generative-ai";
import { SentenceBreakdown } from "../types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateBreakdown(sentence: string): Promise<SentenceBreakdown> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const prompt = `
    You are an expert English teacher creating Xiaohongshu-style Chinese learning cards for English long-sentence breakdowns.

    TARGET SENTENCE:
    "${sentence}"

    GOAL:
    Turn the target sentence into a progressive card sequence for Chinese learners. The learner should first see the destination sentence, then a very simple base sentence, then rebuild the original sentence one learnable change at a time.

    CORE WORKFLOW:
    1. Identify the final target sentence and infer a short source label when possible, such as "BBC 长难句", "经济学人长难句", "考研长难句", "六级长难句", "新闻长难句", or "英语长难句".
    2. Reduce the target sentence to a very simple base sentence with the same core meaning or narrative role. Prefer Subject + verb + object/complement.
    3. Before writing the steps, plan the rebuild order. Preserve the final sentence's major clause skeleton early, then add local modifiers and details.
    4. Rebuild the target sentence one small change at a time. Each step should add, replace, move, or combine only one learnable element.
    5. Every step must include:
       - the current English sentence
       - a natural Chinese translation of the current English sentence
       - a numbered grammar/meaning label in concise Chinese
       - a short Chinese explanation of exactly what changed and why it matters
    6. The final step must exactly match the target sentence.

    PAGE AND STEP DESIGN RULES:
    - Page 1 is represented by steps[0]. It must be the simple base sentence, not the final target sentence. The UI will show targetSentence separately before or near this base sentence.
    - Always make steps[0].chinese a direct Chinese translation of the base sentence.
    - The first breakdown step after the base sentence must also include a Chinese translation immediately.
    - Add only one meaningful difficulty per step: article, possessive, adjective, compound adjective, adverb, prepositional phrase, appositive, quote inversion, non-finite verb, modal verb, coordination, relative clause, fixed expression, or one comparable element.
    - Prefer semantic continuity over surface similarity. Do not keep vague placeholder verbs or clauses for many steps if the final verb or major clause can be introduced earlier.
    - Keep each Chinese explanation concrete: name the added, replaced, moved, or combined phrase and explain its function.
    - Use natural Chinese translations, not word-for-word translations.
    - When a word or phrase may block comprehension, include a compact vocabulary note inside the explanation before the grammar point.
    - Do not over-explain common grammar. One clear Chinese sentence is usually enough.

    ORDERING HEURISTICS:
    1. Build the sentence spine first: main subject, main verb, core object/complement, and major connectors such as "but", "and", "because", "while", or dash appositives.
    2. For contrast sentences, introduce both sides of the contrast early. Do not spend many steps on only the first clause while the second clause remains vague.
    3. Replace vague placeholders quickly. A plain base sentence is fine, but the next steps should move toward the final action or clause skeleton.
    4. Add local modifiers after the relevant spine is stable: determiners, adjectives, adverbs, prepositional phrases, appositives, non-finite phrases, relative clauses, and fixed expressions.
    5. Split bundled modifiers when they teach different things. For example, separate a possessive, a compound adjective, and a following participle phrase if the sentence allows.
    6. Add purpose/result phrases after the action they explain.
    7. Add fronted time, place, or context phrases after the main clause is understandable.
    8. For direct quotes, first build normal speech order if useful, then move the quote to the front and add speaker identity details step by step.

    LABEL STYLE:
    Use concise Chinese labels. Good examples include:
    - "1 基础句"
    - "2 修饰成分"
    - "3 介词短语"
    - "4 名词所有格"
    - "5 复合形容词"
    - "6 非谓语"
    - "7 并列结构"
    - "8 复合句"
    - "9 非限制性定语从句"
    - "10 固定搭配"

    QUALITY CHECK BEFORE RETURNING:
    - The final step's english field must exactly match the target sentence.
    - Every step must be grammatical unless it is intentionally quoted source text.
    - The progression must not jump over a major phrase in the target sentence.
    - The order should feel motivated: readers understand the core event, contrast, or argument before dense modifiers.
    - Each chinese field must translate the current English sentence, not only the final sentence.
    - The tone should be concise Xiaohongshu learning copy, not a long textbook lecture.
    - Return valid JSON only. Do not wrap it in markdown.

    OUTPUT FORMAT:
    Return a JSON object matching this exact structure:
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
