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
    if (stats.attempts === 0) return `${a} \u00d7 ${b} \u2014 no data`;
    const acc = Math.round((stats.correct / stats.attempts) * 100);
    const avg = Math.round(stats.totalTime / stats.attempts);
    return `${a} \u00d7 ${b} = ${a * b}\n${acc}% correct \u00b7 ${avg}ms avg \u00b7 ${stats.attempts} attempts`;
  }
</script>

<div class="heatmap">
  <div class="grid">
    <div class="cell header corner">\u00d7</div>
    {#each numbers as n}
      <div class="cell header">{n}</div>
    {/each}

    {#each numbers as row}
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
