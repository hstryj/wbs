<script lang="ts">
  import { tree } from '../lib/state/tree';
  import { assignCodes, nodeDonePct } from '../lib/utils/wbs';
  import { escSVG } from '../lib/utils/escape';
  import type { WbsNode } from '../lib/types';

  interface LaidOut extends WbsNode {
    _lw: number;
    _kids: LaidOut[];
    _x: number;
    _y: number;
  }

  const NW = 160, NH = 72, HG = 20, VG = 52, PAD = 20;

  let depth: number = 99;

  $: ($tree, assignCodes($tree));
  $: svgData = buildSVG($tree, depth);

  function ndColor(n: WbsNode): { fill: string; stroke: string; text: string; bar: string } {
    const p = Math.round(nodeDonePct(n));
    if (p >= 100) return { fill: '#e8f7e8', stroke: '#3B7A1E', text: '#1a5c1a', bar: '#3B7A1E' };
    if (p > 0) return { fill: '#e8f2fb', stroke: '#2E75B6', text: '#0d3060', bar: '#2E75B6' };
    return { fill: '#fff8f4', stroke: '#ED7D31', text: '#7a3800', bar: '#ED7D31' };
  }

  function layout(n: LaidOut, maxD: number, cur: number): void {
    const kids = (maxD === 99 || cur < maxD) ? (n.children as LaidOut[]) : [];
    if (!kids.length) {
      n._lw = NW;
      n._kids = [];
      return;
    }
    n._kids = kids;
    let tw = 0;
    kids.forEach((k, i) => {
      layout(k, maxD, cur + 1);
      tw += k._lw + (i > 0 ? HG : 0);
    });
    n._lw = Math.max(NW, tw);
  }

  function position(n: LaidOut, x: number, y: number): void {
    n._x = x;
    n._y = y;
    if (!n._kids?.length) return;
    let tw = 0;
    n._kids.forEach((k, i) => { tw += k._lw + (i > 0 ? HG : 0); });
    let sx = x + NW / 2 - tw / 2;
    const cy = y + NH + VG;
    n._kids.forEach((k) => {
      position(k, sx, cy);
      sx += k._lw + HG;
    });
  }

  function wrapTxt(s: string, maxLen: number): string[] {
    const words = s.split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (t.length > maxLen && cur) {
        lines.push(cur);
        cur = w;
      } else cur = t;
    }
    if (cur) lines.push(cur);
    if (lines.length > 2) {
      lines.splice(2);
      lines[1] = lines[1].substring(0, maxLen - 1) + '…';
    } else if (lines.length === 1 && lines[0].length > maxLen) {
      lines[0] = lines[0].substring(0, maxLen - 1) + '…';
    }
    return lines;
  }

  function collectSVG(n: LaidOut, els: string[], maxY: { v: number }): void {
    const c = ndColor(n);
    const done = Math.round(nodeDonePct(n));
    const px = n._x, py = n._y;
    if (n._kids?.length) {
      const fx = px + NW / 2, fy = py + NH, my = py + NH + VG / 2;
      n._kids.forEach((k) => {
        const tx = k._x + NW / 2, ty = k._y;
        els.push(`<path d="M${fx} ${fy} L${fx} ${my} L${tx} ${my} L${tx} ${ty}" fill="none" stroke="#b8cce0" stroke-width="1.5" stroke-linejoin="round"/>`);
        collectSVG(k, els, maxY);
      });
    }
    els.push(`<rect x="${px + 3}" y="${py + 3}" width="${NW}" height="${NH}" rx="7" fill="rgba(0,0,0,.07)"/>`);
    els.push(`<rect x="${px}" y="${py}" width="${NW}" height="${NH}" rx="7" fill="${c.fill}" stroke="${c.stroke}" stroke-width="1.5"/>`);
    const barY = py + NH - 10;
    els.push(`<rect x="${px + 8}" y="${barY}" width="${NW - 16}" height="4" rx="2" fill="#dde8f4"/>`);
    const bw = Math.round((NW - 16) * done / 100);
    if (bw > 0) els.push(`<rect x="${px + 8}" y="${barY}" width="${bw}" height="4" rx="2" fill="${c.bar}"/>`);
    els.push(`<text x="${px + 8}" y="${py + 14}" font-size="9" font-family="Courier New,monospace" fill="${c.stroke}" font-weight="700">${escSVG(n._code || '')}</text>`);
    if (n.priority) {
      const pdot = n.priority === 'Krytyczny' ? '#cc0000' : n.priority === 'Wysoki' ? '#cc5500' : n.priority === 'Średni' ? '#cc9900' : '#339922';
      els.push(`<circle cx="${px + NW - 10}" cy="${py + 10}" r="5" fill="${pdot}" opacity=".85"/>`);
    }
    const name = n.name || '(bez nazwy)';
    const lines = wrapTxt(name, 22);
    const startTY = py + 26 + (lines.length === 1 ? 4 : 0);
    for (let li = 0; li < Math.min(lines.length, 2); li++) {
      els.push(`<text x="${px + NW / 2}" y="${startTY + li * 13}" font-size="11" font-family="Arial,sans-serif" fill="${c.text}" font-weight="600" text-anchor="middle">${escSVG(lines[li])}</text>`);
    }
    els.push(`<text x="${px + 8}" y="${barY - 2}" font-size="9" font-family="Arial,sans-serif" fill="${c.stroke}">${n.weight}%</text>`);
    els.push(`<text x="${px + NW - 8}" y="${barY - 2}" font-size="9" font-family="Arial,sans-serif" fill="${c.stroke}" text-anchor="end">${done}%</text>`);
    if (maxY.v < py + NH) maxY.v = py + NH;
  }

  function buildSVG(t: WbsNode[], maxD: number): { width: number; height: number; html: string } {
    if (!t.length) {
      return { width: 400, height: 60, html: '<text x="20" y="40" font-family="Arial" font-size="13" fill="#7a92ad">Brak danych WBS.</text>' };
    }
    // deep clone (so we can annotate _lw/_x/_y without mutating store state)
    const cloned: LaidOut[] = JSON.parse(JSON.stringify(t));
    cloned.forEach((n) => layout(n, maxD, 0));
    let totalW = 0;
    cloned.forEach((n, i) => { totalW += n._lw + (i > 0 ? HG : 0); });
    let cx = PAD;
    cloned.forEach((n) => { position(n, cx, PAD); cx += n._lw + HG; });
    const els: string[] = [];
    const maxY = { v: 0 };
    cloned.forEach((n) => collectSVG(n, els, maxY));
    return { width: totalW + PAD * 2, height: maxY.v + PAD + 16, html: els.join('') };
  }
</script>

<div class="chart-toolbar">
  <label for="tree-depth-select">Głębokość:</label>
  <select id="tree-depth-select" bind:value={depth}>
    <option value={99}>Wszystkie poziomy</option>
    <option value={1}>Tylko sekcje główne</option>
    <option value={2}>2 poziomy</option>
    <option value={3}>3 poziomy</option>
    <option value={4}>4 poziomy</option>
  </select>
</div>
<div class="gantt-wrap">
  <svg class="gantt-svg" width={svgData.width} height={svgData.height}>{@html svgData.html}</svg>
</div>
