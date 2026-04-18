<script lang="ts">
  /** Semi-circular radial gauge. Shows 0-100% with arc fill and bold center number. */
  export let percent: number = 0;
  export let size: number = 220;
  export let label: string = '';
  export let colorByValue: boolean = true;

  $: clamped = Math.max(0, Math.min(100, percent));

  // Geometry
  $: cx = size / 2;
  $: cy = size / 2 + size * 0.08; // shift down so the arc fits without clipping
  $: radius = size * 0.38;
  $: strokeW = Math.max(12, size * 0.08);

  // Semi-circle from 180° (left) to 360°/0° (right) going through top
  // We use two stroke-dasharray tricks: arc length = π·r (half circle)
  $: arcLen = Math.PI * radius;
  $: fillLen = (clamped / 100) * arcLen;

  $: color = colorByValue
    ? (clamped >= 80 ? 'var(--color-success)' :
       clamped >= 50 ? 'var(--brand-primary)' :
       clamped >= 25 ? 'var(--color-warning)' :
       'var(--color-danger)')
    : 'var(--brand-primary)';
</script>

<div class="gauge-wrap" style="width:{size}px;height:{Math.round(size * 0.7)}px">
  <svg width={size} height={Math.round(size * 0.7)} viewBox="0 0 {size} {Math.round(size * 0.7)}" role="img" aria-label="{label}: {clamped.toFixed(1)}%">
    <!-- Track (full semi-circle) -->
    <path
      d="M {cx - radius} {cy} A {radius} {radius} 0 0 1 {cx + radius} {cy}"
      fill="none"
      stroke="var(--bg-muted)"
      stroke-width={strokeW}
      stroke-linecap="round"
    />
    <!-- Fill arc -->
    <path
      d="M {cx - radius} {cy} A {radius} {radius} 0 0 1 {cx + radius} {cy}"
      fill="none"
      stroke={color}
      stroke-width={strokeW}
      stroke-linecap="round"
      stroke-dasharray="{fillLen} {arcLen}"
      style="transition:stroke-dasharray .5s cubic-bezier(.4,0,.2,1), stroke .3s ease"
    />
    <!-- Number -->
    <text x={cx} y={cy - size * 0.03} text-anchor="middle" class="gauge-value" style="fill:{color}">
      {clamped.toFixed(1)}%
    </text>
    {#if label}
      <text x={cx} y={cy + size * 0.11} text-anchor="middle" class="gauge-label">{label}</text>
    {/if}
  </svg>
</div>

<style>
  .gauge-wrap {
    display: inline-block;
  }
  :global(.gauge-value) {
    font-size: 32px;
    font-weight: 700;
    font-family: inherit;
    letter-spacing: -0.02em;
  }
  :global(.gauge-label) {
    font-size: 11px;
    fill: var(--text-muted);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
</style>
