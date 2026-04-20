# HANDOFF — WBS Editor

Techniczny przegląd stanu repo dla kolejnego agenta pracującego już bez kontekstu poprzednich wątków.

## 1. Cel produktu i status

**Cel.** Webowa aplikacja do zarządzania WBS (Work Breakdown Structure) dla projektów przemysłowych: hierarchia zadań, KPI, zespół, ranking, Gantt, ryzyka, worklog, BOM/zamówienia i raport.

**Status.** Frontend działa jako SPA na Svelte + Vite + TypeScript. Logowanie Supabase jest aktywne, aplikacja po zalogowaniu automatycznie otwiera lub tworzy projekt i synchronizuje jego payload przez warstwę cloud w [src/lib/cloud/sync.ts](/Users/hans/Documents/wbs/src/lib/cloud/sync.ts). Dodatkowo główny edytor WBS ma już osobny, dopracowany układ mobilny: sekcje są kartowe, menu jest zwijane, a tabela WBS na telefonie została zastąpiona zestawem kart projektów i zadań. Ekran logowania dostał też osobny, poprawiony układ mobilny. W repo jest również pierwszy działający widok panelu admina oraz warstwa danych pod organizacje, role firmowe, katalog pracowników, staffing projektów i zaproszenia do organizacji po mailu.

## 2. Architektura aplikacji

```text
index.html   -> src/main.ts -> mount <App/>
App.svelte   -> Topbar + ProjectHeader + Toolbar + TabBar
             -> <svelte:component this={VIEWS[$activeTab]} />
             -> StatusBar
```

- Routing bez biblioteki: aktywna zakładka siedzi w store `activeTab`.
- Stan aplikacji jest rozbity na domenowe store'y w `src/lib/state/*`.
- Każdy ważny store zapisuje się do `localStorage` przez `persistStore(...)`.
- Auth/klient Supabase siedzą w `src/lib/supabase/client.ts` i `src/lib/state/auth.ts`.
- Sync projektu siedzi w [src/lib/cloud/sync.ts](/Users/hans/Documents/wbs/src/lib/cloud/sync.ts) i [src/lib/cloud/projects.ts](/Users/hans/Documents/wbs/src/lib/cloud/projects.ts), a stan aktywnego projektu w [src/lib/state/currentProject.ts](/Users/hans/Documents/wbs/src/lib/state/currentProject.ts).
- Styling to czyste CSS z tokenami i warstwą komponentową, bez Tailwinda.
- Dla ekranów `<= 820px` aplikacja przełącza się na osobny shell mobile w `TabBar.svelte`, `Toolbar.svelte`, `WbsColumnPanel.svelte` i `WbsEditorView.svelte`.

## 3. Stack i komendy

- Svelte 4.2 + Vite 5 + TypeScript
- `@supabase/supabase-js` 2.x
- Netlify jako hosting dla `main`

Komendy:

```bash
npm install
npm run dev
npm run check
npm run build
npm run preview
```

## 4. Kluczowe ścieżki

- Entry: [index.html](index.html), [src/main.ts](src/main.ts), [src/App.svelte](src/App.svelte)
- Widoki: [src/views](src/views)
- Komponenty UI: [src/components](src/components)
- Store'y: [src/lib/state](src/lib/state)
- Typy domenowe: [src/lib/types.ts](src/lib/types.ts)
- Supabase client: [src/lib/supabase/client.ts](src/lib/supabase/client.ts)
- Cloud sync: [src/lib/cloud](src/lib/cloud)
- Admin cloud API: [src/lib/cloud/admin.ts](src/lib/cloud/admin.ts)
- Migracje Supabase: [supabase/migrations](supabase/migrations)
- Env example: [.env.example](.env.example)

## 5. Co zostało zrobione mobilnie

- `TabBar.svelte` ma mobilny hero-card z aktywną sekcją, poziomy rail kafelków i rozwijane pionowe menu sekcji.
- `Toolbar.svelte` ma mobilny zestaw szybkich akcji w formie kart.
- `WbsColumnPanel.svelte` ma mobilny rail przełączników pól kart.
- `WbsEditorView.svelte` renderuje na telefonie osobny widok:
  - `WbsProjectCard.svelte` dla punktów głównych,
  - `WbsTaskCard.svelte` dla zadań i sekcji,
  - `WbsAddCard.svelte` dla akcji dodawania kolejnych elementów.
- Desktopowy układ tabeli został zostawiony bez usuwania; mobile działa równolegle przez `desktop-only` / `mobile-only`.
- `AuthGate.svelte` ma poprawiony mobilny viewport, układ kartowy i bardziej kompaktowy formularz logowania na telefonie.

## 6. Co jest nadal niedokończone

- Mobilny shell jest gotowy dla głównego edytora WBS, ale inne widoki nadal są głównie responsywnym desktopem, a nie pełnym mobile-first flow.
- Nie ma wygenerowanych typów DB (`database.types.ts`).
- Nie ma testów.
- Brakuje warstwy publikacyjnej PWA: manifestu, ikon, ewentualnego service workera i decyzji czy publikujemy jako PWA czy wrapper store'owy.
- `snapshots` nadal obejmują tylko serializację `tree` i `people`, a nie pełny stan projektu.
- Panel admina ma już pierwszy UI w [src/views/AdminView.svelte](/Users/hans/Documents/wbs/src/views/AdminView.svelte), w tym flow zapraszania użytkowników do organizacji po mailu.
- `App.svelte` automatycznie akceptuje oczekujące zaproszenia organizacyjne po zalogowaniu użytkownika, zanim wykona `autoOpenProject()`.
- Migracje `005_admin_organizations.sql` i `006_org_invitations.sql` są w repo, ale nie zostały jeszcze przeze mnie odpalone na żywej bazie z tego środowiska, bo brak tu dostępu administracyjnego do SQL Executora / CLI.

## 7. Znane ryzyka

- `structuredClone` w `tree.ts` i kilku store'ach kopiuje całe payloady przy edycji.
- `persistStore` tłumi problemy z quota `localStorage`, więc użytkownik może nie dostać czytelnego sygnału o braku zapisu.
- Cloud sync działa payloadowo na całym projekcie, więc polityka konfliktów jest nadal praktycznie `last write wins`.
- Mobilny widok WBS jest nowy i logicznie poprawny, ale nie był jeszcze przepalony na fizycznym urządzeniu przez pełny scenariusz użytkownika.

## 8. Następne sensowne kroki

Priorytet z perspektywy "domknąć produkt w maksymalnie kilku następnych turach":

1. Odpalić na żywej bazie migracje [005_admin_organizations.sql](/Users/hans/Documents/wbs/supabase/migrations/005_admin_organizations.sql:1) i [006_org_invitations.sql](/Users/hans/Documents/wbs/supabase/migrations/006_org_invitations.sql:1), żeby zakładka `Admin` i zaproszenia działały live.
2. Spiąć `project_staffing` z projektowym store `people`, żeby projekt mógł zaciągać obsadę z katalogu firmy zamiast ręcznego wpisywania.
3. Dodać lepszy model ról / dostępu organizacyjnego: ewentualne invite-by-domain, SSO i później MFA tylko dla ról wrażliwych.
4. Domknąć checklistę publikacyjną: typy DB z Supabase, manifest/ikony/splash i decyzję czy idziemy jako PWA czy wrapper store'owy.
