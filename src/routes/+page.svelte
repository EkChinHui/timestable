<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { loadMatrix, getOverallAccuracy, getSessionCount, resetAll } from '$lib/stores/performance';
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
    goto(`${base}/quiz`);
  }
</script>

<div class="start">
  <h1>TimesTable</h1>
  <p class="subtitle">Master your times tables</p>

  <section>
    <span class="label">Mode</span>
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
      <span class="label">Which table?</span>
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
    <span class="label">Questions</span>
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
</style>
