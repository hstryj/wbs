<script lang="ts">
  import { tree } from '../../lib/state/tree';
  import { warnMsg } from '../../lib/state/ui';
  import { rootWeightSum } from '../../lib/utils/wbs';

  $: rw = rootWeightSum($tree);
  $: diff = Math.round((rw - 100) * 10) / 10;
  $: baseWarn =
    $tree.length === 0
      ? null
      : Math.abs(diff) < 0.05
      ? { text: 'Suma wag = 100% ✓', cls: 'warn-ok' }
      : diff > 0
      ? { text: `Suma wag przekracza 100% o ${diff.toFixed(1)}%`, cls: 'warn-bad' }
      : { text: `Suma wag: brakuje ${Math.abs(diff).toFixed(1)}%`, cls: 'warn-bad' };
</script>

{#if baseWarn || $warnMsg}
  <div class="warn-bar {$warnMsg ? ($warnMsg.kind === 'bad' ? 'warn-bad' : 'warn-ok') : baseWarn?.cls}" style="display:block;margin:6px 14px">
    {$warnMsg?.text || baseWarn?.text}
  </div>
{/if}
