<script lang="ts">
  import { tree } from '../lib/state/tree';
  import { assignCodes, nodeDonePct, barColor } from '../lib/utils/wbs';
  import { escSVG } from '../lib/utils/escape';
  import type { WbsNode } from '../lib/types';

  type Level = 'root' | 'sub';
  let level: Level = 'root';

  $: ($tree, assignCodes($tree));

  type Item = { label: string; weight: number; done: number };

  $: items = (() => {
    const out: Item[] = [];
    if (level === 'root') {
      $tree.forEach((n) => out.push({ label: (n._code ?? '') + ' ' + n.name, weight: n.weight, done: Math.round(nodeDonePct(n)) }));
    } else {
      $tree.forEach((n) => n.children.forEach((c: WbsNode) => out.push({ label: (c._code ?? '') + ' ' + c.name, weight: c.weight, done: Math.round(nodeDonePct(c)) })));
    }
    return out;
  })();

  $: svgData = buildSVG(items);

  function buildSVG(its: Item[]): { width: number; height: number; html: string } {
    if (!its.length) return { width: 400, height: 60, html: '' };
    const BAR_H = 32, BAR_GAP = 14, LBL_W = 200, VAL_W = 60, PAD = 20;
    const BAR_AREA = 320;
    const SVG_W = LBL_W + VAL_W + BAR_AREA + PAD * 2;
    const svgH = PAD + (BAR_H + BAR_GAP) * its.length + 40;
    const els: string[] = [`<rect width="${SVG_W}" height="${svgH}" fill="#fff"/>`];
    for (const g of [25, 50, 75, 100]) {
      const x = LBL_W + PAD + Math.round((g / 100) * BAR_AREA);
      els.push(`<line x1="${x}" y1="${PAD}" x2="${x}" y2="${svgH - 24}" stroke="#e0eaf5" stroke-width="1" stroke-dasharray="4,3"/>`);
      els.push(`<text x="${x}" y="${svgH - 8}" text-anchor="middle" font-size="10" fill="#aabbc8">${g}%</text>`);
    }
    its.forEach((item, i) => {
      const y = PAD + (BAR_H + BAR_GAP) * i;
      const bw = Math.round((item.weight / 100) * BAR_AREA);
      const dw = Math.round((item.done / 100) * bw);
      const x = LBL_W + PAD;
      const lbl = (item.label || '').substring(0, 28);
      els.push(`<text x="${LBL_W + PAD - 6}" y="${y + BAR_H / 2 + 4}" text-anchor="end" font-size="11" font-family="Arial" fill="#1a3a6a" font-weight="600">${escSVG(lbl)}</text>`);
      els.push(`<rect x="${x}" y="${y}" width="${bw}" height="${BAR_H}" rx="4" fill="#e0eaf5"/>`);
      if (dw > 0) {
        const bc = barColor(item.done);
        els.push(`<rect x="${x}" y="${y}" width="${dw}" height="${BAR_H}" rx="4" fill="${bc}"/>`);
      }
      els.push(`<text x="${x + bw + 6}" y="${y + BAR_H / 2 + 4}" font-size="11" font-family="Arial" fill="#1F3864" font-weight="700">${item.weight}% wagi</text>`);
      if (dw > 20) {
        els.push(`<text x="${x + dw - 4}" y="${y + BAR_H / 2 + 4}" text-anchor="end" font-size="10" font-family="Arial" fill="#fff" font-weight="700">${item.done}%</text>`);
      }
    });
    return { width: SVG_W, height: svgH, html: els.join('') };
  }
</script>

<div class="chart-toolbar">
  <label for="wf-level-select">Poziom:</label>
  <select id="wf-level-select" bind:value={level}>
    <option value="root">Sekcje główne</option>
    <option value="sub">Podsekcje (2. poziom)</option>
  </select>
</div>
<div class="gantt-wrap">
  {#if !items.length}
    <div style="padding:32px 20px;text-align:center;color:#7a92ad;font-size:13px">Brak danych do wyświetlenia.</div>
  {:else}
    <svg class="gantt-svg" width={svgData.width} height={svgData.height}>{@html svgData.html}</svg>
  {/if}
</div>
