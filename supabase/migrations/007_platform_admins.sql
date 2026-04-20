-- ════════════════════════════════════════════════════════════════════
-- 007_platform_admins.sql
-- Platform-level super admini. Cel: tylko wskazany super admin może
-- tworzyć nowe organizacje, reszta użytkowników działa już wewnątrz
-- istniejących firm.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  notes text
);

create unique index if not exists idx_platform_admins_email_lower
  on public.platform_admins (lower(email));

alter table public.platform_admins enable row level security;

create or replace function public.is_platform_admin(p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.platform_admins
    where user_id = coalesce(p_uid, auth.uid())
  );
$$;

grant execute on function public.is_platform_admin(uuid) to authenticated, anon;

drop policy if exists "platform_admins_select_self" on public.platform_admins;
create policy "platform_admins_select_self" on public.platform_admins
  for select
  using (user_id = auth.uid());

insert into public.platform_admins (user_id, email, notes)
select
  u.id,
  lower(u.email),
  'Bootstrap super admin'
from auth.users as u
where lower(u.email) = 'starghz@icloud.com'
on conflict (user_id) do update
set
  email = excluded.email,
  notes = excluded.notes;

create or replace function public.create_organization_for_me(
  p_name text,
  p_slug text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  oid uuid;
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Not authenticated (auth.uid() is null)';
  end if;

  if not public.is_platform_admin(uid) then
    raise exception 'Only platform admin can create organizations';
  end if;

  insert into organizations (name, slug, created_by)
  values (
    coalesce(nullif(trim(p_name), ''), 'Moja organizacja'),
    nullif(trim(p_slug), ''),
    uid
  )
  returning id into oid;

  insert into organization_members (organization_id, user_id, role)
  values (oid, uid, 'owner')
  on conflict (organization_id, user_id) do nothing;

  return oid;
end;
$$;

drop policy if exists "organizations_insert" on public.organizations;
create policy "organizations_insert" on public.organizations
  for insert
  with check (
    auth.uid() = created_by
    and public.is_platform_admin(auth.uid())
  );
