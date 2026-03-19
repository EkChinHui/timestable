// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadMatrix,
  saveMatrix,
  recordAnswer,
  getStats,
  resetAll,
  getOverallAccuracy,
  getSessionCount
} from '$lib/stores/performance';
import type { PerformanceMatrix } from '$lib/types';

const storage: Record<string, string> = {};
beforeEach(() => {
  Object.keys(storage).forEach(k => delete storage[k]);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, val: string) => { storage[key] = val; },
    removeItem: (key: string) => { delete storage[key]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
  });
});

describe('loadMatrix', () => {
  it('returns empty matrix when localStorage is empty', () => {
    const m = loadMatrix();
    expect(m[1][1].attempts).toBe(0);
    expect(m[7][8].attempts).toBe(0);
  });

  it('loads saved data from localStorage', () => {
    const m = loadMatrix();
    m[3][5] = { attempts: 10, correct: 8, totalTime: 15000 };
    saveMatrix(m);

    const loaded = loadMatrix();
    expect(loaded[3][5].attempts).toBe(10);
    expect(loaded[3][5].correct).toBe(8);
  });
});

describe('recordAnswer', () => {
  it('increments attempts and correct for right answer', () => {
    const m = loadMatrix();
    recordAnswer(m, 3, 7, true, 1500);
    const stats = getStats(m, 3, 7);
    expect(stats.attempts).toBe(1);
    expect(stats.correct).toBe(1);
    expect(stats.totalTime).toBe(1500);
  });

  it('increments only attempts for wrong answer', () => {
    const m = loadMatrix();
    recordAnswer(m, 3, 7, false, 2000);
    const stats = getStats(m, 3, 7);
    expect(stats.attempts).toBe(1);
    expect(stats.correct).toBe(0);
  });

  it('stores under canonical [min, max] key', () => {
    const m = loadMatrix();
    recordAnswer(m, 7, 3, true, 1000);
    expect(m[3][7].attempts).toBe(1);
  });
});

describe('getOverallAccuracy', () => {
  it('returns 0 when no attempts', () => {
    expect(getOverallAccuracy(loadMatrix())).toBe(0);
  });

  it('computes correctly across multiple pairs', () => {
    const m = loadMatrix();
    m[1][1] = { attempts: 10, correct: 8, totalTime: 10000 };
    m[2][3] = { attempts: 10, correct: 6, totalTime: 15000 };
    expect(getOverallAccuracy(m)).toBeCloseTo(0.7);
  });
});

describe('resetAll', () => {
  it('clears localStorage keys', () => {
    storage['mt_matrix'] = '{}';
    storage['mt_sessions'] = '5';
    resetAll();
    expect(storage['mt_matrix']).toBeUndefined();
    expect(storage['mt_sessions']).toBeUndefined();
  });
});
