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

  function levelLabel(level: RiskLevel): string {
    return level === 'H' ? 'Wysoki' : level === 'M' ? 'Średni' : 'Niski';
  }
</script>

<div class="inner-pane risks-root">
  <div class="risk-add-shell">
    <div class="risk-add-head">
      <h2>Nowe ryzyko</h2>
      <p>Dodaj wpis i od razu przypisz właściciela oraz działanie korygujące.</p>
    </div>

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
  </div>

  <div class="tbl-wrap desktop-only">
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

  <div class="risk-mobile-list mobile-only">
    {#if !sorted.length}
      <div class="risk-mobile-empty">Brak zarejestrowanych ryzyk. Dodaj pierwsze ryzyko powyżej.</div>
    {:else}
      {#each sorted as r, i}
        {@const level = computeLevel(r.prob, r.impact)}
        <article class="risk-mobile-card">
          <div class="risk-mobile-top">
            <span class="risk-mobile-rank">#{i + 1}</span>
            <span class="risk-lvl-{level}">{levelLabel(level)}</span>
          </div>

          <h3>{r.desc}</h3>

          <div class="risk-mobile-rail">
            <div class="risk-mobile-tile">
              <span>Prawdopodob.</span>
              <strong>{PROB_DISPLAY[r.prob]}</strong>
            </div>
            <div class="risk-mobile-tile">
              <span>Wpływ</span>
              <strong>{PROB_DISPLAY[r.impact]}</strong>
            </div>
            <div class="risk-mobile-tile">
              <span>Właściciel</span>
              <strong>{r.owner || '—'}</strong>
            </div>
          </div>

          <div class="risk-mobile-note">
            <span>Mitygacja</span>
            <p>{r.mitigation || 'Brak zapisanego działania.'}</p>
          </div>

          <button class="risk-mobile-delete" on:click={() => delRisk(r.id)}>Usuń ryzyko</button>
        </article>
      {/each}
    {/if}
  </div>
</div>

<style>
  .risks-root {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .risk-add-shell {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px;
    border-radius: 26px;
    border: 1px solid rgba(20, 53, 95, 0.08);
    background:
      radial-gradient(circle at top right, rgba(46, 117, 182, 0.08), transparent 34%),
      linear-gradient(180deg, rgba(244, 248, 252, 0.94), #ffffff);
    box-shadow: 0 16px 28px rgba(31, 56, 100, 0.06);
  }

  .risk-add-head h2 {
    margin: 0 0 4px;
    font-size: 16px;
    color: var(--text-primary);
  }

  .risk-add-head p {
    margin: 0;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .risk-mobile-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .risk-mobile-card {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px;
    border-radius: 26px;
    border: 1px solid rgba(20, 53, 95, 0.08);
    background:
      radial-gradient(circle at top right, rgba(46, 117, 182, 0.1), transparent 36%),
      linear-gradient(180deg, rgba(244, 248, 252, 0.94), #ffffff);
    box-shadow: 0 16px 28px rgba(31, 56, 100, 0.08);
  }

  .risk-mobile-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .risk-mobile-rank {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 42px;
    height: 32px;
    border-radius: 999px;
    background: rgba(20, 53, 95, 0.08);
    color: var(--text-primary);
    font-size: 12px;
    font-weight: 800;
  }

  .risk-mobile-card h3 {
    margin: 0;
    font-size: 18px;
    line-height: 1.2;
    color: var(--text-primary);
  }

  .risk-mobile-rail {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 2px;
    -webkit-overflow-scrolling: touch;
  }

  .risk-mobile-tile {
    flex: 0 0 160px;
    min-width: 160px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 14px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(20, 53, 95, 0.08);
  }

  .risk-mobile-tile span {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .risk-mobile-tile strong {
    font-size: 14px;
    line-height: 1.3;
    color: var(--text-primary);
  }

  .risk-mobile-note {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(20, 53, 95, 0.08);
  }

  .risk-mobile-note span {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-secondary);
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .risk-mobile-note p {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-primary);
  }

  .risk-mobile-delete {
    min-height: 44px;
    border-radius: 18px;
    border: 1px solid rgba(139, 26, 26, 0.18);
    background: rgba(252, 232, 232, 0.96);
    color: #8b1a1a;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }

  .risk-mobile-empty {
    padding: 18px;
    border-radius: 22px;
    border: 1px dashed var(--border-strong);
    background: var(--bg-muted);
    color: var(--text-secondary);
    font-size: 13px;
    text-align: center;
  }

  @media (max-width: 520px) {
    .risk-add-shell,
    .risk-mobile-card {
      padding: 14px;
      border-radius: 24px;
    }
  }
</style>
