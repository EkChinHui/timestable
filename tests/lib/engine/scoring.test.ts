// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { difficultyScore, errorRate, normalizedTime } from '$lib/engine/scoring';

describe('errorRate', () => {
  it('returns 0 for perfect accuracy', () => {
    expect(errorRate({ attempts: 10, correct: 10, totalTime: 0 })).toBe(0);
  });

  it('returns 1 for zero correct', () => {
    expect(errorRate({ attempts: 5, correct: 0, totalTime: 0 })).toBe(1);
  });

  it('returns 0.4 for 3/5 correct', () => {
    expect(errorRate({ attempts: 5, correct: 3, totalTime: 0 })).toBeCloseTo(0.4);
  });
});

describe('normalizedTime', () => {
  it('returns 0 for times under 1s', () => {
    expect(normalizedTime(500)).toBe(0);
  });

  it('returns 1 for times over 5s', () => {
    expect(normalizedTime(6000)).toBe(1);
  });

  it('returns 0.5 for 3s', () => {
    expect(normalizedTime(3000)).toBe(0.5);
  });
});

describe('difficultyScore', () => {
  it('returns 0 for perfect fast answers', () => {
    const stats = { attempts: 10, correct: 10, totalTime: 5000 }; // avg 500ms
    expect(difficultyScore(stats)).toBe(0);
  });

  it('returns 1 for all wrong and slow', () => {
    const stats = { attempts: 10, correct: 0, totalTime: 60000 }; // avg 6s
    expect(difficultyScore(stats)).toBe(1);
  });

  it('weights error rate at 70% and time at 30%', () => {
    const stats = { attempts: 10, correct: 5, totalTime: 30000 }; // 50% error, avg 3s
    const expected = 0.7 * 0.5 + 0.3 * 0.5;
    expect(difficultyScore(stats)).toBeCloseTo(expected);
  });
});
