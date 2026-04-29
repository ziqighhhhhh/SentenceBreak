export interface BreakdownStep {
  pageNumber: number;
  english: string;
  chinese: string;
  label: string;
  explanation: string;
}

export interface SentenceBreakdown {
  sourceLabel: string;
  targetSentence: string;
  steps: BreakdownStep[];
  totalSentences: number;
  totalWords: number;
}
