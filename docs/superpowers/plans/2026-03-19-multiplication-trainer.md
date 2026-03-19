# Multiplication Trainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an adaptive multiplication training app (1–10 times tables) with three modes, heatmap visualization, and localStorage persistence.

**Architecture:** SvelteKit app with three routes (Start, Quiz, Results). Core logic split into engine modules (question selection, scoring) and a Svelte store synced to localStorage. Heatmap rendered as a CSS grid. Svelte 5 with runes for reactivity.

**Tech Stack:** SvelteKit 2, Svelte 5 (runes), TypeScript, Vitest, @sveltejs/adapter-static, plain CSS

**Spec:** `docs/superpowers/specs/2026-03-19-multiplication-trainer-design.md`

---

## File Map

```
src/
  app.html                    # HTML shell
  app.css                     # Global styles, CSS custom properties
  lib/
    types.ts                  # Shared TypeScript types (PairStats, SessionSettings, etc.)
    stores/
      performance.ts          # Performance matrix store + localStorage sync
      session.ts              # Session settings + current session store
    engine/
      scoring.ts              # difficultyScore, errorRate, normalizedTime
      question.ts             # Question selection: adaptive, random, drill
    components/
      Heatmap.svelte          # 10×10 CSS grid heatmap
      ProgressBar.svelte      # Quiz progress bar
      Feedback.svelte         # Correct/wrong flash overlay
  routes/
    +layout.svelte            # Minimal shared layout
    +page.svelte              # Start screen
    quiz/
      +page.svelte            # Quiz screen
    results/
      +page.svelte            # Results screen
tests/
  lib/
    engine/
      scoring.test.ts         # Scoring logic tests
      question.test.ts        # Question selection tests
    stores/
      performance.test.ts     # Performance store tests
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`, `src/app.html`, `src/app.css`, `src/routes/+layout.svelte`, `src/routes/+page.svelte`

- [ ] **Step 1: Scaffold SvelteKit project**

```bash
npx sv create multiplication-tester --template minimal --types ts --no-add-ons --no-install
```

Move contents from the created subdirectory into the project root if needed. Then:

```bash
npm install
npm install -D @sveltejs/adapter-static vitest @testing-library/svelte jsdom
```

- [ ] **Step 2: Configure static adapter**

In `svelte.config.js`:

```javascript
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      fallback: '200.html'
    })
  }
};

export default config;
```

- [ ] **Step 3: Configure Vitest**

In `vite.config.ts`:

```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'jsdom'
  }
});
```

- [ ] **Step 4: Add global CSS custom properties**

In `src/app.css`:

```css
:root {
  --bg: #0f1117;
  --bg-card: #1a1d27;
  --text: #e2e8f0;
  --text-secondary: #94a3b8;
  --accent: #6366f1;
  --accent-hover: #818cf8;
  --success: #22c55e;
  --error: #ef4444;
  --warning: #eab308;
  --border: #2d3148;
  --radius: 10px;
  --font: 'Inter', system-ui, -apple-system, sans-serif;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  display: flex;
  justify-content: center;
}

button {
  cursor: pointer;
  font-family: inherit;
  border: none;
  border-radius: var(--radius);
  transition: background 0.15s, transform 0.1s;
}

button:active {
  transform: scale(0.97);
}

input {
  font-family: inherit;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-card);
  color: var(--text);
  outline: none;
  transition: border-color 0.15s;
}

input:focus {
  border-color: var(--accent);
}
```

- [ ] **Step 5: Set up +layout.svelte**

In `src/routes/+layout.svelte`:

```svelte
<script>
  import '../app.css';
  let { children } = $props();
</script>

<main>
  {@render children()}
</main>

<style>
  main {
    max-width: 640px;
    width: 100%;
    padding: 2rem 1rem;
  }
</style>
```

- [ ] **Step 6: Placeholder start page**

In `src/routes/+page.svelte`:

```svelte
<h1>Multiplication Trainer</h1>
<p>Coming soon...</p>
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```

Expected: App loads at `http://localhost:5173` showing "Multiplication Trainer / Coming soon..."

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold SvelteKit project with static adapter and vitest"
```

---

## Task 2: Types & Scoring Engine

**Files:**
- Create: `src/lib/types.ts`, `src/lib/engine/scoring.ts`, `tests/lib/engine/scoring.test.ts`

- [ ] **Step 1: Define shared types**

In `src/lib/types.ts`:

```typescript
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
```

- [ ] **Step 2: Write scoring tests**

In `tests/lib/engine/scoring.test.ts`:

```typescript
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
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run tests/lib/engine/scoring.test.ts
```

Expected: FAIL — module `$lib/engine/scoring` not found.

- [ ] **Step 4: Implement scoring module**

In `src/lib/engine/scoring.ts`:

```typescript
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
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/lib/engine/scoring.test.ts
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/engine/scoring.ts tests/lib/engine/scoring.test.ts
git commit -m "feat: add types and scoring engine with tests"
```

---

## Task 3: Question Selection Engine

**Files:**
- Create: `src/lib/engine/question.ts`, `tests/lib/engine/question.test.ts`

- [ ] **Step 1: Write question selection tests**

In `tests/lib/engine/question.test.ts`:

```typescript
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
    // All pairs have a <= b
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
    // Should see reasonable variety (not all the same pair)
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
    // Make 7x8 very hard
    matrix[7][8] = { attempts: 20, correct: 5, totalTime: 100000 };
    // Make everything else easy
    for (let i = 1; i <= 10; i++) {
      for (let j = i; j <= 10; j++) {
        if (i !== 7 || j !== 8) {
          matrix[i][j] = { attempts: 20, correct: 20, totalTime: 20000 };
        }
      }
    }

    let hardCount = 0;
    const trials = 500;
    for (let i = 0; i < trials; i++) {
      const [a, b] = selectQuestion('adaptive', matrix, 30, []);
      const canon = [Math.min(a, b), Math.max(a, b)];
      if (canon[0] === 7 && canon[1] === 8) hardCount++;
    }
    // 7x8 is 1 of 55 pairs; with adaptive it should appear much more than 1/55 (~1.8%)
    expect(hardCount / trials).toBeGreaterThan(0.05);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/lib/engine/question.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement question selection**

In `src/lib/engine/question.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/lib/engine/question.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/engine/question.ts tests/lib/engine/question.test.ts
git commit -m "feat: add question selection engine with adaptive, random, and drill modes"
```

---

## Task 4: Performance Store

**Files:**
- Create: `src/lib/stores/performance.ts`, `src/lib/stores/session.ts`, `tests/lib/stores/performance.test.ts`

- [ ] **Step 1: Write performance store tests**

In `tests/lib/stores/performance.test.ts`:

```typescript
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

// Mock localStorage
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
    // Should be stored at [3][7]
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
    // 14 / 20 = 0.7
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/lib/stores/performance.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement performance store**

In `src/lib/stores/performance.ts`:

```typescript
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
```

- [ ] **Step 4: Implement session store**

In `src/lib/stores/session.ts`:

```typescript
import type { SessionSettings, CurrentSession } from '$lib/types';

const SETTINGS_KEY = 'mt_session_settings';
const SESSION_KEY = 'mt_current_session';

export function saveSessionSettings(settings: SessionSettings): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadSessionSettings(): SessionSettings | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch { return null; }
}

export function saveCurrentSession(session: CurrentSession): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadCurrentSession(): CurrentSession | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch { return null; }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/lib/stores/performance.test.ts
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/stores/ tests/lib/stores/
git commit -m "feat: add performance and session stores with localStorage persistence"
```

---

## Task 5: Start Screen

**Files:**
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Implement start screen**

In `src/routes/+page.svelte`:

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { loadMatrix, getOverallAccuracy, getSessionCount } from '$lib/stores/performance';
  import { saveSessionSettings } from '$lib/stores/session';
  import type { Mode } from '$lib/types';

  let mode: Mode = $state('adaptive');
  let count: number = $state(20);
  let drillTable: number = $state(7);
  let sessionCount = $state(0);
  let accuracy = $state(0);

  onMount(() => {
    const matrix = loadMatrix();
    sessionCount = getSessionCount();
    accuracy = getOverallAccuracy(matrix);
  });

  function start() {
    saveSessionSettings({
      mode,
      count,
      ...(mode === 'drill' ? { table: drillTable } : {})
    });
    goto('/quiz');
  }
</script>

<div class="start">
  <h1>Multiplication Trainer</h1>
  <p class="subtitle">Master your times tables</p>

  <section>
    <label class="label">Mode</label>
    <div class="button-group">
      <button class:selected={mode === 'adaptive'} onclick={() => mode = 'adaptive'}>
        Adaptive
      </button>
      <button class:selected={mode === 'random'} onclick={() => mode = 'random'}>
        Random
      </button>
      <button class:selected={mode === 'drill'} onclick={() => mode = 'drill'}>
        Tables Drill
      </button>
    </div>
  </section>

  {#if mode === 'drill'}
    <section>
      <label class="label">Which table?</label>
      <div class="button-group tables">
        {#each Array.from({ length: 10 }, (_, i) => i + 1) as n}
          <button class:selected={drillTable === n} onclick={() => drillTable = n}>
            {n}
          </button>
        {/each}
      </div>
    </section>
  {/if}

  <section>
    <label class="label">Questions</label>
    <div class="button-group">
      <button class:selected={count === 10} onclick={() => count = 10}>10</button>
      <button class:selected={count === 20} onclick={() => count = 20}>20</button>
      <button class:selected={count === 30} onclick={() => count = 30}>30</button>
    </div>
  </section>

  <button class="start-btn" onclick={start}>Start</button>

  {#if sessionCount > 0}
    <p class="stats">
      Sessions: {sessionCount} · Accuracy: {Math.round(accuracy * 100)}%
    </p>
  {/if}
</div>

<style>
  .start {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding-top: 3rem;
  }

  h1 {
    font-size: 2rem;
    font-weight: 700;
  }

  .subtitle {
    color: var(--text-secondary);
    margin-top: -0.75rem;
  }

  section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
  }

  .label {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-secondary);
  }

  .button-group {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .button-group button {
    padding: 0.6rem 1.25rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--text);
    font-size: 0.9rem;
  }

  .button-group button.selected {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
    font-weight: 600;
  }

  .tables button {
    padding: 0.5rem 0.9rem;
  }

  .start-btn {
    padding: 0.85rem 3rem;
    background: var(--accent);
    color: white;
    font-size: 1.1rem;
    font-weight: 600;
    margin-top: 0.5rem;
  }

  .start-btn:hover {
    background: var(--accent-hover);
  }

  .stats {
    font-size: 0.82rem;
    color: var(--text-secondary);
  }
</style>
```

- [ ] **Step 2: Verify in browser**

```bash
npm run dev
```

Expected: Start screen shows at `http://localhost:5173` with mode selector, question count, and start button. Tables Drill reveals the table picker. Start navigates to `/quiz` (blank page for now).

- [ ] **Step 3: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: implement start screen with mode and question count selection"
```

---

## Task 6: Quiz Screen

**Files:**
- Create: `src/routes/quiz/+page.svelte`, `src/lib/components/ProgressBar.svelte`, `src/lib/components/Feedback.svelte`

- [ ] **Step 1: Create ProgressBar component**

In `src/lib/components/ProgressBar.svelte`:

```svelte
<script lang="ts">
  let { current, total }: { current: number; total: number } = $props();
</script>

<div class="bar">
  <div class="fill" style="width: {(current / total) * 100}%"></div>
</div>

<style>
  .bar {
    width: 100%;
    height: 6px;
    background: var(--border);
    border-radius: 3px;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: var(--accent);
    border-radius: 3px;
    transition: width 0.3s ease;
  }
</style>
```

- [ ] **Step 2: Create Feedback component**

In `src/lib/components/Feedback.svelte`:

```svelte
<script lang="ts">
  let { correct, correctAnswer }: { correct: boolean; correctAnswer: number } = $props();
</script>

<div class="feedback" class:correct class:wrong={!correct}>
  {#if correct}
    Correct!
  {:else}
    The answer is {correctAnswer}
  {/if}
</div>

<style>
  .feedback {
    font-size: 1.3rem;
    font-weight: 600;
    padding: 0.75rem 1.5rem;
    border-radius: var(--radius);
    text-align: center;
  }

  .correct {
    color: var(--success);
    background: rgba(34, 197, 94, 0.1);
  }

  .wrong {
    color: var(--error);
    background: rgba(239, 68, 68, 0.1);
  }
</style>
```

- [ ] **Step 3: Implement quiz screen**

In `src/routes/quiz/+page.svelte`:

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import ProgressBar from '$lib/components/ProgressBar.svelte';
  import Feedback from '$lib/components/Feedback.svelte';
  import { loadMatrix, saveMatrix, recordAnswer, getSessionCount, incrementSessionCount } from '$lib/stores/performance';
  import { loadSessionSettings, saveCurrentSession } from '$lib/stores/session';
  import { selectQuestion } from '$lib/engine/question';
  import type { SessionSettings, SessionAnswer, PerformanceMatrix } from '$lib/types';

  let settings: SessionSettings = $state({ mode: 'random', count: 20 });
  let matrix: PerformanceMatrix = $state({} as PerformanceMatrix);
  let questionNum = $state(0);
  let a = $state(0);
  let b = $state(0);
  let userInput = $state('');
  let showFeedback = $state(false);
  let lastCorrect = $state(false);
  let lastCorrectAnswer = $state(0);
  let questionStartTime = $state(0);
  let elapsed = $state(0);
  let timerInterval: ReturnType<typeof setInterval> | undefined;
  let answers: SessionAnswer[] = $state([]);
  let recentPairs: [number, number][] = $state([]);
  let inputEl: HTMLInputElement | undefined = $state();

  onMount(() => {
    const loaded = loadSessionSettings();
    if (!loaded) { goto('/'); return; }
    settings = loaded;
    matrix = loadMatrix();
    nextQuestion();
  });

  function nextQuestion() {
    questionNum++;
    const sessionCount = getSessionCount();
    const [qa, qb] = selectQuestion(
      settings.mode, matrix, sessionCount, recentPairs, settings.table
    );
    a = qa;
    b = qb;
    recentPairs = [...recentPairs, [Math.min(a, b), Math.max(a, b)]].slice(-3);
    userInput = '';
    showFeedback = false;
    questionStartTime = Date.now();
    elapsed = 0;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      elapsed = (Date.now() - questionStartTime) / 1000;
    }, 100);
    // Focus input after DOM update
    setTimeout(() => inputEl?.focus(), 10);
  }

  function submit() {
    if (userInput.trim() === '' || showFeedback) return;
    clearInterval(timerInterval);
    const timeMs = Date.now() - questionStartTime;
    const correctAnswer = a * b;
    const isCorrect = parseInt(userInput, 10) === correctAnswer;

    recordAnswer(matrix, a, b, isCorrect, timeMs);
    saveMatrix(matrix);

    answers.push({
      a, b,
      userAnswer: parseInt(userInput, 10),
      correctAnswer,
      correct: isCorrect,
      timeMs
    });

    lastCorrect = isCorrect;
    lastCorrectAnswer = correctAnswer;
    showFeedback = true;

    const delay = isCorrect ? 400 : 1500;
    setTimeout(() => {
      if (questionNum >= settings.count) {
        finishSession();
      } else {
        nextQuestion();
      }
    }, delay);
  }

  function finishSession() {
    incrementSessionCount();
    const totalTime = answers.reduce((s, a) => s + a.timeMs, 0);
    const score = answers.filter(a => a.correct).length;
    saveCurrentSession({
      score,
      total: answers.length,
      avgTime: Math.round(totalTime / answers.length),
      answers
    });
    goto('/results');
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') submit();
  }
</script>

<div class="quiz">
  <div class="header">
    <span>Question {questionNum} / {settings.count}</span>
    <span class="timer">{elapsed.toFixed(1)}s</span>
  </div>

  <ProgressBar current={questionNum - (showFeedback ? 0 : 1)} total={settings.count} />

  {#if showFeedback}
    <div class="question-area">
      <div class="question">{a} × {b} = {lastCorrectAnswer}</div>
      <Feedback correct={lastCorrect} correctAnswer={lastCorrectAnswer} />
    </div>
  {:else}
    <div class="question-area">
      <div class="question">{a} × {b} = ?</div>
      <input
        bind:this={inputEl}
        bind:value={userInput}
        onkeydown={handleKeydown}
        type="number"
        inputmode="numeric"
        placeholder="..."
        class="answer-input"
      />
      <p class="hint">Press Enter to submit</p>
    </div>
  {/if}
</div>

<style>
  .quiz {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding-top: 2rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .timer {
    font-variant-numeric: tabular-nums;
  }

  .question-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding-top: 3rem;
  }

  .question {
    font-size: 2.8rem;
    font-weight: 700;
  }

  .answer-input {
    font-size: 1.4rem;
    width: 120px;
    text-align: center;
    padding: 0.75rem;
  }

  /* Hide number input spinners */
  .answer-input::-webkit-inner-spin-button,
  .answer-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .answer-input[type='number'] {
    -moz-appearance: textfield;
  }

  .hint {
    font-size: 0.85rem;
    color: var(--text-secondary);
  }
</style>
```

- [ ] **Step 4: Verify in browser**

Start from the home page, select settings, press Start. Should show questions, accept numeric input, show feedback, and advance through all questions.

- [ ] **Step 5: Commit**

```bash
git add src/routes/quiz/ src/lib/components/ProgressBar.svelte src/lib/components/Feedback.svelte
git commit -m "feat: implement quiz screen with timer, feedback, and answer recording"
```

---

## Task 7: Heatmap Component

**Files:**
- Create: `src/lib/components/Heatmap.svelte`

- [ ] **Step 1: Implement heatmap**

In `src/lib/components/Heatmap.svelte`:

```svelte
<script lang="ts">
  import type { PerformanceMatrix } from '$lib/types';
  import { difficultyScore } from '$lib/engine/scoring';
  import { getStats } from '$lib/stores/performance';

  let { matrix }: { matrix: PerformanceMatrix } = $props();

  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  function cellColor(a: number, b: number): string {
    const stats = getStats(matrix, a, b);
    if (stats.attempts === 0) return 'var(--border)';
    const score = difficultyScore(stats);
    // Interpolate green -> yellow -> red
    if (score <= 0.5) {
      const t = score / 0.5;
      return interpolate('#22c55e', '#eab308', t);
    } else {
      const t = (score - 0.5) / 0.5;
      return interpolate('#eab308', '#ef4444', t);
    }
  }

  function interpolate(c1: string, c2: string, t: number): string {
    const r1 = parseInt(c1.slice(1, 3), 16);
    const g1 = parseInt(c1.slice(3, 5), 16);
    const b1 = parseInt(c1.slice(5, 7), 16);
    const r2 = parseInt(c2.slice(1, 3), 16);
    const g2 = parseInt(c2.slice(3, 5), 16);
    const b2 = parseInt(c2.slice(5, 7), 16);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function tooltip(a: number, b: number): string {
    const stats = getStats(matrix, a, b);
    if (stats.attempts === 0) return `${a} × ${b} — no data`;
    const acc = Math.round((stats.correct / stats.attempts) * 100);
    const avg = Math.round(stats.totalTime / stats.attempts);
    return `${a} × ${b} = ${a * b}\n${acc}% correct · ${avg}ms avg · ${stats.attempts} attempts`;
  }
</script>

<div class="heatmap">
  <div class="grid">
    <!-- Corner -->
    <div class="cell header corner">×</div>
    <!-- Column headers -->
    {#each numbers as n}
      <div class="cell header">{n}</div>
    {/each}

    {#each numbers as row}
      <!-- Row header -->
      <div class="cell header">{row}</div>
      {#each numbers as col}
        <div
          class="cell data"
          style="background: {cellColor(row, col)}"
          title={tooltip(row, col)}
        >
          {row * col}
        </div>
      {/each}
    {/each}
  </div>

  <div class="legend">
    <span class="legend-label">Easy</span>
    <div class="legend-bar"></div>
    <span class="legend-label">Hard</span>
  </div>
</div>

<style>
  .heatmap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(11, 1fr);
    gap: 2px;
    width: 100%;
    max-width: 440px;
  }

  .cell {
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 1;
    font-size: 0.7rem;
    border-radius: 3px;
    font-variant-numeric: tabular-nums;
  }

  .header {
    font-weight: 700;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .corner {
    color: var(--text-secondary);
  }

  .data {
    color: white;
    cursor: default;
    transition: transform 0.1s;
    font-weight: 500;
  }

  .data:hover {
    transform: scale(1.15);
    z-index: 1;
  }

  .legend {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--text-secondary);
  }

  .legend-bar {
    width: 120px;
    height: 8px;
    border-radius: 4px;
    background: linear-gradient(to right, #22c55e, #eab308, #ef4444);
  }

  .legend-label {
    font-size: 0.7rem;
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/Heatmap.svelte
git commit -m "feat: add 10x10 heatmap component with difficulty color interpolation"
```

---

## Task 8: Results Screen

**Files:**
- Create: `src/routes/results/+page.svelte`

- [ ] **Step 1: Implement results screen**

In `src/routes/results/+page.svelte`:

```svelte
<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import Heatmap from '$lib/components/Heatmap.svelte';
  import { loadMatrix } from '$lib/stores/performance';
  import { loadCurrentSession } from '$lib/stores/session';
  import type { CurrentSession, PerformanceMatrix } from '$lib/types';

  let session: CurrentSession | null = $state(null);
  let matrix: PerformanceMatrix = $state({} as PerformanceMatrix);

  onMount(() => {
    session = loadCurrentSession();
    matrix = loadMatrix();
    if (!session) goto('/');
  });

  function playAgain() {
    goto('/quiz');
  }
</script>

{#if session}
  <div class="results">
    <h2>Session Complete!</h2>
    <p class="summary">
      {session.score}/{session.total} correct · Avg {(session.avgTime / 1000).toFixed(1)}s
    </p>

    <Heatmap {matrix} />

    <div class="actions">
      <button class="primary" onclick={playAgain}>Play Again</button>
      <button class="secondary" onclick={() => goto('/')}>Home</button>
    </div>
  </div>
{/if}

<style>
  .results {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding-top: 2rem;
  }

  h2 {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .summary {
    color: var(--text-secondary);
    font-size: 1rem;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .primary {
    padding: 0.7rem 2rem;
    background: var(--accent);
    color: white;
    font-size: 1rem;
    font-weight: 600;
  }

  .primary:hover {
    background: var(--accent-hover);
  }

  .secondary {
    padding: 0.7rem 2rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--text);
    font-size: 1rem;
  }
</style>
```

- [ ] **Step 2: Verify full flow in browser**

Run `npm run dev`. Complete flow: Start → pick mode/count → Start → answer all questions → see Results with heatmap. Try "Play Again" and "Home" buttons.

- [ ] **Step 3: Commit**

```bash
git add src/routes/results/
git commit -m "feat: implement results screen with session summary and heatmap"
```

---

## Task 9: Reset Data & Polish

**Files:**
- Modify: `src/routes/+page.svelte`

- [ ] **Step 1: Add reset button to start screen**

Add to the bottom of the `<div class="start">` in `src/routes/+page.svelte`, before the closing `</div>`:

```svelte
  {#if sessionCount > 0}
    <button class="reset" onclick={() => {
      if (confirm('Reset all training data? This cannot be undone.')) {
        resetAll();
        sessionCount = 0;
        accuracy = 0;
      }
    }}>
      Reset Data
    </button>
  {/if}
```

Add the import for `resetAll` at the top, and add this CSS:

```css
  .reset {
    font-size: 0.8rem;
    color: var(--text-secondary);
    background: none;
    padding: 0.4rem 0.8rem;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .reset:hover {
    color: var(--error);
  }
```

- [ ] **Step 2: Verify reset works**

Click "Reset Data", confirm dialog appears, after confirming stats disappear and localStorage is cleared.

- [ ] **Step 3: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: add reset data button with confirmation dialog"
```

---

## Task 10: End-to-End Verification

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 2: Full manual test**

1. Start dev server: `npm run dev`
2. Open `http://localhost:5173`
3. Test Adaptive mode with 10 questions — verify heatmap updates on results
4. Test Random mode with 10 questions
5. Test Tables Drill (e.g., 7s table) with 10 questions
6. Verify "Play Again" keeps same settings
7. Verify "Home" returns to start screen
8. Verify heatmap accumulates across sessions
9. Verify "Reset Data" clears everything
10. Refresh browser — verify data persists from localStorage

- [ ] **Step 3: Build for production**

```bash
npm run build
```

Expected: Builds successfully with static adapter output.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: final polish and verification"
```
