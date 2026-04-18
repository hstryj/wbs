<script lang="ts">
  import { materials, addMaterial, updateMaterial, deleteMaterial } from '../lib/state/materials';
  import { boms, addBom, deleteBom, addBomItem, deleteBomItem, updateBomItem, updateBom } from '../lib/state/materials';
  import type { Material } from '../lib/types';
  import type { BomItem } from '../lib/state/materials';
  import { escH } from '../lib/utils/escape';

  type SubTab = 'bom' | 'mat';
  let sub: SubTab = 'bom';

  // ── Materials DB state ───────────────────────────────────────────
  let matSearch = '';
  let editMat: Material | null = null;
  let matForm: Partial<Material> = {};

  function openNewMat() {
    editMat = null;
    matForm = { code: '', name: '', cat: '', unit: 'szt', price: 0, currency: 'PLN' };
  }
  function openEditMat(m: Material) {
    editMat = m;
    matForm = { ...m };
  }
  function saveMat() {
    if (!matForm.name?.trim()) return;
    if (editMat) {
      updateMaterial(editMat.id, matForm);
    } else {
      addMaterial(matForm as Omit<Material, 'id'>);
    }
    editMat = null;
    matForm = {};
  }
  function cancelMat() {
    editMat = null;
    matForm = {};
  }
  function onDeleteMat(id: string, name: string) {
    if (confirm(`Usunąć materiał "${name}"?`)) deleteMaterial(id);
  }

  $: filteredMats = $materials.filter((m) => {
    if (!matSearch) return true;
    const q = matSearch.toLowerCase();
    return (m.name || '').toLowerCase().includes(q) || (m.code || '').toLowerCase().includes(q);
  });

  // ── BOM state ─────────────────────────────────────────────────────
  let openBomId: string | null = null;
  let newBomName = '';
  let newBomWbs = '';
  let newItem: Partial<BomItem> = { qty: 1 };

  function onCreateBom() {
    const name = newBomName.trim() || 'Nowa lista';
    const id = addBom(name, newBomWbs.trim() || undefined);
    openBomId = id;
    newBomName = '';
    newBomWbs = '';
  }
  function onDeleteBom(id: string, name: string) {
    if (confirm(`Usunąć listę „${name}"?`)) {
      deleteBom(id);
      if (openBomId === id) openBomId = null;
    }
  }
  function onAddItemFromMaterial(bomId: string, materialId: string) {
    const mat = $materials.find((m) => m.id === materialId);
    if (!mat) return;
    addBomItem(bomId, {
      materialId: mat.id,
      code: mat.code || '',
      name: mat.name,
      unit: mat.unit || 'szt',
      qty: newItem.qty || 1,
      price: mat.price || 0,
      currency: mat.currency || 'PLN'
    });
    newItem = { qty: 1 };
  }
  function onAddCustomItem(bomId: string) {
    if (!newItem.name?.trim()) return;
    addBomItem(bomId, {
      code: newItem.code || '',
      name: newItem.name,
      unit: newItem.unit || 'szt',
      qty: newItem.qty || 1,
      price: newItem.price || 0,
      currency: newItem.currency || 'PLN'
    });
    newItem = { qty: 1 };
  }
  function onUpdateItemQty(bomId: string, idx: number, e: Event) {
    const qty = parseFloat((e.target as HTMLInputElement).value) || 0;
    updateBomItem(bomId, idx, { qty });
  }

  function bomTotal(items: BomItem[]): number {
    return items.reduce((a, it) => a + (it.qty || 0) * (it.price || 0), 0);
  }

  $: openBom = $boms.find((b) => b.id === openBomId) || null;

  let quickAddMaterial = '';

  function onBomNameChange(id: string, e: Event) {
    updateBom(id, { name: (e.target as HTMLInputElement).value });
  }
</script>

<div class="inner-pane">
  <div style="display:flex;gap:0;border-bottom:2px solid #d0deee;margin-bottom:18px">
    <button
      style="padding:8px 18px;font-size:12px;font-weight:700;cursor:pointer;border:none;background:transparent;margin-bottom:-2px;{sub === 'bom' ? 'color:#1F3864;border-bottom:3px solid #2E75B6' : 'color:#5a7aaa;border-bottom:3px solid transparent'}"
      on:click={() => (sub = 'bom')}
    >📋 Listy materiałowe</button>
    <button
      style="padding:8px 18px;font-size:12px;font-weight:700;cursor:pointer;border:none;background:transparent;margin-bottom:-2px;{sub === 'mat' ? 'color:#1F3864;border-bottom:3px solid #2E75B6' : 'color:#5a7aaa;border-bottom:3px solid transparent'}"
      on:click={() => (sub = 'mat')}
    >🗄 Baza materiałów</button>
  </div>

  {#if sub === 'mat'}
    <!-- ───── MATERIALS DB ───── -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:8px;flex-wrap:wrap">
      <input
        type="text"
        placeholder="🔍 Szukaj..."
        bind:value={matSearch}
        style="border:1px solid #b8d0eb;border-radius:6px;padding:5px 9px;font-size:12px;width:200px"
      />
      <button
        on:click={openNewMat}
        style="background:#2E75B6;color:#fff;border:none;border-radius:7px;padding:7px 16px;font-size:12px;font-weight:700;cursor:pointer"
      >+ Dodaj materiał</button>
    </div>

    {#if editMat !== null || Object.keys(matForm).length > 0}
      <div style="background:#f4f8fc;border:1px solid #d0deee;border-radius:8px;padding:12px;margin-bottom:14px">
        <div style="font-weight:700;color:#1F3864;margin-bottom:8px">
          {editMat ? 'Edycja: ' + editMat.name : 'Nowy materiał'}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <input placeholder="Kod" bind:value={matForm.code} style="width:120px;border:1px solid #b8d0eb;border-radius:4px;padding:6px 8px;font-size:12px" />
          <input placeholder="Nazwa*" bind:value={matForm.name} style="flex:1;min-width:200px;border:1px solid #b8d0eb;border-radius:4px;padding:6px 8px;font-size:12px" />
          <input placeholder="Kategoria" bind:value={matForm.cat} style="width:140px;border:1px solid #b8d0eb;border-radius:4px;padding:6px 8px;font-size:12px" />
          <input placeholder="J.m." bind:value={matForm.unit} style="width:60px;border:1px solid #b8d0eb;border-radius:4px;padding:6px 8px;font-size:12px" />
          <input type="number" step="0.01" placeholder="Cena" bind:value={matForm.price} style="width:90px;border:1px solid #b8d0eb;border-radius:4px;padding:6px 8px;font-size:12px" />
          <input placeholder="Waluta" bind:value={matForm.currency} style="width:70px;border:1px solid #b8d0eb;border-radius:4px;padding:6px 8px;font-size:12px" />
          <button on:click={saveMat} class="btn btn-green" style="margin:0">Zapisz</button>
          <button on:click={cancelMat} class="btn" style="background:#e8eff8;color:#1F3864;border-color:#b8d0eb">Anuluj</button>
        </div>
      </div>
    {/if}

    <div class="tbl-wrap">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:#1F3864;color:#fff">
            <th style="padding:7px 10px;text-align:left;white-space:nowrap">Kod</th>
            <th style="padding:7px 10px;text-align:left">Nazwa</th>
            <th style="padding:7px 10px;text-align:left">Kategoria</th>
            <th style="padding:7px 10px;text-align:center">J.m.</th>
            <th style="padding:7px 10px;text-align:right">Cena netto</th>
            <th style="padding:7px 10px;text-align:center">Waluta</th>
            <th style="padding:7px 10px;text-align:center"></th>
          </tr>
        </thead>
        <tbody>
          {#if !filteredMats.length}
            <tr>
              <td colspan="7" style="padding:28px;text-align:center;color:#7a92ad">
                {$materials.length ? 'Brak wyników.' : 'Baza jest pusta. Kliknij „Dodaj materiał".'}
              </td>
            </tr>
          {:else}
            {#each filteredMats as m, i}
              <tr style="background:{i % 2 === 0 ? '#fff' : '#f8fbff'};border-bottom:1px solid #e8f0f8">
                <td style="padding:6px 10px;font-family:monospace;font-size:11px;color:#5a7aaa">{m.code || '—'}</td>
                <td style="padding:6px 10px;font-weight:600;color:#1F3864">{m.name}</td>
                <td style="padding:6px 10px;font-size:11px">{m.cat || '—'}</td>
                <td style="padding:6px 10px;text-align:center">{m.unit || ''}</td>
                <td style="padding:6px 10px;text-align:right">{(m.price || 0).toFixed(2)}</td>
                <td style="padding:6px 10px;text-align:center">{m.currency || 'PLN'}</td>
                <td style="padding:5px 8px;white-space:nowrap;text-align:center">
                  <button
                    on:click={() => openEditMat(m)}
                    style="border:1px solid #b8d0eb;background:#e8f0fb;color:#1a5094;border-radius:5px;padding:3px 8px;font-size:11px;font-weight:700;cursor:pointer;margin-right:3px"
                  >✏</button>
                  <button
                    on:click={() => onDeleteMat(m.id, m.name)}
                    style="border:1px solid #e8c0c0;background:#fce8e8;color:#8b1a1a;border-radius:5px;padding:3px 8px;font-size:11px;font-weight:700;cursor:pointer"
                  >🗑</button>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  {:else}
    <!-- ───── BOMs LIST ───── -->
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap">
      <input placeholder="Nazwa listy..." bind:value={newBomName} style="flex:1;min-width:180px;border:1px solid #b8d0eb;border-radius:4px;padding:6px 10px;font-size:12px" />
      <input placeholder="Kod WBS (opcja)" bind:value={newBomWbs} style="width:140px;border:1px solid #b8d0eb;border-radius:4px;padding:6px 10px;font-size:12px" />
      <button on:click={onCreateBom} class="btn btn-blue" style="margin:0">+ Nowa lista</button>
    </div>

    {#if !$boms.length}
      <div style="color:#7a92ad;font-style:italic;font-size:12px;padding:40px 0;text-align:center">
        Brak list materiałowych. Utwórz pierwszą powyżej.
      </div>
    {:else}
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;margin-bottom:16px">
        {#each $boms as b}
          {@const total = bomTotal(b.items)}
          <div
            style="background:{openBomId === b.id ? '#e8f3fb' : '#f4f8fc'};border:1px solid {openBomId === b.id ? '#2E75B6' : '#d0deee'};border-radius:8px;padding:12px;cursor:pointer"
            on:click={() => (openBomId = openBomId === b.id ? null : b.id)}
            on:keydown={(e) => e.key === 'Enter' && (openBomId = openBomId === b.id ? null : b.id)}
            role="button"
            tabindex="0"
          >
            <div style="font-weight:700;color:#1F3864;margin-bottom:4px">{b.name}</div>
            <div style="font-size:11px;color:#5a7aaa">
              {b.ts}{b.wbsCode ? ' • WBS: ' + b.wbsCode : ''}
            </div>
            <div style="font-size:11px;margin-top:6px">
              {b.items.length} poz. • <strong>{total.toFixed(2)} {b.items[0]?.currency || 'PLN'}</strong>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {#if openBom}
      <div style="background:#fff;border:2px solid #2E75B6;border-radius:10px;padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:8px;flex-wrap:wrap">
          <input
            value={openBom.name}
            on:change={(e) => onBomNameChange(openBom.id, e)}
            style="font-size:14px;font-weight:700;color:#1F3864;border:none;border-bottom:1px solid #d0deee;padding:4px;flex:1;min-width:200px"
          />
          <button on:click={() => onDeleteBom(openBom.id, openBom.name)} class="btn" style="background:#fde8e8;color:#8b1a1a;border-color:#e8c0c0">Usuń listę</button>
        </div>

        <!-- Add from database -->
        {#if $materials.length}
          <div style="background:#f4f8fc;border-radius:6px;padding:10px;margin-bottom:10px">
            <div style="font-size:12px;font-weight:700;color:#1F3864;margin-bottom:6px">Dodaj z bazy:</div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <select bind:value={quickAddMaterial} style="flex:1;min-width:200px;border:1px solid #b8d0eb;border-radius:4px;padding:6px 8px;font-size:12px">
                <option value="">— wybierz materiał —</option>
                {#each $materials as m}
                  <option value={m.id}>{m.code ? `[${m.code}] ` : ''}{m.name}</option>
                {/each}
              </select>
              <input type="number" min="0" step="0.5" bind:value={newItem.qty} style="width:70px;border:1px solid #b8d0eb;border-radius:4px;padding:6px 8px;font-size:12px" placeholder="Ilość" />
              <button
                on:click={() => {
                  if (quickAddMaterial) {
                    onAddItemFromMaterial(openBom.id, quickAddMaterial);
                    quickAddMaterial = '';
                  }
                }}
                class="btn btn-green"
                style="margin:0"
              >+ Dodaj</button>
            </div>
          </div>
        {/if}

        <!-- Add custom item -->
        <div style="background:#fff3e0;border-radius:6px;padding:10px;margin-bottom:12px">
          <div style="font-size:12px;font-weight:700;color:#7a4000;margin-bottom:6px">Lub dodaj pozycję spoza bazy:</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            <input placeholder="Kod" bind:value={newItem.code} style="width:100px;border:1px solid #d0ae80;border-radius:4px;padding:6px 8px;font-size:12px" />
            <input placeholder="Nazwa*" bind:value={newItem.name} style="flex:1;min-width:180px;border:1px solid #d0ae80;border-radius:4px;padding:6px 8px;font-size:12px" />
            <input placeholder="J.m." bind:value={newItem.unit} style="width:60px;border:1px solid #d0ae80;border-radius:4px;padding:6px 8px;font-size:12px" />
            <input type="number" placeholder="Ilość" bind:value={newItem.qty} style="width:70px;border:1px solid #d0ae80;border-radius:4px;padding:6px 8px;font-size:12px" />
            <input type="number" step="0.01" placeholder="Cena" bind:value={newItem.price} style="width:90px;border:1px solid #d0ae80;border-radius:4px;padding:6px 8px;font-size:12px" />
            <button on:click={() => onAddCustomItem(openBom.id)} class="btn" style="background:#ED7D31;color:#fff;border-color:#ba5a1d">+ Dodaj</button>
          </div>
        </div>

        <!-- Items table -->
        <div class="tbl-wrap">
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr style="background:#2E75B6;color:#fff">
                <th style="padding:6px 10px;text-align:left">Kod</th>
                <th style="padding:6px 10px;text-align:left">Nazwa</th>
                <th style="padding:6px 10px;text-align:center">J.m.</th>
                <th style="padding:6px 10px;text-align:right">Ilość</th>
                <th style="padding:6px 10px;text-align:right">Cena</th>
                <th style="padding:6px 10px;text-align:right">Wartość</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {#if !openBom.items.length}
                <tr>
                  <td colspan="7" style="text-align:center;padding:20px;color:#7a92ad;font-style:italic">Brak pozycji — dodaj materiały powyżej.</td>
                </tr>
              {:else}
                {#each openBom.items as it, idx}
                  <tr style="border-bottom:1px solid #e8f0f8">
                    <td style="padding:5px 10px;font-family:monospace;font-size:11px">{it.code || '—'}</td>
                    <td style="padding:5px 10px;font-weight:600;color:#1F3864">{it.name}</td>
                    <td style="padding:5px 10px;text-align:center">{it.unit}</td>
                    <td style="padding:3px 6px;text-align:right">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={it.qty}
                        on:input={(e) => onUpdateItemQty(openBom.id, idx, e)}
                        style="width:64px;padding:4px 6px;border:1px solid #c5d4e8;border-radius:4px;text-align:right;font-size:11px"
                      />
                    </td>
                    <td style="padding:5px 10px;text-align:right">{(it.price || 0).toFixed(2)} {it.currency || ''}</td>
                    <td style="padding:5px 10px;text-align:right;font-weight:700">{((it.qty || 0) * (it.price || 0)).toFixed(2)}</td>
                    <td style="padding:4px 6px;text-align:center">
                      <button
                        on:click={() => deleteBomItem(openBom.id, idx)}
                        style="border:1px solid #e8c0c0;background:#fce8e8;color:#8b1a1a;border-radius:4px;padding:2px 8px;font-size:11px;cursor:pointer"
                      >✕</button>
                    </td>
                  </tr>
                {/each}
                <tr style="background:#1a3057;color:#fff;font-weight:700">
                  <td colspan="5" style="padding:8px 10px;text-align:right">RAZEM NETTO:</td>
                  <td style="padding:8px 10px;text-align:right">{bomTotal(openBom.items).toFixed(2)} {openBom.items[0]?.currency || 'PLN'}</td>
                  <td></td>
                </tr>
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  {/if}
</div>
