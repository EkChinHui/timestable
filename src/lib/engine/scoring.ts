import type { PairStats } from '$lib/types';

export function errorRate(stats: PairStats): number {
  if (stats.attempts === 0) return 0;
  return 1 - stats.correct / stats.attempts;
}

export function normalizedTime(avgTimeMs: number): number {
  return Math.max(0, Math.min(1, (avgTimeMs - 1000) / 4000));
}

export function difficultyScore(stats: PairStats): number {
  if (stats.attempts === 0) return 0;
  const er = errorRate(stats);
  const nt = normalizedTime(stats.totalTime / stats.attempts);
  return 0.7 * er + 0.3 * nt;
}
