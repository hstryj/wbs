<script lang="ts">
  import type { RiskLevel } from '../lib/types';
  import { risks, addRisk, delRisk, computeLevel } from '../lib/state/risks';

  let desc = '';
  let prob: RiskLevel = 'M';
  let impact: RiskLevel = 'M';
  let owner = '';
  let mitigation = '';
  let descInput: HTMLInputElement;

  const LEVELS: RiskLevel[] = ['H', 'M', 'L'];
  const PROB_LABEL: Record<RiskLevel, string> = { H: '🔴 Wys. prawdop.', M: '🟡 Śred. prawdop.', L: '🟢 Nis. prawdop.' };
  const IMP_LABEL:  Record<RiskLevel, string> = { H: '🔴 Wys. wpływ',    M: '🟡 Śred. wpływ',    L: '🟢 Nis. wpływ'    };
  const LEVEL_ORDER: Record<RiskLevel, number> = { H: 0, M: 1, L: 2 };
  const PROB_DISPLAY: Record<RiskLevel, string> = { H: '🔴 Wysoki', M: '🟡 Średni', L: '🟢 Niski' };

  function submit() {
    if (!desc.trim()) {
      descInput?.focus();
      return;
    }
    addRisk(desc, prob, impact, owner, mitigation);
    desc = '';
    owner = '';
    mitigation = '';
  }

  $: sorted = [...$risks].sort((a, b) => {
    const la = computeLevel(a.prob, a.impact);
    const lb = computeLevel(b.prob, b.impact);
    return LEVEL_ORDER[la] - LEVEL_ORDER[lb];
  });
</script>

<div class="inner-pane">
  <div class="risk-add-form">
    <input
      type="text"
      bind:this={descInput}
      bind:value={desc}
      placeholder="Opis ryzyka..."
      style="flex:2;min-width:180px"
      on:keydown={(e) => e.key === 'Enter' && submit()}
    />
    <select bind:value={prob} style="width:140px">
      {#each LEVELS as v}
        <option value={v}>{PROB_LABEL[v]}</option>
      {/each}
    </select>
    <select bind:value={impact} style="width:140px">
      {#each LEVELS as v}
        <option value={v}>{IMP_LABEL[v]}</option>
      {/each}
    </select>
    <input type="text" bind:value={owner} placeholder="Właściciel ryzyka..." style="width:160px" />
    <input type="text" bind:value={mitigation} placeholder="Mitygacja / działanie..." style="flex:2;min-width:160px" />
    <button class="btn btn-blue" on:click={submit} style="white-space:nowrap">+ Dodaj ryzyko</button>
  </div>

  <div class="tbl-wrap">
    <table class="risk">
      <thead>
        <tr>
          <th style="width:36px">#</th>
          <th>Opis ryzyka</th>
          <th style="width:110px;text-align:center">Prawdopodob.</th>
          <th style="width:90px;text-align:center">Wpływ</th>
          <th style="width:80px;text-align:center">Poziom</th>
          <th style="width:130px">Właściciel</th>
          <th>Mitygacja</th>
          <th style="width:40px"></th>
        </tr>
      </thead>
      <tbody>
        {#if !sorted.length}
          <tr>
            <td colspan="8" style="text-align:center;padding:24px;color:#7a92ad;font-style:italic">
              Brak zarejestrowanych ryzyk. Dodaj pierwsze ryzyko powyżej.
            </td>
          </tr>
        {:else}
          {#each sorted as r, i}
            {@const level = computeLevel(r.prob, r.impact)}
            <tr>
              <td style="text-align:center;color:#7a92ad;font-weight:700">{i + 1}</td>
              <td style="font-weight:600;color:#1a3a6a">{r.desc}</td>
              <td style="text-align:center">{PROB_DISPLAY[r.prob]}</td>
              <td style="text-align:center">{PROB_DISPLAY[r.impact]}</td>
              <td style="text-align:center">
                <span class="risk-lvl-{level}">
                  {level === 'H' ? 'Wysoki' : level === 'M' ? 'Średni' : 'Niski'}
                </span>
              </td>
              <td style="color:#555">{r.owner || '—'}</td>
              <td style="color:#555">{r.mitigation || '—'}</td>
              <td style="text-align:center">
                <button class="btn-del" on:click={() => delRisk(r.id)} title="Usuń ryzyko">&#10005;</button>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>
