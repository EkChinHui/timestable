import type { Mode, PerformanceMatrix } from '$lib/types';
import { difficultyScore } from './scoring';

export function getAllPairs(): [number, number][] {
  const pairs: [number, number][] = [];
  for (let i = 1; i <= 10; i++) {
    for (let j = i; j <= 10; j++) {
      pairs.push([i, j]);
    }
  }
  return pairs;
}

export function getDrillPairs(table: number): [number, number][] {
  const pairs: [number, number][] = [];
  for (let j = 1; j <= 10; j++) {
    pairs.push([Math.min(table, j), Math.max(table, j)]);
  }
  return pairs;
}

function weightedRandomPick(
  pairs: [number, number][],
  weights: number[]
): [number, number] {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < pairs.length; i++) {
    random -= weights[i];
    if (random <= 0) return pairs[i];
  }
  return pairs[pairs.length - 1];
}

function randomPresentation(pair: [number, number]): [number, number] {
  return Math.random() < 0.5 ? pair : [pair[1], pair[0]];
}

export function selectQuestion(
  mode: Mode,
  matrix: PerformanceMatrix,
  sessionCount: number,
  recentPairs: [number, number][],
  drillTable?: number
): [number, number] {
  const pool = mode === 'drill' && drillTable
    ? getDrillPairs(drillTable)
    : getAllPairs();

  const maxRecent = Math.min(3, pool.length - 1);
  const trimmedRecent = recentPairs.slice(-maxRecent);

  const available = pool.filter(([a, b]) =>
    !trimmedRecent.some(([ra, rb]) => ra === a && rb === b)
  );

  if (mode === 'random' || mode === 'drill') {
    const idx = Math.floor(Math.random() * available.length);
    return randomPresentation(available[idx]);
  }

  // Adaptive mode
  const aggressiveness = Math.min((sessionCount * 20) / 200, 3);
  const weights = available.map(([a, b]) => {
    const stats = matrix[a]?.[b];
    if (!stats || stats.attempts === 0) return 1.5;
    return 1 + difficultyScore(stats) * aggressiveness;
  });

  return randomPresentation(weightedRandomPick(available, weights));
}
