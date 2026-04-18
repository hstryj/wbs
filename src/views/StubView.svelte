<script lang="ts">
  export let name: string;
  export let description: string = '';
</script>

<div class="inner-pane" style="padding:48px 20px;text-align:center;color:#7a92ad">
  <div style="font-size:48px;margin-bottom:16px;opacity:.4">🚧</div>
  <h2 style="color:#1F3864;font-size:18px;margin-bottom:8px">{name}</h2>
  <p style="margin-bottom:6px">Widok w trakcie migracji do Svelte.</p>
  {#if description}
    <p style="font-size:12px;max-width:520px;margin:0 auto">{description}</p>
  {/if}
  <p style="font-size:11px;margin-top:20px">
    Legacy (działająca) wersja: <a href="/legacy/index.html" style="color:#2E75B6">otwórz monolit HTML</a>
  </p>
</div>
