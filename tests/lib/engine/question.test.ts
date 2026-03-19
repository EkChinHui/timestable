// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { selectQuestion, getAllPairs, getDrillPairs } from '$lib/engine/question';
import type { PerformanceMatrix } from '$lib/types';

function emptyMatrix(): PerformanceMatrix {
  const m: PerformanceMatrix = {};
  for (let i = 1; i <= 10; i++) {
    m[i] = {};
    for (let j = i; j <= 10; j++) {
      m[i][j] = { attempts: 0, correct: 0, totalTime: 0 };
    }
  }
  return m;
}

describe('getAllPairs', () => {
  it('returns 55 unique canonical pairs', () => {
    const pairs = getAllPairs();
    expect(pairs).toHaveLength(55);
    pairs.forEach(([a, b]) => expect(a).toBeLessThanOrEqual(b));
  });
});

describe('getDrillPairs', () => {
  it('returns 10 pairs for a given table', () => {
    const pairs = getDrillPairs(7);
    expect(pairs).toHaveLength(10);
    pairs.forEach(([a, b]) => {
      expect(a === 7 || b === 7).toBe(true);
    });
  });
});

describe('selectQuestion', () => {
  it('returns a pair within 1-10 range', () => {
    const [a, b] = selectQuestion('random', emptyMatrix(), 0, []);
    expect(a).toBeGreaterThanOrEqual(1);
    expect(a).toBeLessThanOrEqual(10);
    expect(b).toBeGreaterThanOrEqual(1);
    expect(b).toBeLessThanOrEqual(10);
  });

  it('excludes recent pairs from selection', () => {
    const recent: [number, number][] = [[1, 1], [1, 2], [1, 3]];
    for (let i = 0; i < 50; i++) {
      const [a, b] = selectQuestion('random', emptyMatrix(), 0, recent);
      const canon: [number, number] = [Math.min(a, b), Math.max(a, b)];
      const isRecent = recent.some(([ra, rb]) => ra === canon[0] && rb === canon[1]);
      expect(isRecent).toBe(false);
    }
  });

  it('adaptive mode with no data behaves like random', () => {
    const results = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const [a, b] = selectQuestion('adaptive', emptyMatrix(), 0, []);
      results.add(`${Math.min(a, b)},${Math.max(a, b)}`);
    }
    expect(results.size).toBeGreaterThan(10);
  });

  it('drill mode only returns pairs from selected table', () => {
    for (let i = 0; i < 50; i++) {
      const [a, b] = selectQuestion('drill', emptyMatrix(), 0, [], 5);
      expect(a === 5 || b === 5).toBe(true);
    }
  });

  it('adaptive mode favors harder pairs', () => {
    const matrix = emptyMatrix();
    matrix[7][8] = { attempts: 20, correct: 5, totalTime: 100000 };
    for (let i = 1; i <= 10; i++) {
      for (let j = i; j <= 10; j++) {
        if (i !== 7 || j !== 8) {
          matrix[i][j] = { attempts: 20, correct: 20, totalTime: 20000 };
        }
      }
    }

    let hardCount = 0;
    const trials = 2000;
    for (let i = 0; i < trials; i++) {
      const [a, b] = selectQuestion('adaptive', matrix, 30, []);
      const canon = [Math.min(a, b), Math.max(a, b)];
      if (canon[0] === 7 && canon[1] === 8) hardCount++;
    }
    // 1/55 ≈ 1.8% uniform; adaptive should be well above that
    expect(hardCount / trials).toBeGreaterThan(0.03);
  });
});
