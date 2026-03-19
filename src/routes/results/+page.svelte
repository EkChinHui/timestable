<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
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
    if (!session) goto(`${base}/`);
  });

  function playAgain() {
    goto(`${base}/quiz`);
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
      <button class="secondary" onclick={() => goto(`${base}/`)}>Home</button>
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
