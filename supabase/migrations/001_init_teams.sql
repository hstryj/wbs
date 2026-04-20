-- ════════════════════════════════════════════════════════════════════
-- 001_init_teams.sql
-- Teams model: user → projekty (jako członek z rolą) → dane projektu.
-- RLS: użytkownik widzi tylko projekty w których jest członkiem.
--
-- Jak zastosować:
--   1. Supabase dashboard → SQL Editor
--   2. New query → wklej cały plik → Run
--   3. Potwierdź że "Success. No rows returned"
--
-- UWAGA: zaczyna się od DROP IF EXISTS dla czystego startu. Gdybyś miała
-- wcześniej częściowo utworzone tabele projects/project_members/* —
-- zostaną usunięte wraz z danymi. Bezpieczne na etapie setup'u.
-- ════════════════════════════════════════════════════════════════════

-- ── CLEAN SLATE (safe reset, re-runnable) ────────────────────────
drop trigger if exists trg_project_created on projects cascade;
drop trigger if exists trg_projects_updated on projects cascade;
drop table if exists project_invitations cascade;
drop table if exists project_members cascade;
drop table if exists projects cascade;
drop function if exists public.is_project_member(uuid) cascade;
drop function if exists public.project_role_of(uuid) cascade;
drop function if exists public.on_project_created() cascade;
drop function if exists public.touch_updated_at() cascade;
drop type if exists project_role cascade;

-- ── Types ──────────────────────────────────────────────────────────
create type project_role as enum ('owner', 'editor', 'viewer');

-- ── Tables ─────────────────────────────────────────────────────────

-- Projekty — główna jednostka organizacji pracy
create table projects (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  name text not null default 'Nowy projekt',
  client text,
  -- Denormalized payload: tree, people, risks, worklog, etc.
  -- W Phase 3 znormalizujemy do osobnych tabel; teraz keep it simple.
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Członkowie projektu — kto ma dostęp i z jaką rolą
create table project_members (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role project_role not null default 'editor',
  joined_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

-- Zaproszenia (pending) — ktoś zaprasza po mailu, po acceptance stają się członkami
create table project_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  email text not null,
  role project_role not null default 'editor',
  invited_by uuid references auth.users(id) on delete set null,
  token uuid not null default gen_random_uuid() unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ── Indeksy ───────────────────────────────────────────────────────
create index idx_project_members_user on project_members(user_id);
create index idx_project_members_project on project_members(project_id);
create index idx_invitations_email on project_invitations(email);
create index idx_invitations_token on project_invitations(token);
create index idx_projects_created_by on projects(created_by);

-- ── Funkcje pomocnicze (unikają rekurencji RLS) ──────────────────
-- SECURITY DEFINER omija RLS przy sprawdzaniu członkostwa
create or replace function public.is_project_member(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from project_members
    where project_id = pid and user_id = auth.uid()
  );
$$;

create or replace function public.project_role_of(pid uuid)
returns project_role
language sql
stable
security definer
set search_path = public
as $$
  select role from project_members
  where project_id = pid and user_id = auth.uid()
  limit 1;
$$;

-- ── Trigger: dodaj twórcę jako owner'a przy create ───────────────
create or replace function public.on_project_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into project_members (project_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

drop trigger if exists trg_project_created on projects;
create trigger trg_project_created
  after insert on projects
  for each row
  execute function public.on_project_created();

-- ── Trigger: auto-update updated_at ───────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_projects_updated on projects;
create trigger trg_projects_updated
  before update on projects
  for each row
  execute function public.touch_updated_at();

-- ── RLS — Row Level Security ─────────────────────────────────────
alter table projects enable row level security;
alter table project_members enable row level security;
alter table project_invitations enable row level security;

-- ── Policies: projects ────────────────────────────────────────────

-- SELECT: widzisz projekty w których jesteś członkiem
drop policy if exists "projects_select_member" on projects;
create policy "projects_select_member" on projects
  for select
  using (public.is_project_member(id));

-- INSERT: każdy zalogowany może utworzyć projekt (staje się owner'em przez trigger)
drop policy if exists "projects_insert" on projects;
create policy "projects_insert" on projects
  for insert
  with check (auth.uid() = created_by);

-- UPDATE: owner lub editor projektu może edytować payload
drop policy if exists "projects_update" on projects;
create policy "projects_update" on projects
  for update
  using (public.project_role_of(id) in ('owner', 'editor'))
  with check (public.project_role_of(id) in ('owner', 'editor'));

-- DELETE: tylko owner
drop policy if exists "projects_delete_owner" on projects;
create policy "projects_delete_owner" on projects
  for delete
  using (public.project_role_of(id) = 'owner');

-- ── Policies: project_members ────────────────────────────────────

-- SELECT: widzisz członków projektów w których jesteś
drop policy if exists "members_select" on project_members;
create policy "members_select" on project_members
  for select
  using (public.is_project_member(project_id));

-- INSERT: owner może dodawać członków; user może dodać samego siebie (przez invitation acceptance)
drop policy if exists "members_insert" on project_members;
create policy "members_insert" on project_members
  for insert
  with check (
    public.project_role_of(project_id) = 'owner'
    or user_id = auth.uid()
  );

-- UPDATE: owner może zmieniać role
drop policy if exists "members_update_owner" on project_members;
create policy "members_update_owner" on project_members
  for update
  using (public.project_role_of(project_id) = 'owner');

-- DELETE: owner może usuwać; user może usunąć samego siebie (leave)
drop policy if exists "members_delete" on project_members;
create policy "members_delete" on project_members
  for delete
  using (
    public.project_role_of(project_id) = 'owner'
    or user_id = auth.uid()
  );

-- ── Policies: project_invitations ────────────────────────────────

-- SELECT: zaproszenie widzi: zapraszający, owner projektu, adresat (po email)
drop policy if exists "invitations_select" on project_invitations;
create policy "invitations_select" on project_invitations
  for select
  using (
    invited_by = auth.uid()
    or public.project_role_of(project_id) = 'owner'
    or email = auth.email()
  );

-- INSERT: tylko owner może zapraszać
drop policy if exists "invitations_insert_owner" on project_invitations;
create policy "invitations_insert_owner" on project_invitations
  for insert
  with check (
    public.project_role_of(project_id) = 'owner'
    and invited_by = auth.uid()
  );

-- UPDATE: adresat może "zaakceptować" (ustawić accepted_at)
drop policy if exists "invitations_update_accept" on project_invitations;
create policy "invitations_update_accept" on project_invitations
  for update
  using (email = auth.email())
  with check (email = auth.email());

-- DELETE: owner projektu może odwołać zaproszenie
drop policy if exists "invitations_delete_owner" on project_invitations;
create policy "invitations_delete_owner" on project_invitations
  for delete
  using (public.project_role_of(project_id) = 'owner');

-- ════════════════════════════════════════════════════════════════════
-- Test po uruchomieniu:
--   select auth.uid();  -- Twój user id (po zalogowaniu w Supabase SQL Editor)
--   select * from projects;  -- powinno być puste (brak projektów = brak wierszy)
--   select * from pg_policies where schemaname = 'public';  -- lista polityk
-- ════════════════════════════════════════════════════════════════════
