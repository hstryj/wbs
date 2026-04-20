-- ════════════════════════════════════════════════════════════════════
-- 004_create_project_rpc.sql
--
-- Pozwala ominąć RLS insert issue przez SECURITY DEFINER RPC.
-- Funkcja tworzy projekt + dodaje usera jako owner'a, w jednej
-- transakcji, jako postgres (bypass RLS).
--
-- Client wywołuje supabase.rpc('create_project_for_me', {...}) zamiast
-- .from('projects').insert(...).
--
-- Jak zastosować: Supabase SQL Editor → New query → wklej → Run.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.create_project_for_me(
  p_name text,
  p_payload jsonb default '{}'::jsonb,
  p_client text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Not authenticated (auth.uid() is null)';
  end if;

  insert into projects (created_by, name, payload, client)
  values (uid, coalesce(nullif(trim(p_name), ''), 'Nowy projekt'), p_payload, p_client)
  returning id into pid;

  -- Trigger już to robi, ale for extra safety:
  insert into project_members (project_id, user_id, role)
  values (pid, uid, 'owner')
  on conflict (project_id, user_id) do nothing;

  return pid;
end;
$$;

-- Udostępnij dla zalogowanych + anon (anon i tak failuje na auth.uid() is null)
grant execute on function public.create_project_for_me(text, jsonb, text) to authenticated, anon;

-- ════════════════════════════════════════════════════════════════════
-- Test w SQL Editor (jako postgres): powinno zwrócić NULL — bo postgres
-- nie jest zalogowany przez auth.uid().
--   select public.create_project_for_me('Test');
-- Client-side po wywołaniu z logged-in userem zwróci UUID nowego projektu.
-- ════════════════════════════════════════════════════════════════════
