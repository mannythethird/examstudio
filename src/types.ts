export type QuestionType = 'radio' | 'check' | 'tf' | 'essay';

export interface QuestionChoice {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback?: string;
}

export interface AssessmentQuestion {
  id: number;
  type: QuestionType;
  prompt: string;
  choices: QuestionChoice[];
  points: number;
  group: number;
  groupTitle?: string;
  lessons?: string;
  complexity?: string;
  standards?: string;
  explanation?: string;
  rawText: string;
  tags?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  sourceId?: string;
  sourceTitle?: string;
}

export interface ExamSource {
  id: string;
  title: string;
  content: string;
  questions: AssessmentQuestion[];
  selectedQuestionIds: number[];
  updatedAt: number;
}

export interface StagedItem {
  id: string; // unique ID for sorting board
  question: AssessmentQuestion;
  sourceId: string;
  sourceTitle: string;
  originalId: number;
}

export interface AuditIssue {
  type: 'warning' | 'error' | 'suggestion';
  questionId?: number;
  message: string;
}

export interface AuditResult {
  score: number; // 0 - 100
  summary: string;
  issues: AuditIssue[];
}
