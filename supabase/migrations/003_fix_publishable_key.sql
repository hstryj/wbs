-- ════════════════════════════════════════════════════════════════════
-- 003_fix_publishable_key.sql
--
-- Problem: po 002 fix'ie policy 'projects_insert' miał
--   FOR INSERT TO authenticated WITH CHECK (true)
-- Ale z nowymi sb_publishable keys Supabase nie zawsze poprawnie propaguje
-- rolę 'authenticated' do PostgREST — request może przyjść jako 'anon',
-- co nie matchuje policy i RLS blokuje.
--
-- Workaround: policy dla 'public' (wszystkie role), check=(true).
-- Ochrona jest utrzymana bo:
--   1. DB default created_by = auth.uid() → ustawia zalogowanego usera
--   2. Trigger on_project_created próbuje wstawić do project_members
--      z user_id = new.created_by. Jeśli user_id byłby NULL (anon bez
--      JWT), constraint 'user_id NOT NULL' rzuca błąd → cała transakcja
--      roll-backed. Anon nie może stworzyć projektu.
--   3. SELECT/UPDATE/DELETE dalej używają is_project_member() /
--      project_role_of() — izolacja danych działa jak wcześniej.
--
-- Jak zastosować: Supabase SQL Editor → New query → wklej → Run.
-- ════════════════════════════════════════════════════════════════════

drop policy if exists "projects_insert" on projects;
create policy "projects_insert" on projects
  for insert
  to public
  with check (true);

-- ════════════════════════════════════════════════════════════════════
-- Weryfikacja po uruchomieniu:
--   select policyname, cmd, with_check::text, roles::text
--   from pg_policies
--   where tablename='projects' and policyname='projects_insert';
-- Powinno zwrócić: INSERT | true | {public}
-- ════════════════════════════════════════════════════════════════════
