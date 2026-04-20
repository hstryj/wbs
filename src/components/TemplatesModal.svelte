<script lang="ts">
  import { tree } from '../lib/state/tree';
  import {
    templates, templateCategories,
    createTemplate, deleteTemplate, insertTemplate,
    addCategory, deleteCategory,
    type WbsTemplate
  } from '../lib/state/templates';
  import { collectLeaves } from '../lib/utils/wbs';
  import type { WbsNode } from '../lib/types';

  export let open = false;

  type Mode = 'browse' | 'save';
  let mode: Mode = 'browse';
  let search = '';
  let selectedCat = 'Wszystkie';
  let newCatName = '';

  // Save form state
  let fromNodeId: number | null = null;
  let tplName = '';
  let tplCategory = 'Ogólne';
  let tplDescription = '';
  let resetProgress = true;
  let resetDates = true;

  // List sections of the project (potential template sources)
  $: sectionList = (() => {
    const out: { id: number; name: string; code: string; leafCount: number }[] = [];
    for (const n of $tree) {
      if (n.isProject) {
        for (const s of n.children) {
          if (!s.isProject) {
            out.push({
              id: s.id,
              name: s.name || '(bez nazwy)',
              code: '',
              leafCount: collectLeaves([s]).length
            });
          }
        }
      } else {
        out.push({
          id: n.id,
          name: n.name || '(bez nazwy)',
          code: '',
          leafCount: collectLeaves([n]).length
        });
      }
    }
    return out;
  })();

  $: filtered = $templates.filter((t) => {
    if (selectedCat !== 'Wszystkie' && t.category !== selectedCat) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  function close() {
    open = false;
    mode = 'browse';
  }

  function onSaveTemplate() {
    if (fromNodeId === null) return;
    const src = findInTree($tree, fromNodeId);
    if (!src) return;
    createTemplate({
      name: tplName || src.name || 'Szablon',
      category: tplCategory,
      description: tplDescription,
      fromNode: src,
      resetProgress,
      resetDates
    });
    tplName = '';
    tplDescription = '';
    fromNodeId = null;
    mode = 'browse';
  }

  function onInsert(t: WbsTemplate) {
    insertTemplate(t.id);
    close();
  }

  function onDelete(t: WbsTemplate) {
    if (confirm(`Usunąć szablon "${t.name}"?`)) deleteTemplate(t.id);
  }

  function onAddCat() {
    if (!newCatName.trim()) return;
    addCategory(newCatName);
    selectedCat = newCatName.trim();
    newCatName = '';
  }

  function previewTree(nodes: WbsNode[], depth = 0): string[] {
    const lines: string[] = [];
    for (const n of nodes) {
      lines.push('  '.repeat(depth) + '· ' + (n.name || '(bez nazwy)') + (n.weight ? ` (${n.weight}%)` : ''));
      if (n.children?.length) lines.push(...previewTree(n.children, depth + 1));
    }
    return lines.slice(0, 12);
  }

  function findInTree(list: WbsNode[], id: number): WbsNode | null {
    for (const n of list) {
      if (n.id === id) return n;
      const c = findInTree(n.children, id);
      if (c) return c;
    }
    return null;
  }

</script>

{#if open}
  <div
    class="modal-bg"
    on:click|self={close}
    on:keydown={(e) => e.key === 'Escape' && close()}
    role="dialog"
    aria-modal="true"
    aria-label="Biblioteka szablonów"
    tabindex="-1"
  >
    <div class="tpl-modal">
      <header class="tpl-hdr">
        <h3>Biblioteka szablonów sekcji</h3>
        <div class="tpl-tabs">
          <button class:active={mode === 'browse'} on:click={() => (mode = 'browse')}>Przeglądaj ({$templates.length})</button>
          <button class:active={mode === 'save'} on:click={() => (mode = 'save')}>Zapisz nowy</button>
        </div>
        <button class="tpl-close" on:click={close} aria-label="Zamknij">✕</button>
      </header>

      {#if mode === 'browse'}
        <div class="tpl-body">
          <!-- Sidebar -->
          <aside class="tpl-sidebar">
            <div class="tpl-search">
              <input type="text" placeholder="🔍 Szukaj szablonu..." bind:value={search} />
            </div>
            <div class="tpl-cat-hdr">Kategorie</div>
            <ul class="tpl-cat-list">
              <li>
                <button
                  class:active={selectedCat === 'Wszystkie'}
                  on:click={() => (selectedCat = 'Wszystkie')}
                >
                  Wszystkie
                  <span class="tpl-cat-count">{$templates.length}</span>
                </button>
              </li>
              {#each $templateCategories as c}
                {@const count = $templates.filter((t) => t.category === c).length}
                <li>
                  <button class:active={selectedCat === c} on:click={() => (selectedCat = c)}>
                    {c}
                    <span class="tpl-cat-count">{count}</span>
                  </button>
                  {#if c !== 'Ogólne'}
                    <button class="tpl-cat-del" on:click={() => deleteCategory(c)} title="Usuń kategorię">✕</button>
                  {/if}
                </li>
              {/each}
            </ul>
            <div class="tpl-cat-add">
              <input type="text" bind:value={newCatName} placeholder="Nowa kategoria..." on:keydown={(e) => e.key === 'Enter' && onAddCat()} />
              <button on:click={onAddCat}>+</button>
            </div>
          </aside>

          <!-- Grid of cards -->
          <main class="tpl-main">
            {#if !filtered.length}
              <div class="tpl-empty">
                {#if $templates.length === 0}
                  <p>Brak szablonów. Użyj zakładki <strong>Zapisz nowy</strong>, aby utworzyć pierwszy.</p>
                {:else}
                  <p>Brak wyników dla <strong>{selectedCat}</strong>{search ? ` + "${search}"` : ''}.</p>
                {/if}
              </div>
            {:else}
              <div class="tpl-grid">
                {#each filtered as t}
                  <article class="tpl-card">
                    <div class="tpl-card-hdr">
                      <h4>{t.name}</h4>
                      <span class="tpl-card-cat">{t.category}</span>
                    </div>
                    {#if t.description}
                      <p class="tpl-card-desc">{t.description}</p>
                    {/if}
                    <div class="tpl-card-preview">
                      {#each previewTree(t.nodes) as line}
                        <div>{line}</div>
                      {/each}
                      {#if t.nodes[0] && collectLeaves(t.nodes).length > 12}
                        <div class="tpl-card-more">… +{collectLeaves(t.nodes).length - 12}</div>
                      {/if}
                    </div>
                    <div class="tpl-card-foot">
                      <span class="tpl-card-meta">{t.ts}</span>
                      <div class="tpl-card-actions">
                        <button class="btn btn-blue" on:click={() => onInsert(t)}>Wstaw</button>
                        <button class="tpl-card-del" on:click={() => onDelete(t)} title="Usuń szablon">✕</button>
                      </div>
                    </div>
                  </article>
                {/each}
              </div>
            {/if}
          </main>
        </div>
      {:else}
        <!-- Save new template form -->
        <div class="tpl-save">
          {#if !sectionList.length}
            <div class="tpl-empty">
              <p>Najpierw dodaj sekcję do drzewa WBS, żeby móc ją zapisać jako szablon.</p>
            </div>
          {:else}
            <div class="tpl-form-grid">
              <label>Sekcja źródłowa
                <select bind:value={fromNodeId}>
                  <option value={null}>— wybierz sekcję —</option>
                  {#each sectionList as s}
                    <option value={s.id}>{s.name} ({s.leafCount} zadań)</option>
                  {/each}
                </select>
              </label>
              <label>Kategoria
                <select bind:value={tplCategory}>
                  {#each $templateCategories as c}
                    <option value={c}>{c}</option>
                  {/each}
                </select>
              </label>
              <label class="form-full">Nazwa szablonu
                <input type="text" bind:value={tplName} placeholder="np. Szablon sekcji elektrycznej" />
              </label>
              <label class="form-full">Opis (opcjonalnie)
                <textarea bind:value={tplDescription} rows="3" placeholder="Krótki opis co zawiera ten szablon..."></textarea>
              </label>
              <label class="form-check">
                <input type="checkbox" bind:checked={resetProgress} />
                Wyzeruj postęp zadań (done → 0%)
              </label>
              <label class="form-check">
                <input type="checkbox" bind:checked={resetDates} />
                Wyzeruj daty Start/Koniec
              </label>
            </div>
            <div class="tpl-save-actions">
              <button class="btn" on:click={() => (mode = 'browse')} style="background:var(--bg-muted);color:var(--text-primary);border-color:var(--border)">Anuluj</button>
              <button class="btn btn-blue" on:click={onSaveTemplate} disabled={fromNodeId === null}>Zapisz szablon</button>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .tpl-modal {
    background: var(--bg-surface);
    border-radius: var(--radius-md);
    width: min(900px, 95vw);
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-lg);
    color: var(--text-primary);
    overflow: hidden;
  }

  .tpl-hdr {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-muted);
  }
  .tpl-hdr h3 {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-primary);
    flex-shrink: 0;
  }
  .tpl-tabs {
    display: flex;
    gap: 0;
    margin-left: 16px;
    flex: 1;
  }
  .tpl-tabs button {
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 500;
    font-family: inherit;
    color: var(--text-secondary);
    cursor: pointer;
    transition: color .12s, border-color .12s;
  }
  .tpl-tabs button:hover { color: var(--text-primary); }
  .tpl-tabs button.active {
    color: var(--brand-primary-dark);
    border-bottom-color: var(--brand-primary);
    font-weight: 600;
  }
  .tpl-close {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 16px;
    cursor: pointer;
    padding: 4px 10px;
    border-radius: var(--radius-sm);
  }
  .tpl-close:hover { color: var(--text-primary); background: var(--bg-subtle); }

  .tpl-body {
    display: grid;
    grid-template-columns: 220px 1fr;
    flex: 1;
    min-height: 0;
  }

  .tpl-sidebar {
    border-right: 1px solid var(--border);
    padding: 12px;
    overflow-y: auto;
    background: var(--bg-muted);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .tpl-search input {
    width: 100%;
    padding: 7px 10px;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    font-size: 12px;
    font-family: inherit;
    background: var(--bg-surface);
    color: var(--text-primary);
  }
  .tpl-search input:focus { outline: none; border-color: var(--brand-primary); box-shadow: 0 0 0 2px var(--brand-primary-bg); }
  .tpl-cat-hdr {
    font-size: 10px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: .06em;
    font-weight: 600;
    margin-top: 4px;
  }
  .tpl-cat-list {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .tpl-cat-list li {
    display: flex;
    align-items: stretch;
    gap: 2px;
  }
  .tpl-cat-list li button:first-child {
    flex: 1;
    background: transparent;
    border: none;
    text-align: left;
    padding: 6px 10px;
    font-size: 12px;
    font-family: inherit;
    color: var(--text-primary);
    cursor: pointer;
    border-radius: var(--radius-sm);
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: background .1s, color .1s;
  }
  .tpl-cat-list li button:first-child:hover { background: var(--bg-surface); }
  .tpl-cat-list li button:first-child.active {
    background: var(--brand-primary-bg);
    color: var(--brand-primary-dark);
    font-weight: 600;
  }
  .tpl-cat-count {
    font-size: 10px;
    color: var(--text-muted);
    background: var(--bg-surface);
    padding: 1px 6px;
    border-radius: 8px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .tpl-cat-list li button:first-child.active .tpl-cat-count {
    background: var(--brand-primary);
    color: #fff;
  }
  .tpl-cat-del {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0 6px;
    font-size: 11px;
    opacity: 0;
    transition: opacity .1s;
  }
  .tpl-cat-list li:hover .tpl-cat-del { opacity: 1; }
  .tpl-cat-del:hover { color: var(--color-danger); }

  .tpl-cat-add {
    display: flex;
    gap: 4px;
    margin-top: 6px;
  }
  .tpl-cat-add input {
    flex: 1;
    padding: 6px 8px;
    font-size: 11px;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    font-family: inherit;
    background: var(--bg-surface);
    color: var(--text-primary);
  }
  .tpl-cat-add button {
    padding: 6px 12px;
    border: 1px solid var(--border-strong);
    background: var(--bg-surface);
    color: var(--text-primary);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-family: inherit;
    font-weight: 700;
  }
  .tpl-cat-add button:hover { background: var(--brand-primary-bg); border-color: var(--brand-primary); color: var(--brand-primary-dark); }

  .tpl-main {
    overflow-y: auto;
    padding: 16px 18px;
  }
  .tpl-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 10px;
  }
  .tpl-card {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: border-color .12s, box-shadow .12s;
  }
  .tpl-card:hover {
    border-color: var(--brand-primary);
    box-shadow: var(--shadow-md);
  }
  .tpl-card-hdr {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
  }
  .tpl-card-hdr h4 {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }
  .tpl-card-cat {
    font-size: 10px;
    color: var(--text-secondary);
    background: var(--bg-muted);
    border: 1px solid var(--border);
    padding: 2px 7px;
    border-radius: var(--radius-sm);
    white-space: nowrap;
    font-weight: 600;
  }
  .tpl-card-desc {
    font-size: 11px;
    color: var(--text-secondary);
    line-height: 1.4;
    margin: 0;
  }
  .tpl-card-preview {
    font-size: 11px;
    color: var(--text-secondary);
    line-height: 1.5;
    background: var(--bg-muted);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    padding: 8px 10px;
    font-family: 'JetBrains Mono', monospace;
    white-space: pre;
    overflow: hidden;
  }
  .tpl-card-more { color: var(--text-muted); font-style: italic; }
  .tpl-card-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    border-top: 1px solid var(--border-subtle);
    padding-top: 8px;
  }
  .tpl-card-meta { font-size: 10px; color: var(--text-muted); }
  .tpl-card-actions { display: flex; gap: 4px; }
  .tpl-card-del {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-muted);
    font-size: 11px;
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-family: inherit;
  }
  .tpl-card-del:hover { background: var(--color-danger-bg); color: var(--color-danger); border-color: var(--color-danger); }

  .tpl-empty {
    text-align: center;
    padding: 40px;
    color: var(--text-muted);
    font-size: 13px;
  }

  /* Save form */
  .tpl-save { padding: 20px; overflow-y: auto; }
  .tpl-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .tpl-form-grid label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
  }
  .tpl-form-grid input[type="text"],
  .tpl-form-grid select,
  .tpl-form-grid textarea {
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    padding: 7px 10px;
    font-size: 13px;
    font-family: inherit;
    color: var(--text-primary);
    background: var(--bg-surface);
    resize: vertical;
  }
  .tpl-form-grid input:focus,
  .tpl-form-grid select:focus,
  .tpl-form-grid textarea:focus {
    outline: none;
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 2px var(--brand-primary-bg);
  }
  .form-full { grid-column: 1 / -1; }
  .form-check {
    flex-direction: row;
    align-items: center;
    gap: 8px;
    grid-column: 1 / -1;
    cursor: pointer;
  }
  .tpl-save-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 18px;
    padding-top: 14px;
    border-top: 1px solid var(--border);
  }

  /* Mobile */
  @media (max-width: 768px) {
    .tpl-body { grid-template-columns: 1fr; }
    .tpl-sidebar { border-right: none; border-bottom: 1px solid var(--border); max-height: 180px; }
    .tpl-form-grid { grid-template-columns: 1fr; }
  }
</style>
