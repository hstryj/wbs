<script lang="ts">
  import { overallPct } from '../lib/state/tree';
</script>

<div class="topbar">
  <h1>WBS – Edytor projektu</h1>
  <span class="pill">Zaawansowanie: {$overallPct.toFixed(1)}%</span>
</div>
