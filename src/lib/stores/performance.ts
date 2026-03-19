import type { PairStats, PerformanceMatrix } from '$lib/types';

const MATRIX_KEY = 'mt_matrix';
const SESSIONS_KEY = 'mt_sessions';

function createEmptyMatrix(): PerformanceMatrix {
  const m: PerformanceMatrix = {};
  for (let i = 1; i <= 10; i++) {
    m[i] = {};
    for (let j = i; j <= 10; j++) {
      m[i][j] = { attempts: 0, correct: 0, totalTime: 0 };
    }
  }
  return m;
}

export function loadMatrix(): PerformanceMatrix {
  if (typeof localStorage === 'undefined') return createEmptyMatrix();
  const raw = localStorage.getItem(MATRIX_KEY);
  if (!raw) return createEmptyMatrix();
  try {
    const saved = JSON.parse(raw) as PerformanceMatrix;
    const m = createEmptyMatrix();
    for (let i = 1; i <= 10; i++) {
      for (let j = i; j <= 10; j++) {
        if (saved[i]?.[j]) {
          m[i][j] = saved[i][j];
        }
      }
    }
    return m;
  } catch {
    return createEmptyMatrix();
  }
}

export function saveMatrix(matrix: PerformanceMatrix): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(MATRIX_KEY, JSON.stringify(matrix));
}

export function getStats(matrix: PerformanceMatrix, a: number, b: number): PairStats {
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  return matrix[min][max];
}

export function recordAnswer(
  matrix: PerformanceMatrix,
  a: number,
  b: number,
  correct: boolean,
  timeMs: number
): void {
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  matrix[min][max].attempts++;
  if (correct) matrix[min][max].correct++;
  matrix[min][max].totalTime += timeMs;
}

export function getOverallAccuracy(matrix: PerformanceMatrix): number {
  let totalAttempts = 0;
  let totalCorrect = 0;
  for (let i = 1; i <= 10; i++) {
    for (let j = i; j <= 10; j++) {
      totalAttempts += matrix[i][j].attempts;
      totalCorrect += matrix[i][j].correct;
    }
  }
  return totalAttempts === 0 ? 0 : totalCorrect / totalAttempts;
}

export function getSessionCount(): number {
  if (typeof localStorage === 'undefined') return 0;
  return parseInt(localStorage.getItem(SESSIONS_KEY) ?? '0', 10);
}

export function incrementSessionCount(): void {
  if (typeof localStorage === 'undefined') return;
  const count = getSessionCount() + 1;
  localStorage.setItem(SESSIONS_KEY, String(count));
}

export function resetAll(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(MATRIX_KEY);
  localStorage.removeItem(SESSIONS_KEY);
  localStorage.removeItem('mt_session_settings');
  localStorage.removeItem('mt_current_session');
}
