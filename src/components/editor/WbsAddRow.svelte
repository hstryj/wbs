<script lang="ts">
  /** Inline "Dodaj kolejną..." row rendered inside tbody. Może być klik-handler
   * (sibling add) albo root-add z ciemnym tłem dla końca drzewa. */
  export let onClick: () => void;
  export let label: string;
  export let bg: string = '';
  export let colspan: number = 13;
  export let variant: 'normal' | 'root' = 'normal';

  const rootStyle = 'background:#253a5a';
</script>

{#if variant === 'root'}
  <tr style={rootStyle}>
    <td {colspan}>
      <div
        class="add-inline"
        on:click={onClick}
        on:keydown={(e) => e.key === 'Enter' && onClick()}
        role="button"
        tabindex="0"
        style="color:rgba(255,255,255,.55)"
      >{label}</div>
    </td>
  </tr>
{:else}
  <tr class="add-row" style="background:{bg}">
    <td {colspan}>
      <div
        class="add-inline"
        on:click={onClick}
        on:keydown={(e) => e.key === 'Enter' && onClick()}
        role="button"
        tabindex="0"
      >{label}</div>
    </td>
  </tr>
{/if}
