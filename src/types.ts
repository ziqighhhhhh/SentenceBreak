export type VocabularyInsightType = 'word' | 'phrase' | 'collocation' | 'idiom' | 'meaning-shift';

export interface VocabularyInsight {
  text: string;
  normalizedText: string;
  senseKey: string;
  type: VocabularyInsightType;
  meaningInContext: string;
  dictionaryMeaning?: string;
  usageNote: string;
  phonetic?: string;
  pronunciationText?: string;
  synonyms?: string[];
  antonyms?: string[];
  example?: string;
}

export interface BreakdownStep {
  pageNumber: number;
  english: string;
  chinese: string;
  label: string;
  explanation: string;
  vocabularyInsights?: VocabularyInsight[];
}

export interface SentenceBreakdown {
  sourceLabel: string;
  targetSentence: string;
  steps: BreakdownStep[];
  totalSentences: number;
  totalWords: number;
}
