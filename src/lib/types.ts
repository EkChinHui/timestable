export type PairStats = {
  attempts: number;
  correct: number;
  totalTime: number; // cumulative ms
};

export type Mode = 'adaptive' | 'random' | 'drill';

export type SessionSettings = {
  mode: Mode;
  table?: number; // 1-10, only for drill mode
  count: number;  // 10, 20, or 30
};

export type SessionAnswer = {
  a: number;
  b: number;
  userAnswer: number;
  correctAnswer: number;
  correct: boolean;
  timeMs: number;
};

export type CurrentSession = {
  score: number;
  total: number;
  avgTime: number;
  answers: SessionAnswer[];
};

export type PerformanceMatrix = Record<number, Record<number, PairStats>>;
