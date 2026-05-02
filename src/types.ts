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

export type MasteryStatus = 'new' | 'reviewing' | 'mastered';

export type UserRole = 'admin' | 'user';

export interface AdminInviteCode {
  code: string;
  createdAt: string;
  createdByNickname: string;
}

export interface AdminUser {
  id: string;
  inviteCode: string;
  nickname: string;
  role: UserRole;
  createdAt: string;
  lastSeenAt: string;
}

export interface SavedLearningSession {
  id: string;
  sourceSentence: string;
  sourceLabel: string;
  totalWords: number;
  createdAt: string;
  completedAt: string | null;
  breakdown: SentenceBreakdown;
}

export interface SavedVocabularySense {
  id: string;
  senseKey: string;
  meaningInContext: string;
  dictionaryMeaning: string | null;
  usageNote: string;
  example: string | null;
  createdAt: string;
}

export interface SavedVocabularyOccurrence {
  id: string;
  sessionId: string;
  stepIndex: number;
  sentenceText: string;
  createdAt: string;
}

export interface SavedVocabularyEntry {
  id: string;
  text: string;
  normalizedText: string;
  type: VocabularyInsightType;
  phonetic: string | null;
  pronunciationText: string | null;
  synonyms: string[];
  antonyms: string[];
  masteryStatus: MasteryStatus;
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  senses: SavedVocabularySense[];
  occurrences: SavedVocabularyOccurrence[];
}
