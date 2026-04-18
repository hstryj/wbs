<script lang="ts">
  import Topbar from './components/Topbar.svelte';
  import Toolbar from './components/Toolbar.svelte';
  import TabBar from './components/TabBar.svelte';
  import { activeTab } from './lib/state/ui';
  import DashboardView from './views/DashboardView.svelte';
  import StubView from './views/StubView.svelte';
</script>

<div class="wrap">
  <Topbar />
  <Toolbar />
  <TabBar />

  {#if $activeTab === 'dash'}
    <DashboardView />
  {:else if $activeTab === 'table'}
    <StubView name="Edytor WBS" description="Tabela hierarchiczna z zadaniami, wagami, terminami. Najbardziej złożony widok — migracja na końcu." />
  {:else if $activeTab === 'chart'}
    <StubView name="Drzewo" description="Wizualizacja hierarchii WBS jako drzewa SVG." />
  {:else if $activeTab === 'wfall'}
    <StubView name="Waterfall wag" description="Wykres kaskadowy wag sekcji." />
  {:else if $activeTab === 'team'}
    <StubView name="Widok zespołu" description="Karty pracowników z ich zadaniami i godzinami." />
  {:else if $activeTab === 'rank'}
    <StubView name="Ranking zadań" description="Sortowane zadania wg priorytetu / score / ukończenia." />
  {:else if $activeTab === 'gantt'}
    <StubView name="Gantt" description="Oś czasu projektu + tryb listy (karty) na mobile." />
  {:else if $activeTab === 'risk'}
    <StubView name="Rejestr ryzyk" description="Lista ryzyk z poziomami H/M/L." />
  {:else if $activeTab === 'report'}
    <StubView name="Raport" description="Generowanie raportu PDF." />
  {:else if $activeTab === 'log'}
    <StubView name="Dziennik" description="Historia zmian + snapshoty." />
  {:else if $activeTab === 'wlreport'}
    <StubView name="Raport godzin" description="Czas pracy per zadanie WBS, per pracownik/grupa." />
  {:else if $activeTab === 'orders'}
    <StubView name="Zamówienia" description="Listy materiałowe + baza materiałów." />
  {/if}
</div>
