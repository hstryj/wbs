<script lang="ts">
  export let onClick: () => void;
  export let label: string;
  export let bg: string = '';
  export let variant: 'normal' | 'root' = 'normal';
</script>

<button
  type="button"
  class="add-card"
  class:root={variant === 'root'}
  style={bg ? `background:${bg}` : undefined}
  on:click={onClick}
>
  <span class="add-card-copy">{label}</span>
</button>

<style>
  .add-card {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 64px;
    padding: 14px 18px;
    border: 1px dashed rgba(37, 84, 136, 0.28);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.9);
    color: #12345d;
    box-shadow: 0 10px 16px rgba(31, 56, 100, 0.06);
    cursor: pointer;
  }

  .add-card.root {
    background: linear-gradient(135deg, #1f3864 0%, #294f80 100%);
    border-style: solid;
    border-color: transparent;
    color: rgba(255, 255, 255, 0.92);
  }

  .add-card-copy {
    font-size: 14px;
    font-weight: 700;
    line-height: 1.35;
  }
</style>
