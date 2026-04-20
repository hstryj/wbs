# WBS Editor

Aplikacja webowa do zarządzania strukturą podziału pracy (WBS) dla projektów przemysłowych. Obecna wersja działa jako SPA na Svelte + Vite + TypeScript, z logowaniem przez Supabase, synchronizacją projektu do chmury i świeżo dopracowanym mobilnym interfejsem dla edytora WBS.

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

## Mobile UX

Na ekranach `<= 820px` aplikacja przełącza się na osobny układ mobilny:

- sekcje projektu są dostępne jako poziomy rail kafelków i pionowe zwijane menu,
- toolbar dostaje mobilne szybkie akcje,
- edytor WBS pokazuje karty projektów i zadań zamiast ściskanej tabeli,
- pola opcjonalnych kolumn są przełączane z poziomu poziomego raila kafelków.

## Deployment

Deploy produkcyjny idzie z `main` na Netlify przez `npm run build`, więc push na `main` aktualizuje wersję live.

## Dokumentacja

- Stan projektu i kolejny krok roboczy: [HANDOFF.md](HANDOFF.md)
- Przykładowe zmienne środowiskowe: [.env.example](.env.example)
