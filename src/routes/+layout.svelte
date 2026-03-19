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
