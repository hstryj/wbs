<script lang="ts">
  import { changelog } from '../lib/state/changelog';
  import { snapshots, takeSnapshot, restoreSnapshot, deleteSnapshot } from '../lib/state/snapshots';

  function onSnapshot() {
    const name = prompt('Nazwa snapshotu (np. "Po spotkaniu 15.04"):', 'Snapshot ' + ($snapshots.length + 1));
    if (name) takeSnapshot(name);
  }

  function onRestore(id: number, name: string) {
    if (confirm(`Przywrócić snapshot "${name}"? Aktualne dane zostaną zastąpione.`)) {
      restoreSnapshot(id);
    }
  }

  function onDelete(id: number, name: string) {
    if (confirm(`Usunąć snapshot "${name}"?`)) deleteSnapshot(id);
  }

  const tagLabel: Record<string, { cls: string; text: string }> = {
    edit: { cls: 'log-tag-edit', text: 'edycja' },
    snap: { cls: 'log-tag-snap', text: 'snapshot' },
    load: { cls: 'log-tag-load', text: 'restore' }
  };
</script>

<div class="inner-pane">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
    <div class="ds-h" style="margin:0;border:none;padding:0">Dziennik zmian i snapshoty</div>
    <button class="btn btn-green" on:click={onSnapshot}>📸 Utwórz snapshot</button>
  </div>

  {#if $snapshots.length}
    <div style="margin-bottom:20px">
      <div class="ds-h" style="font-size:12px;text-transform:uppercase;letter-spacing:.04em">Snapshoty ({$snapshots.length})</div>
      {#each $snapshots as s}
        <div class="snap-card">
          <div class="snap-card-info">
            <div style="font-weight:700;color:#1F3864;font-size:13px">{s.name}</div>
            <div style="font-size:11px;color:#7a92ad;margin-top:2px">{s.ts} • zaawansowanie: {s.overall}%</div>
          </div>
          <button class="btn btn-green" style="font-size:11px;padding:4px 10px" on:click={() => onRestore(s.id, s.name)}>Przywróć</button>
          <button class="btn-del" on:click={() => onDelete(s.id, s.name)} title="Usuń">&#10005;</button>
        </div>
      {/each}
    </div>
  {/if}

  <div class="ds-h" style="font-size:12px;text-transform:uppercase;letter-spacing:.04em">Historia zmian</div>
  {#if !$changelog.length}
    <p style="color:#7a92ad;font-size:12px;padding:20px 0">Brak zmian w dzienniku.</p>
  {:else}
    {#each $changelog as e}
      {@const tag = tagLabel[e.type] ?? { cls: '', text: e.type }}
      <div class="log-entry">
        <span class="log-time">{e.ts}</span>
        <span class="log-msg">
          <span class="log-tag {tag.cls}">{tag.text}</span>
          {e.msg}
        </span>
      </div>
    {/each}
  {/if}
</div>
