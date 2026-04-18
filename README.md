# WBS Editor

Aplikacja webowa do zarządzania strukturą podziału pracy (WBS) dla projektów przemysłowych.

## Funkcje

- **Edytor WBS** — hierarchiczna struktura zadań z wagami i postępem wykonania
- **Dashboard** — KPI projektu w pigułce
- **Widok zespołu** — karty pracowników, harmonogram godzin, dokumenty
- **Ranking zadań** — sortowanie wg priorytetu, RAG, terminu
- **Gantt** — oś czasu projektu
- **Rejestr ryzyk** — poziomy H/M/L
- **Raport** — eksport do PDF
- **Raport godzin** — czas pracy per zadanie WBS, per pracownik/grupa
- **Zamówienia** — listy materiałowe i baza materiałów

## Uruchomienie lokalnie

Otwórz `index.html` w przeglądarce — zero instalacji, zero serwera.

## Deployment

Strona jest hostowana na Netlify i automatycznie aktualizuje się przy każdym push na branch `main`.

## Technologie

Single-file HTML app — HTML + CSS + JavaScript, bez zewnętrznych zależności (poza opcjonalnym SheetJS do eksportu Excel).
