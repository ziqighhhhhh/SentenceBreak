export function buildBreakdownPrompt(sentence: string): string {
  return `
    You are an expert English teacher creating concise Chinese learning cards for English long-sentence breakdowns.

    TARGET SENTENCE:
    "${sentence}"

    GOAL AND GRAMMAR BLOCKS PER STEP
    Turn the target sentence into a progressive card sequence for Chinese learners. The learner should first see the destination sentence, then a very simple base sentence, then rebuild the original sentence one learnable change at a time. Each step may also include focused vocabulary or phrase insights that help the learner understand external-reading style English.

    In addition, for EVERY step's english sentence, you must provide a "grammarBlocks" array that partitions the sentence into contiguous syntax chunks, each annotated with its grammatical role. This applies to all steps including the base sentence. The combined text of all grammarBlocks in a step must closely match that step's english sentence.

    For each grammar block:
    - "text": the exact text span
    - "role": one of "subject", "predicate", "object", "modifier", "adverbial", "complement", "connector", "other"
    - "roleLabel": a concise Chinese label, e.g. "主语", "谓语", "宾语", "定语", "状语", "补语", "连接词", "其它"

    Rules for grammar blocks:
    - Cover all meaningful words in the sentence, not just the main structure.
    - Use "other" for punctuation or text that does not fit any other role.
    - Keep blocks as contiguous spans of the sentence. Do not overlap or leave gaps.

    CORE WORKFLOW:
    1. Identify the final target sentence and infer a short source label when possible, such as "BBC 长难句", "经济学人长难句", "新闻长难句", "学术长难句", or "英语长难句".
    2. Reduce the target sentence to a very simple base sentence with the same core meaning or narrative role. Prefer Subject + verb + object/complement.
    3. Before writing the steps, plan the rebuild order. Preserve the final sentence's major clause skeleton early, then add local modifiers and details.
    4. Rebuild the target sentence one small change at a time. Each step should add, replace, move, or combine only one learnable element.
    5. Every step must include:
       - the current English sentence
       - a natural Chinese translation of the current English sentence
       - a numbered grammar/meaning label in concise Chinese
       - a short Chinese explanation of exactly what changed and why it matters
       - optional vocabularyInsights for difficult words, phrases, collocations, idioms, or familiar-word-unfamiliar-meaning cases introduced or made important in that step
    6. The final step must exactly match the target sentence.

    PAGE AND STEP DESIGN RULES:
    - Page 1 is represented by steps[0]. It must be the simple base sentence, not the final target sentence. The UI will show targetSentence separately before or near this base sentence.
    - Always make steps[0].chinese a direct Chinese translation of the base sentence.
    - The first breakdown step after the base sentence must also include a Chinese translation immediately.
    - Add only one meaningful difficulty per step: article, possessive, adjective, compound adjective, adverb, prepositional phrase, appositive, quote inversion, non-finite verb, modal verb, coordination, relative clause, fixed expression, or one comparable element.
    - Prefer semantic continuity over surface similarity. Do not keep vague placeholder verbs or clauses for many steps if the final verb or major clause can be introduced earlier.
    - Keep each Chinese explanation concrete: name the added, replaced, moved, or combined phrase and explain its function.
    - Use natural Chinese translations, not word-for-word translations.
    - Do not over-explain common grammar. One clear Chinese sentence is usually enough.

    VOCABULARY INSIGHT RULES:
    - Each step can include 0 to 3 vocabularyInsights.
    - Only include insights for expressions that materially affect comprehension in this sentence.
    - Prefer external-reading useful items: familiar words with context-specific meaning, high-frequency news verbs, fixed phrases, collocations, idioms, abstract nouns, and logic connectors.
    - Do not explain basic words unless their usage is unusual in context.
    - Do not repeat the same normalizedText + senseKey across steps.
    - If the same expression has a different meaning in context, keep it as a separate insight with a different senseKey.
    - Synonyms and antonyms must match the current context, not the generic dictionary meaning.
    - Return empty arrays for synonyms or antonyms when natural context-matched items are unavailable.
    - For single words, include phonetic when you are confident. For phrases and collocations, phonetic may be omitted, but pronunciationText should be included.
    - senseKey should be compact and stable, using normalizedText plus an English meaning label, such as "fuel concerns::intensify-concern".

    ORDERING HEURISTICS:
    1. Build the sentence spine first: main subject, main verb, core object/complement, and major connectors such as "but", "and", "because", "while", or dash appositives.
    2. For contrast sentences, introduce both sides of the contrast early. Do not spend many steps on only the first clause while the second clause remains vague.
    3. Replace vague placeholders quickly. A plain base sentence is fine, but the next steps should move toward the final action or clause skeleton.
    4. Add local modifiers after the relevant spine is stable: determiners, adjectives, adverbs, prepositional phrases, appositives, non-finite phrases, relative clauses, and fixed expressions.
    5. Split bundled modifiers when they teach different things.
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

    GRAMMAR ANATOMY:
    After building all steps, provide a "grammarAnatomy" array that breaks the FINAL target sentence into contiguous grammar blocks. Each block covers a contiguous span of text (no gaps, no overlaps) and the combined text of all blocks must exactly equal the target sentence.

    For each block, include:
    - "text": the exact text span from the target sentence
    - "role": one of "subject", "predicate", "object", "modifier", "adverbial", "complement", "connector", "other"
    - "roleLabel": a concise Chinese label for the role, e.g. "主语", "谓语", "宾语", "定语", "状语", "补语", "连接词", "其它"

    Also provide a short "anatomyNote" (1-2 Chinese sentences) pointing out the most notable structural feature of this sentence, such as a separated subject-verb pair, stacked modifiers, or a complex clause.

    If you cannot confidently produce a clean anatomy, return an empty array for grammarAnatomy.

    QUALITY CHECK BEFORE RETURNING:
    - The final step's english field must exactly match the target sentence.
    - Every step must be grammatical unless it is intentionally quoted source text.
    - The progression must not jump over a major phrase in the target sentence.
    - The order should feel motivated: readers understand the core event, contrast, or argument before dense modifiers.
    - Each chinese field must translate the current English sentence, not only the final sentence.
    - vocabularyInsights must be concise and context-specific.
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
          "explanation": "string",
          "grammarBlocks": [
            {
              "text": "string",
              "role": "subject | predicate | object | modifier | adverbial | complement | connector | other",
              "roleLabel": "string"
            }
          ],
          "vocabularyInsights": [
            {
              "text": "string",
              "normalizedText": "string",
              "senseKey": "string",
              "type": "word | phrase | collocation | idiom | meaning-shift",
              "meaningInContext": "string",
              "dictionaryMeaning": "string",
              "usageNote": "string",
              "phonetic": "string",
              "pronunciationText": "string",
              "synonyms": ["string"],
              "antonyms": ["string"],
              "example": "string"
            }
          ]
        }
      ],
      "grammarAnatomy": [
        {
          "text": "string",
          "role": "subject | predicate | object | modifier | adverbial | complement | connector | other",
          "roleLabel": "string"
        }
      ],
      "anatomyNote": "string",
      "totalSentences": number,
      "totalWords": number
    }
  `;
}

export function buildComplexSentencePrompt(): string {
  return `
    Generate one original, sufficiently complex English long sentence for advanced Chinese learners to analyze.

    Requirements:
    - Return only one English sentence.
    - 45 to 75 words.
    - Include a clear main clause plus at least three learnable structures, such as a relative clause, appositive, participial phrase, contrast clause, prepositional phrase stack, or fronted context phrase.
    - Make the sentence sound like it could appear in BBC News, The Economist, an academic essay, or a serious magazine.
    - Do not include a Chinese translation.
    - Do not include explanations, labels, markdown, or quotation marks around the sentence.
  `;
}
