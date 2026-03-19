<script lang="ts">
  let { correct, correctAnswer }: { correct: boolean; correctAnswer: number } = $props();
</script>

<div class="feedback" class:correct class:wrong={!correct}>
  {#if correct}
    <span class="icon">&#10003;</span> Correct!
  {:else}
    <span class="icon">&#10007;</span> The answer is {correctAnswer}
  {/if}
</div>

<style>
  .feedback {
    font-size: 1.3rem;
    font-weight: 600;
    padding: 0.75rem 1.5rem;
    border-radius: var(--radius);
    text-align: center;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: center;
  }

  .icon {
    font-size: 1.5rem;
    line-height: 1;
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
