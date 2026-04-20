# WBS Editor

Aplikacja webowa do zarządzania strukturą podziału pracy (WBS) dla projektów przemysłowych. Obecna wersja działa jako SPA na Svelte + Vite + TypeScript, z logowaniem przez Supabase, synchronizacją projektu do chmury, dopracowanym mobilnym interfejsem dla edytora WBS i pierwszą warstwą danych pod przyszły panel admina.

## Funkcje

- **Edytor WBS** z hierarchią zadań, wagami i postępem
- **Mobilny shell** inspirowany aplikacjami bankowymi: kartowe sekcje, zwijane menu i osobny widok WBS na małych ekranach
- **Dashboard** z KPI projektu
- **Widok zespołu** i planowania osobowego
- **Ranking zadań** wg priorytetu, RAG i terminu
- **Gantt**, **Waterfall**, **Ryzyka**, **Worklog**, **BOM/Zamówienia**
- **Raport** i snapshoty
- **Szablony WBS**
- **Logowanie przez Supabase Auth** (email/hasło + magic link)
- **Cloud sync projektu** przez Supabase po zalogowaniu
- **Pierwszy panel admina**: organizacje, role firmowe, katalog pracowników i staffing aktywnego projektu

## Uruchomienie lokalnie

```bash
npm install
npm run dev
```

Domyślnie aplikacja działa bez backendu i zapisuje dane lokalnie w przeglądarce.

Przydatne komendy:

```bash
npm run check
npm run build
npm run preview
```

## Supabase / Cloud sync

Do włączenia auth i przyszłego cloud sync potrzebujesz lokalnego pliku `.env.local`:

```bash
cp .env.example .env.local
```

Następnie uzupełnij:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Po zalogowaniu aplikacja automatycznie otwiera lub tworzy projekt i synchronizuje cały bieżący payload projektu przez Supabase. Status synchronizacji widać w pasku stanu na dole aplikacji.

### Warstwa admina

Repo ma już migracje pod panel administracyjny i onboarding firmy:

- `organizations` i `organization_members` dla ról firmowych,
- `organization_employees` jako centralny katalog pracowników,
- `project_staffing` do przypisywania pracowników do projektów,
- `projects.organization_id` do spinania projektów z organizacją,
- `organization_invitations` do zapraszania ludzi po mailu,
- RPC `create_organization_for_me`, `create_org_project_for_me`, `attach_project_to_organization` i `accept_org_invitation`.

Po stronie klienta gotowe API siedzi w [src/lib/cloud/admin.ts](src/lib/cloud/admin.ts), a pierwszy widok admina jest dostępny w [src/views/AdminView.svelte](src/views/AdminView.svelte). Owner lub admin może już wysłać zaproszenie do organizacji po mailu, a po zalogowaniu użytkownik jest automatycznie wciągany do firmy. Jeśli migracje `005_admin_organizations.sql` i `006_org_invitations.sql` nie zostały jeszcze uruchomione na bazie, panel pokaże czytelny komunikat setupowy zamiast pustego błędu.

## Mobile UX

Na ekranach `<= 820px` aplikacja przełącza się na osobny układ mobilny:

- sekcje projektu są dostępne jako poziomy rail kafelków i pionowe zwijane menu,
- toolbar dostaje mobilne szybkie akcje,
- edytor WBS pokazuje karty projektów i zadań zamiast ściskanej tabeli,
- pola opcjonalnych kolumn są przełączane z poziomu poziomego raila kafelków.
- ekran logowania ma osobny, poprawiony układ mobilny z bezpiecznym viewportem i kompaktowym formularzem.

## Deployment

Deploy produkcyjny idzie z `main` na Netlify przez `npm run build`, więc push na `main` aktualizuje wersję live.

## Dokumentacja

- Stan projektu i kolejny krok roboczy: [HANDOFF.md](HANDOFF.md)
- Przykładowe zmienne środowiskowe: [.env.example](.env.example)
