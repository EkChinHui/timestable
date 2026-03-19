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
