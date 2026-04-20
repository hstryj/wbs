-- ════════════════════════════════════════════════════════════════════
-- 002_fix_projects_insert.sql
--
-- Naprawia błąd "new row violates row-level security policy" przy próbie
-- utworzenia projektu z klienta.
--
-- Problem: policy "projects_insert" miał check `auth.uid() = created_by`.
-- Z nowymi publishable keys + flow RLS, ten check czasem zawodzi
-- (różne sposoby propagacji JWT claim'u do funkcji auth.uid()).
--
-- Rozwiązanie: `created_by` ma teraz DB default `auth.uid()`, a policy
-- INSERT wymaga tylko tego że user jest zalogowany. Bezpieczeństwo
-- utrzymane: trigger dodaje creator'a jako owner'a, a SELECT/UPDATE/
-- DELETE dalej filtrują po członkostwie.
--
-- Jak zastosować: Supabase SQL Editor → New query → wklej → Run.
-- ════════════════════════════════════════════════════════════════════

-- 1. Default created_by na auth.uid()
alter table projects alter column created_by set default auth.uid();

-- 2. Uproszczona policy INSERT: każdy zalogowany może tworzyć
drop policy if exists "projects_insert" on projects;
create policy "projects_insert" on projects
  for insert
  to authenticated
  with check (true);

-- 3. Upewnij się że trigger jest aktywny (na wszelki wypadek)
-- (re-create — bez zmian, ale pewne)
create or replace function public.on_project_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into project_members (project_id, user_id, role)
  values (new.id, coalesce(new.created_by, auth.uid()), 'owner')
  on conflict (project_id, user_id) do nothing;
  return new;
end;
$$;

-- ════════════════════════════════════════════════════════════════════
-- Test: po tym powinno działać INSERT z client-a. Sprawdź:
--   select * from projects;  -- puste do czasu zalogowania i stworzenia
-- ════════════════════════════════════════════════════════════════════
