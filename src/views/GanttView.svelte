<script lang="ts">
  import { writable } from 'svelte/store';
  import { tree } from '../lib/state/tree';
  import { assignCodes, collectLeaves } from '../lib/utils/wbs';
  import { escSVG } from '../lib/utils/escape';
  import { PRIORITY_COLOR, PRIORITY_DOT } from '../lib/utils/priority';
  import { persistStore } from '../lib/state/persistence';
  import { todayISO, daysBetween } from '../lib/utils/dates';
  import type { WbsNode } from '../lib/types';

  type Mode = 'timeline' | 'list';
  type Filter = 'all' | 'open' | 'critical';

  const initialMode: Mode = (() => {
    try {
      const s = localStorage.getItem('wbs_gantt_mode');
      if (s === 'timeline' || s === 'list') return s;
    } catch {}
    return window.innerWidth <= 768 ? 'list' : 'timeline';
  })();

  const mode = writable<Mode>(initialMode);
  persistStore(mode, 'wbs_gantt_mode');

  let filter: Filter = 'all';

  $: ($tree, assignCodes($tree));
  $: items = collectLeaves($tree).filter((n) => {
    if (!n.dateStart && !n.dateEnd) return false;
    if (filter === 'open' && (n.done || 0) >= 100) return false;
    if (filter === 'critical' && n.priority !== 'Krytyczny') return false;
    return true;
  });

  $: today = todayISO();

  // ── Timeline (SVG) ────────────────────────────────────────────────
  $: timelineSVG = buildTimeline(items, today);

  function buildTimeline(its: WbsNode[], todayStr: string): { width: number; height: number; html: string } {
    if (!its.length) {
      return {
        width: 600,
        height: 60,
        html: '<text x="20" y="40" font-family="Arial" font-size="13" fill="#7a92ad">Brak zadań z ustawionymi datami. Ustaw daty Start / Koniec w Edytorze WBS.</text>'
      };
    }
    const allDates: string[] = [];
    its.forEach((n) => {
      if (n.dateStart) allDates.push(n.dateStart);
      if (n.dateEnd) allDates.push(n.dateEnd);
    });
    const minDate = allDates.reduce((a, b) => (a < b ? a : b));
    const maxDate = allDates.reduce((a, b) => (a > b ? a : b));
    const dMin = new Date(minDate); dMin.setDate(dMin.getDate() - 2);
    const dMax = new Date(maxDate); dMax.setDate(dMax.getDate() + 2);
    const totalDays = Math.max(1, Math.round((dMax.getTime() - dMin.getTime()) / 86400000));
    const LBL_W = 220, DAY_W = Math.max(18, Math.min(36, Math.floor(900 / totalDays)));
    const ROW_H = 28, HDR_H = 36, PAD = 10;
    const svgW = LBL_W + DAY_W * totalDays + PAD * 2;
    const svgH = HDR_H + ROW_H * its.length + PAD;
    const todayOff = Math.round((new Date(todayStr).getTime() - dMin.getTime()) / 86400000);

    const els: string[] = [`<rect width="${svgW}" height="${svgH}" fill="#f8fbff"/>`];
    const months = ['Sty','Lut','Mar','Kwi','Maj','Cze','Lip','Sie','Wrz','Paź','Lis','Gru'];
    const cur = new Date(dMin);
    let lastMon = -1;
    for (let di = 0; di < totalDays; di++) {
      const x = LBL_W + PAD + di * DAY_W;
      const mon = cur.getMonth();
      if (mon !== lastMon) {
        els.push(`<text x="${x + 2}" y="14" font-size="10" font-family="Arial" fill="#5a7aaa" font-weight="700">${months[mon]} ${cur.getFullYear()}</text>`);
        lastMon = mon;
      }
      const dow = cur.getDay();
      const dayBg = dow === 0 || dow === 6 ? '#f0f4f8' : '#fff';
      els.push(`<rect x="${x}" y="${HDR_H}" width="${DAY_W}" height="${svgH - HDR_H}" fill="${dayBg}" opacity=".6"/>`);
      if (DAY_W >= 22) {
        els.push(`<text x="${x + DAY_W / 2}" y="${HDR_H - 6}" text-anchor="middle" font-size="9" font-family="Arial" fill="#7a92ad">${cur.getDate()}</text>`);
      }
      els.push(`<line x1="${x}" y1="${HDR_H}" x2="${x}" y2="${svgH}" stroke="#e0eaf5" stroke-width="1"/>`);
      cur.setDate(cur.getDate() + 1);
    }
    if (todayOff >= 0 && todayOff <= totalDays) {
      const tx = LBL_W + PAD + todayOff * DAY_W;
      els.push(`<line x1="${tx}" y1="${HDR_H}" x2="${tx}" y2="${svgH}" stroke="#c0392b" stroke-width="1.5" stroke-dasharray="4,3"/>`);
      els.push(`<text x="${tx + 2}" y="${HDR_H + 10}" font-size="9" font-family="Arial" fill="#c0392b" font-weight="700">Dziś</text>`);
    }
    its.forEach((n, i) => {
      const y = HDR_H + i * ROW_H;
      const rowBg = i % 2 === 0 ? '#fff' : '#f4f8fc';
      els.push(`<rect x="0" y="${y}" width="${svgW}" height="${ROW_H}" fill="${rowBg}" opacity=".5"/>`);
      const lbl = ((n._code || '') + ' ' + n.name).substring(0, 30);
      els.push(`<text x="${LBL_W + PAD - 6}" y="${y + ROW_H / 2 + 4}" text-anchor="end" font-size="11" font-family="Arial" fill="#1a3a6a" font-weight="600">${escSVG(lbl)}</text>`);
      const sOff = n.dateStart ? Math.max(0, Math.round((new Date(n.dateStart).getTime() - dMin.getTime()) / 86400000)) : 0;
      const eOff = n.dateEnd ? Math.min(totalDays, Math.round((new Date(n.dateEnd).getTime() - dMin.getTime()) / 86400000) + 1) : sOff + 1;
      const barX = LBL_W + PAD + sOff * DAY_W;
      const barW = Math.max(DAY_W, (eOff - sOff) * DAY_W);
      let color = PRIORITY_COLOR[n.priority || ''] || '#5a7aaa';
      const isOver = n.dateEnd && n.dateEnd < todayStr && (n.done || 0) < 100;
      if (isOver) color = '#c0392b';
      els.push(`<rect x="${barX}" y="${y + 5}" width="${barW}" height="${ROW_H - 10}" rx="4" fill="${color}" opacity=".18"/>`);
      const progW = Math.round((barW * (n.done || 0)) / 100);
      if (progW > 0) {
        els.push(`<rect x="${barX}" y="${y + 5}" width="${progW}" height="${ROW_H - 10}" rx="4" fill="${color}" opacity=".75"/>`);
      }
      if (barW > 30) {
        const txtColor = progW > barW / 2 ? '#fff' : color;
        els.push(`<text x="${barX + barW / 2}" y="${y + ROW_H / 2 + 4}" text-anchor="middle" font-size="10" font-family="Arial" fill="${txtColor}" font-weight="700">${n.done || 0}%</text>`);
      }
      if (n.md && barW > 50) {
        els.push(`<text x="${barX + barW + 3}" y="${y + ROW_H / 2 + 4}" font-size="9" font-family="Arial" fill="#7a92ad">${n.md}md</text>`);
      }
    });
    return { width: svgW, height: svgH, html: els.join('') };
  }

  // ── List (cards) ──────────────────────────────────────────────────
  $: listItems = (() => {
    const sorted = [...items];
    sorted.sort((a, b) => {
      const aOver = a.dateEnd && a.dateEnd < today && (a.done || 0) < 100;
      const bOver = b.dateEnd && b.dateEnd < today && (b.done || 0) < 100;
      if (aOver && !bOver) return -1;
      if (!aOver && bOver) return 1;
      const ae = a.dateEnd || a.dateStart || '';
      const be = b.dateEnd || b.dateStart || '';
      if (ae !== be) return ae < be ? -1 : 1;
      return 0;
    });
    return sorted;
  })();

  function cardColor(n: WbsNode): string {
    const over = n.dateEnd && n.dateEnd < today && (n.done || 0) < 100;
    if (over) return '#c0392b';
    return PRIORITY_COLOR[n.priority || ''] || '#5a7aaa';
  }

  function statusFor(n: WbsNode): { kind: 'over' | 'today' | 'soon' | 'ok' | 'none'; text: string } {
    if (!n.dateEnd) return { kind: 'none', text: '' };
    const done = n.done || 0;
    if (n.dateEnd < today && done < 100) {
      const d = daysBetween(n.dateEnd, today);
      return { kind: 'over', text: `⚠ Przeterminowane ${d} dn` };
    }
    if (n.dateEnd === today) return { kind: 'today', text: '📌 Termin dziś' };
    const d = daysBetween(today, n.dateEnd);
    if (d <= 7) return { kind: 'soon', text: `⏰ za ${d} dn` };
    return { kind: 'ok', text: `za ${d} dn` };
  }
</script>

<div class="ctrl-bar" style="padding:10px 14px;background:#f4f8fc;border-bottom:1px solid #e0eaf5;border:1px solid #c5d4e8;border-top:none">
  <div class="gantt-mode-toggle">
    <button class="gantt-mode-btn" class:active={$mode === 'timeline'} on:click={() => mode.set('timeline')}>📅 Oś czasu</button>
    <button class="gantt-mode-btn" class:active={$mode === 'list'}     on:click={() => mode.set('list')}>📋 Lista</button>
  </div>
  <label for="gantt-filter-select" style="font-size:11px;color:#5a7aaa;font-weight:600">Pokaż:</label>
  <select id="gantt-filter-select" bind:value={filter} style="font-size:11px;padding:3px 7px;border:1px solid #c5d4e8;border-radius:5px;color:#222">
    <option value="all">Wszystkie z datami</option>
    <option value="open">Nieukończone</option>
    <option value="critical">Tylko krytyczne</option>
  </select>
  <span style="font-size:11px;color:#7a92ad;margin-left:8px">Zadania bez dat nie są wyświetlane.</span>
</div>

{#if $mode === 'timeline'}
  <div class="gantt-wrap">
    <svg class="gantt-svg" width={timelineSVG.width} height={timelineSVG.height}>{@html timelineSVG.html}</svg>
  </div>
{:else}
  <div class="gantt-list">
    {#if !listItems.length}
      <div style="padding:32px 20px;text-align:center;color:#7a92ad;font-size:13px">
        Brak zadań z ustawionymi datami.<br>Ustaw daty Start / Koniec w Edytorze WBS.
      </div>
    {:else}
      {#each listItems as n}
        {@const col = cardColor(n)}
        {@const s = statusFor(n)}
        {@const over = s.kind === 'over'}
        <div class="gc-card" data-over={over ? '1' : null} style="border-left-color:{col}">
          <div class="gc-hdr">
            <span class="gc-code">{n._code || ''}</span>
            <span class="gc-name">{n.name || '–'}</span>
            {#if n.priority}
              <span class="gc-pri">{PRIORITY_DOT[n.priority]} {n.priority}</span>
            {/if}
          </div>
          <div class="gc-dates">
            {#if n.dateStart}<span class="gc-date"><b>Start:</b> {n.dateStart}</span>{/if}
            {#if n.dateEnd}<span class="gc-date"><b>Koniec:</b> {n.dateEnd}</span>{/if}
            {#if s.text}<span class="gc-status gc-{s.kind}">{s.text}</span>{/if}
          </div>
          <div class="gc-bar-wrap">
            <div class="gc-bar-bg"><div class="gc-bar-fg" style="width:{Math.min(n.done || 0, 100)}%;background:{col}"></div></div>
            <span class="gc-pct" style="color:{col}">{n.done || 0}%</span>
          </div>
          {#if n.resp || n.md}
            <div class="gc-meta">
              {#if n.resp}<span>👤 {n.resp}</span>{/if}
              {#if n.md}<span>⏱ {n.md} md</span>{/if}
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
{/if}
