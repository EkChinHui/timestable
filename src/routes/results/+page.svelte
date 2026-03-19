<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import Heatmap from '$lib/components/Heatmap.svelte';
  import { loadMatrix } from '$lib/stores/performance';
  import { loadCurrentSession, loadPreviousSession } from '$lib/stores/session';
  import { playComplete } from '$lib/sounds';
  import type { CurrentSession, PerformanceMatrix } from '$lib/types';

  let session: CurrentSession | null = $state(null);
  let prev: CurrentSession | null = $state(null);
  let matrix: PerformanceMatrix = $state({} as PerformanceMatrix);
  let showCelebration = $state(false);

  let scoreDiff = $derived(
    session && prev ? session.score - prev.score : null
  );
  let timeDiff = $derived(
    session && prev ? prev.avgTime - session.avgTime : null
  );
  let isPerfect = $derived(session ? session.score === session.total : false);

  onMount(() => {
    session = loadCurrentSession();
    prev = loadPreviousSession();
    matrix = loadMatrix();
    if (!session) { goto(`${base}/`); return; }
    if (isPerfect || (session && session.score / session.total >= 0.8)) {
      showCelebration = true;
      playComplete();
      setTimeout(() => showCelebration = false, 3000);
    }
  });

  function playAgain() {
    goto(`${base}/quiz`);
  }
</script>

{#if session}
  <div class="results">
    {#if showCelebration}
      <div class="celebration">
        {#if isPerfect}
          <span class="celeb-text">PERFECT SCORE!</span>
        {:else}
          <span class="celeb-text">Well done!</span>
        {/if}
      </div>
    {/if}

    <h2>{isPerfect ? 'Perfect!' : 'Session Complete!'}</h2>

    <div class="score-display">
      <span class="score-big">{session.score}/{session.total}</span>
      <span class="score-label">correct</span>
    </div>

    <p class="summary">
      Avg {(session.avgTime / 1000).toFixed(1)}s per question
    </p>

    {#if scoreDiff !== null || timeDiff !== null}
      <div class="comparison">
        {#if scoreDiff !== null && scoreDiff !== 0}
          <span class="comp-item" class:positive={scoreDiff > 0} class:negative={scoreDiff < 0}>
            {scoreDiff > 0 ? '+' : ''}{scoreDiff} score vs last
          </span>
        {/if}
        {#if timeDiff !== null && Math.abs(timeDiff) >= 100}
          <span class="comp-item" class:positive={timeDiff > 0} class:negative={timeDiff < 0}>
            {timeDiff > 0 ? '' : '+'}{Math.abs(Math.round(timeDiff / 100)) / 10}s {timeDiff > 0 ? 'faster' : 'slower'}
          </span>
        {/if}
      </div>
    {/if}

    <Heatmap {matrix} />

    <div class="actions">
      <button class="primary" onclick={playAgain}>Play Again</button>
      <button class="secondary" onclick={() => goto(`${base}/`)}>Home</button>
    </div>
  </div>
{/if}

<style>
  .results {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    padding-top: 2rem;
  }

  .celebration {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 10;
    animation: celebFade 3s ease-out forwards;
  }

  .celeb-text {
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--warning);
    text-shadow: 0 0 30px rgba(234, 179, 8, 0.4);
    animation: celebPop 0.5s ease-out;
  }

  @keyframes celebPop {
    0% { transform: scale(0); opacity: 0; }
    60% { transform: scale(1.2); }
    100% { transform: scale(1); opacity: 1; }
  }

  @keyframes celebFade {
    0%, 60% { opacity: 1; }
    100% { opacity: 0; }
  }

  h2 {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .score-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
  }

  .score-big {
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--accent);
  }

  .score-label {
    font-size: 0.85rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .summary {
    color: var(--text-secondary);
    font-size: 0.95rem;
  }

  .comparison {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .comp-item {
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.35rem 0.75rem;
    border-radius: var(--radius);
  }

  .positive {
    color: var(--success);
    background: rgba(34, 197, 94, 0.1);
  }

  .negative {
    color: var(--error);
    background: rgba(239, 68, 68, 0.1);
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
