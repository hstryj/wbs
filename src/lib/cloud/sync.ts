/**
 * Cloud sync — synchronizuje wszystkie store'y aplikacji z payload
 * w tabeli projects.payload (JSONB). Debounced 1500ms po ostatniej
 * zmianie — oszczędza requestów przy szybkim pisaniu.
 */
import { get, type Writable } from 'svelte/store';
import { tree } from '../state/tree';
import { people } from '../state/people';
import { risks } from '../state/risks';
import { changelog } from '../state/changelog';
import { snapshots } from '../state/snapshots';
import { worklog, projectSettings } from '../state/worklog';
import { materials, boms } from '../state/materials';
import { templates, templateCategories } from '../state/templates';
import { projectMeta } from '../state/project';
import { currentProject } from '../state/currentProject';
import { getProject, updateProjectPayload, createProject, listProjects } from './projects';

/**
 * Które store'y syncujemy do cloud'a. Klucz = nazwa pola w payload.
 * NOT cloud'owane: colVis, activeTab, theme — to UI state per-device.
 */
function allStores(): Record<string, Writable<any>> {
  return {
    tree,
    people,
    risks,
    changelog,
    snapshots,
    worklog,
    projectSettings,
    materials,
    boms,
    templates,
    templateCategories,
    projectMeta
  };
}

let stopFn: (() => void) | null = null;

/**
 * Załaduj payload z cloud'a do wszystkich store'ów. Nie startuje sync —
 * tylko hydrate. Po tym można wywołać startCloudSync() aby push'ować
 * zmiany z powrotem.
 */
export async function loadFromCloud(projectId: string): Promise<{ error: string | null }> {
  currentProject.update((s) => ({ ...s, status: 'loading', error: null }));
  const res = await getProject(projectId);
  if (res.error || !res.data) {
    const msg = res.error?.message || 'Nie znaleziono projektu';
    currentProject.update((s) => ({ ...s, status: 'error', error: msg }));
    return { error: msg };
  }
  const payload = (res.data.payload || {}) as Record<string, any>;
  const stores = allStores();
  for (const [key, store] of Object.entries(stores)) {
    if (payload[key] !== undefined) {
      store.set(payload[key]);
    }
  }
  currentProject.update((s) => ({
    ...s,
    id: projectId,
    name: res.data!.name,
    status: 'synced',
    lastSyncedAt: new Date()
  }));
  return { error: null };
}

/**
 * Wypchnij aktualny stan wszystkich store'ów do cloud'a. Blocking —
 * czekaj na dokończenie. Zwykle wywoływany przez debounced scheduleSave().
 */
export async function pushToCloud(projectId: string): Promise<{ error: string | null }> {
  const stores = allStores();
  const payload: Record<string, unknown> = {};
  for (const [key, store] of Object.entries(stores)) {
    payload[key] = get(store);
  }
  currentProject.update((s) => ({ ...s, status: 'saving', error: null }));
  const res = await updateProjectPayload(projectId, payload);
  if (res.error) {
    currentProject.update((s) => ({ ...s, status: 'error', error: res.error!.message }));
    return { error: res.error.message };
  }
  currentProject.update((s) => ({ ...s, status: 'synced', lastSyncedAt: new Date() }));
  return { error: null };
}

/**
 * Uruchom ciągłą synchronizację z debounced save'em. Zwraca stop().
 * W komponentach/App.svelte wywołuj startCloudSync(id) gdy user się
 * zaloguje i wybierze projekt; stop() przy wylogowaniu/zmianie projektu.
 */
export function startCloudSync(projectId: string): () => void {
  // Zatrzymaj poprzednią sesję sync'u (jeśli była)
  if (stopFn) stopFn();

  const stores = allStores();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let hydrating = true;

  function scheduleSave() {
    if (hydrating) return; // nie zapisuj w czasie gdy sami ładujemy stan
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      pushToCloud(projectId).catch(() => {/* error już w store */});
    }, 1500);
  }

  // Subscribe do każdego store'a
  const unsubs: Array<() => void> = [];
  for (const [, store] of Object.entries(stores)) {
    unsubs.push(store.subscribe(() => scheduleSave()));
  }

  // Ustaw hydrating=false po microtasku (pierwsze subscribe wartości już się odpaliły)
  queueMicrotask(() => { hydrating = false; });

  stopFn = () => {
    unsubs.forEach((u) => u());
    if (timer) clearTimeout(timer);
    stopFn = null;
  };
  return stopFn;
}

/** Zatrzymaj sync (wywołaj przy logout / zmianie projektu). */
export function stopCloudSync(): void {
  if (stopFn) stopFn();
}

/**
 * Auto-open project po zalogowaniu: jeśli user ma projekty → otwórz
 * pierwszy (najnowszy). Jeśli nie ma → utwórz pusty z domyślną nazwą
 * i uplouduj obecny localStorage jako startowy payload (migracja lokalne
 * → cloud przy pierwszym logowaniu).
 */
export async function autoOpenProject(userEmail: string): Promise<{ projectId: string | null; error: string | null }> {
  currentProject.update((s) => ({ ...s, status: 'loading', error: null }));

  const listRes = await listProjects();
  if (listRes.error) {
    const msg = listRes.error.message;
    currentProject.update((s) => ({ ...s, status: 'error', error: msg }));
    return { projectId: null, error: msg };
  }

  if (listRes.data.length > 0) {
    // Otwórz najnowszy
    const latest = listRes.data[0];
    const r = await loadFromCloud(latest.id);
    return { projectId: latest.id, error: r.error };
  }

  // Brak projektów — utwórz pierwszy z obecnymi danymi localStorage
  const stores = allStores();
  const payload: Record<string, unknown> = {};
  for (const [key, store] of Object.entries(stores)) {
    payload[key] = get(store);
  }
  const defaultName = `Projekt ${userEmail.split('@')[0]}`;
  const created = await createProject(defaultName, payload);
  if (created.error || !created.data) {
    const msg = created.error?.message || 'Nie udało się utworzyć projektu';
    currentProject.update((s) => ({ ...s, status: 'error', error: msg }));
    return { projectId: null, error: msg };
  }
  currentProject.update((s) => ({
    ...s,
    id: created.data!.id,
    name: created.data!.name,
    status: 'synced',
    lastSyncedAt: new Date()
  }));
  return { projectId: created.data.id, error: null };
}
