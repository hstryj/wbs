# HANDOFF — WBS Editor

Techniczny przegląd stanu repo dla kolejnego agenta. Źródło prawdy: kod w tym worktree (branch `claude/cranky-gould-1b2188`, czysty, zsynchronizowany z `origin/main`).

---

## 1. Cel produktu i status

**Cel.** Aplikacja webowa do zarządzania WBS (Work Breakdown Structure) projektów przemysłowych: hierarchia zadań z wagami/progressem, dashboard KPI, zespół, ranking, Gantt, ryzyka, worklog, zamówienia materiałów, raport do PDF. Docelowo: wersja webowa + desktop.

**Status.** MVP webowe działa end-to-end w trybie **lokalnym** (localStorage). Zakończono port z monolitycznego single-file HTML (`public/legacy/index.html`) na Svelte 4 + Vite + TS (12 widoków, barrel w [src/views/index.ts](src/views/index.ts)). Ostatnia duża zmiana to **Supabase Phase 1** — klient + UI logowania działa, ale **żadne dane nie są jeszcze synchronizowane w chmurze**.

---

## 2. Architektura aplikacji

```
index.html   → src/main.ts → mount <App/>
App.svelte   → Topbar + ProjectHeader + Toolbar + TabBar
             → <svelte:component this={VIEWS[$activeTab]} />   ← dict-driven router
             → StatusBar
```

- **Routing.** Brak biblioteki — aktywna zakładka to store `activeTab` (typ `TabName` w [src/lib/types.ts:75](src/lib/types.ts:75)), `App.svelte` renderuje komponent z mapy `VIEWS` w [src/views/index.ts:37](src/views/index.ts:37).
- **Stan.** Svelte `writable` stores per-domain w [src/lib/state/](src/lib/state/). Każdy krytyczny store przepuszczony przez `persistStore(store, key)` z [src/lib/state/persistence.ts](src/lib/state/persistence.ts) — zapisuje do `localStorage` przy każdej subskrypcji.
- **Domain logic.** Czyste funkcje w [src/lib/utils/wbs.ts](src/lib/utils/wbs.ts) (m.in. `overallProgress`, `rootWeightSum`, `assignCodes`, `mkNode`). Stores wołają te funkcje w `derived(...)`.
- **Styling.** Globalne CSS bez Tailwinda — tokens w [src/styles/tokens.css](src/styles/tokens.css) (light/dark), główny zbiór komponentów w [src/styles/components.css](src/styles/components.css), mobile w [src/styles/mobile.css](src/styles/mobile.css).
- **Auth.** [src/lib/supabase/client.ts](src/lib/supabase/client.ts) → singleton Supabase; [src/lib/state/auth.ts](src/lib/state/auth.ts) → writable `auth` store podłączony do `onAuthStateChange`; [src/components/AuthMenu.svelte](src/components/AuthMenu.svelte) → przycisk „Zaloguj" + modal (signin/signup/magic link). Gdy env vars nie ustawione → widoczny badge „Lokalnie", app działa bez backendu.

---

## 3. Stack i komendy

**Stack**
- Svelte 4.2 + `@sveltejs/vite-plugin-svelte` 3.1
- Vite 5.4 (target es2020, `outDir: dist`, port 5173)
- TypeScript 5.5 (strict=false, patrz [tsconfig.json](tsconfig.json))
- svelte-check 3.8 (uruchamiany w `build`)
- `@supabase/supabase-js` 2.103 — jedyna runtime dependency

**Komendy** (patrz [package.json](package.json))
```
npm install
npm run dev       # vite dev server, port 5173
npm run check     # svelte-check, type-check
npm run build     # svelte-check + vite build → dist/
npm run preview   # vite preview z dist/
```

**Deploy.** Netlify, konfig w [netlify.toml](netlify.toml): `npm run build` → `dist/`. Branch `main` = produkcja.

---

## 4. Kluczowe ścieżki plików

| Obszar | Ścieżka |
|---|---|
| Entry | [index.html](index.html), [src/main.ts](src/main.ts), [src/App.svelte](src/App.svelte) |
| Router (dict) | [src/views/index.ts](src/views/index.ts) |
| Widoki | [src/views/](src/views/) (Dashboard, WbsEditor, Ranking, Team, Gantt, Personal**P**lan, Worklog**R**eport, Orders, Risks, Report, Tree, Waterfall, Changelog) |
| Chrome UI | [src/components/](src/components/) (Topbar, ProjectHeader, Toolbar, TabBar, StatusBar, AuthMenu, TemplatesModal, Gauge, SegmentedBar, ResourceBanner) |
| Edytor WBS (wiersze) | [src/components/editor/](src/components/editor/) |
| Stan | [src/lib/state/](src/lib/state/) (tree, people, risks, changelog, snapshots, worklog, materials, templates, project, theme, ui, auth, persistence) |
| Domain utils | [src/lib/utils/](src/lib/utils/) (wbs, dates, priority, id, escape) |
| Typy | [src/lib/types.ts](src/lib/types.ts) |
| Supabase klient | [src/lib/supabase/client.ts](src/lib/supabase/client.ts) |
| Style | [src/styles/](src/styles/) |
| Stary monolit (ref.) | [public/legacy/index.html](public/legacy/index.html) (280 kB) |
| Env wzór | [.env.example](.env.example) |

---

## 5. Co zostało zmienione ostatnio

`git log` (najnowsze merge'y do `main`):

1. **Supabase Phase 1** — PR #13 (`678689f`) — klient Supabase, `auth` store, komponent `AuthMenu` z signin/signup/magic link. **Dane jeszcze nie synchronizowane.**
2. **Personal Plan view** — PR #12 (`29421ca`) — widok planowania tygodniowego/miesięcznego ([PersonalPlanView.svelte](src/views/PersonalPlanView.svelte)).
3. **MD summary + hrsPerWeek + Templates** — PR #11 (`e8879a6`) — biblioteka szablonów WBS ([templates.ts](src/lib/state/templates.ts), [TemplatesModal.svelte](src/components/TemplatesModal.svelte)).
4. **UI polish** — PR #9/10 (`a736c57`, `abce2cb`) — paleta SAP Fiori / Atlassian, neutralne nagłówki tabel, zebra striping, efekty hover.
5. **Dashboard spec** — PR #8 (`b87359c`) — redesign zgodny z SAP/Jira/Procore (bez hero, z tabelą Zadania + metadata ribbon).
6. **Refaktor [WbsEditorView](src/views/WbsEditorView.svelte)** (`dcbf73e`) — z 386 do 125 linii, wiersze wydzielone do [src/components/editor/](src/components/editor/).
7. **System motywów** — PR #6/7 (`dd4005a`) — light/dark + tokens w [tokens.css](src/styles/tokens.css).
8. **Port Svelte round 2c** — PR #5 (`863e047`) — ostatnie 3 widoki zmigrowane z monolitu (12/12).

---

## 6. Co jest niedokończone

- **Cloud sync.** Wszystkie stores (`tree`, `people`, `risks`, `worklog`, `materials`, `templates`, `snapshots`, `changelog`, `project`) piszą **tylko do localStorage** — zalogowanie nic nie zmienia poza badge'em w topbarze. Brak upsert/realtime do Supabase.
- **Schemat DB.** Nie istnieje katalog `supabase/` w repo — zero migracji, zero RLS policies, zero seedów. Backend istnieje tylko w chmurze Supabase (jeśli user go tam sam zaprowadzi).
- **Multi-projekt.** Model zakłada pojedynczy drzewo `tree` w localStorage. UI ProjectHeader sugeruje więcej, ale store [project.ts](src/lib/state/project.ts) trzyma jeden obiekt.
- **Migracja localStorage → cloud.** Brak kroku „pierwszego importu" po zalogowaniu — istniejące lokalne dane nie zostaną przeniesione automatycznie.
- **Desktop app.** W README wspomniana jako cel, ale nie ma Tauri/Electron w zależnościach.
- **Testy.** Brak jakiegokolwiek test runnera / test suite.

---

## 7. Znane bugi i ryzyka

**Ryzyka**
- **Zero RLS.** Gdy tylko zaczniesz pisać do DB z klienta — domyślnie wszystko publiczne. Każda tabela w Supabase musi mieć `ENABLE ROW LEVEL SECURITY` + policy `auth.uid() = owner_id`, inaczej dane użytkowników będą widoczne dla wszystkich.
- **localStorage quota.** `worklog` (per-day entries) i `tree` (głębokie zagnieżdżenia + notatki) mogą urosnąć. `persistStore` łyka `QuotaExceededError` po cichu (patrz [persistence.ts:20](src/lib/state/persistence.ts:20)) — dane nie zostaną zapisane bez ostrzeżenia.
- **Konflikty multi-device.** Po podłączeniu chmury: brak strategii merge. Proste last-write-wins wymaże pracę offline z drugiego urządzenia.
- **`structuredClone` przy każdej edycji drzewa.** [tree.ts](src/lib/state/tree.ts) klonuje cały tree na każdy `setField` — przy dużych projektach może być zauważalne.
- **`svelte-check` w `build`.** Type errory blokują prod build. `strict: false` + `noImplicitAny: false` w [tsconfig.json](tsconfig.json) — typy są raczej sugestią.
- **Session detection w URL.** `detectSessionInUrl: true` w [client.ts](src/lib/supabase/client.ts) — magic link wymaga skonfigurowanego redirect URL w Supabase Dashboard (Auth → URL Configuration), inaczej pętla.

**Znane bugi** — żadnych zgłoszonych w commit history / issue tracker. Nie ma issue trackera w repo.

---

## 8. Supabase

**Stan w repo**
- Klient SDK: [src/lib/supabase/client.ts](src/lib/supabase/client.ts) — singleton, `isConfigured` guard (gdy env vars puste lub placeholder — `supabase = null`, app zostaje w trybie lokalnym).
- Auth: [src/lib/state/auth.ts](src/lib/state/auth.ts) — `signIn` / `signUp` / `signOut` / `sendMagicLink` + subskrypcja `onAuthStateChange`.
- UI: [src/components/AuthMenu.svelte](src/components/AuthMenu.svelte) — signin/signup/magic link modal, user avatar + popover z wylogowaniem.

**Czego NIE MA w repo**
- Brak katalogu `supabase/` (zero `migrations/`, `functions/`, `config.toml`, `seed.sql`).
- Brak zdefiniowanych tabel, typów DB (`database.types.ts`), RLS policies, triggerów.
- Brak Edge Functions.
- Brak Storage bucketów (Avatar komponent w `Person` to tylko `string` — URL albo initials, nie upload).
- Brak realtime subscriptions.

**Konfig w Supabase Dashboard (po stronie kolejnego agenta do ogarnięcia)**
- Auth → Email provider: włącz (signup + magic link korzystają).
- Auth → URL Configuration: `Site URL` + `Redirect URLs` = Netlify prod URL + `http://localhost:5173`.
- RLS: włączyć **przed** pierwszym insertem do nowej tabeli.

---

## 9. Wymagane env vars

Plik `.env.local` (lokalnie, **nie commitować** — patrz [.gitignore](.gitignore)), wzór w [.env.example](.env.example):

```
VITE_SUPABASE_URL=<Project URL z Supabase → Settings → API>
VITE_SUPABASE_ANON_KEY=<anon public key z tej samej strony>
```

- `anon public` key jest publiczny z definicji — bezpieczny w bundlu przeglądarki **pod warunkiem włączonego RLS**.
- **Nigdy** nie umieszczać `service_role` key w kliencie ani w repo.
- Na Netlify: Site settings → Environment variables → dodać oba klucze, żeby działały w produkcji.

---

## 10. Proponowane następne 3 kroki

1. **Schemat DB + RLS.** Utworzyć `supabase/migrations/0001_init.sql` z tabelami: `projects(id uuid, owner_id uuid, name, meta jsonb)`, `wbs_nodes(id, project_id, parent_id, ...pola z [types.ts](src/lib/types.ts))`, `people`, `risks`, `worklog_days(person_id, date, task_id, hours)`, `snapshots`, `templates`, `materials`. Dla każdej: `ENABLE ROW LEVEL SECURITY` + policy `owner_id = auth.uid()` na `SELECT/INSERT/UPDATE/DELETE`. Rozważyć `created_at`/`updated_at` + trigger.
2. **Synchronizacja `tree` jako pilot.** Najmniejsza powierzchnia, największa wartość. Reaktywna warstwa: po zalogowaniu `tree` robi initial pull z Supabase, lokalne edycje → debounced upsert (300–500 ms), realtime channel → patche przychodzące z innego device'u. Kluczowy wybór: **jedna kolumna JSONB z całym drzewem** (proste, łatwy merge via wersjonowanie) vs **rekursywne `wbs_nodes`** (reporting-friendly, ale złożona synchronizacja). Zacząć od JSONB, rozbić później jeśli raporty tego zażądają.
3. **Import localStorage → cloud przy pierwszym loginie.** Po `signIn` sprawdzić czy `localStorage['wbs_tree']` istnieje i czy tabela `projects` dla `auth.uid()` jest pusta — jeśli tak, pokazać modal „Wykryto lokalne dane — zaimportować do chmury?". Po imporcie: wyczyścić `localStorage` (lub zostawić jako backup z timestampem). Bez tego każdy istniejący user „straci" dane przy migracji.
