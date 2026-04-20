-- ════════════════════════════════════════════════════════════════════
-- 005_admin_organizations.sql
--
-- Warstwa firmowa / admin panel:
-- - organizations i organization_members
-- - katalog pracowników organization_employees
-- - przypisania projektowe project_staffing
-- - rozszerzenie projects o organization_id
-- - helper RPC do tworzenia organizacji i projektów firmowych
--
-- Założenia:
-- - istniejące projekty bez organization_id nadal działają jak dziś
-- - panel admina będzie mógł zarządzać projektami i staffingiem
--   na poziomie organizacji, bez ręcznego wpisywania osób w projekcie
-- ════════════════════════════════════════════════════════════════════

do $$
begin
  create type organization_role as enum ('owner', 'admin', 'hr', 'coord_manager', 'member');
exception
  when duplicate_object then null;
end $$;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_organizations_slug_unique
  on organizations (lower(slug))
  where slug is not null;

create table if not exists organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role organization_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists organization_employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  title text,
  department text,
  employee_code text,
  company text,
  group_name text,
  color text,
  avatar_url text,
  notes text,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_org_employees_auth_user_unique
  on organization_employees (organization_id, auth_user_id)
  where auth_user_id is not null;

create unique index if not exists idx_org_employees_email_unique
  on organization_employees (organization_id, lower(email))
  where email is not null;

create unique index if not exists idx_org_employees_code_unique
  on organization_employees (organization_id, employee_code)
  where employee_code is not null;

alter table projects
  add column if not exists organization_id uuid references organizations(id) on delete set null;

create index if not exists idx_projects_organization on projects(organization_id);

create table if not exists project_staffing (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  employee_id uuid not null references organization_employees(id) on delete cascade,
  staffing_role text,
  allocation_pct numeric(5,2) not null default 100 check (allocation_pct >= 0 and allocation_pct <= 100),
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, employee_id)
);

create index if not exists idx_org_members_user on organization_members(user_id);
create index if not exists idx_org_members_org on organization_members(organization_id);
create index if not exists idx_org_employees_org on organization_employees(organization_id);
create index if not exists idx_project_staffing_project on project_staffing(project_id);
create index if not exists idx_project_staffing_employee on project_staffing(employee_id);
create index if not exists idx_project_staffing_org on project_staffing(organization_id);

create or replace function public.is_org_member(oid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from organization_members
    where organization_id = oid
      and user_id = auth.uid()
  );
$$;

create or replace function public.org_role_of(oid uuid)
returns organization_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from organization_members
  where organization_id = oid
    and user_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_manage_org_projects(oid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.org_role_of(oid) in ('owner', 'admin', 'coord_manager');
$$;

create or replace function public.can_manage_org_people(oid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.org_role_of(oid) in ('owner', 'admin', 'hr', 'coord_manager');
$$;

create or replace function public.can_manage_project_from_org(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from projects
    where id = pid
      and organization_id is not null
      and public.can_manage_org_projects(organization_id)
  );
$$;

create or replace function public.can_manage_project_members_from_org(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from projects
    where id = pid
      and organization_id is not null
      and public.org_role_of(organization_id) in ('owner', 'admin', 'coord_manager')
  );
$$;

create or replace function public.can_manage_project_staffing(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from projects
    where id = pid
      and organization_id is not null
      and public.can_manage_org_people(organization_id)
  );
$$;

create or replace function public.can_view_project_from_org(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from projects
    where id = pid
      and organization_id is not null
      and public.is_org_member(organization_id)
  );
$$;

create or replace function public.on_organization_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into organization_members (organization_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (organization_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_organization_created on organizations;
create trigger trg_organization_created
  after insert on organizations
  for each row
  execute function public.on_organization_created();

drop trigger if exists trg_organizations_updated on organizations;
create trigger trg_organizations_updated
  before update on organizations
  for each row
  execute function public.touch_updated_at();

drop trigger if exists trg_organization_employees_updated on organization_employees;
create trigger trg_organization_employees_updated
  before update on organization_employees
  for each row
  execute function public.touch_updated_at();

drop trigger if exists trg_project_staffing_updated on project_staffing;
create trigger trg_project_staffing_updated
  before update on project_staffing
  for each row
  execute function public.touch_updated_at();

create or replace function public.validate_project_staffing_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_org_id uuid;
  v_employee_org_id uuid;
begin
  select p.organization_id
  into v_project_org_id
  from public.projects as p
  where p.id = new.project_id;

  select e.organization_id
  into v_employee_org_id
  from public.organization_employees as e
  where e.id = new.employee_id;

  if v_project_org_id is null then
    raise exception 'Project must belong to an organization before staffing can be assigned';
  end if;

  if v_employee_org_id is null then
    raise exception 'Employee directory entry not found';
  end if;

  if new.organization_id <> v_project_org_id or new.organization_id <> v_employee_org_id then
    raise exception 'Project staffing organization mismatch';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_project_staffing_validate on project_staffing;
create trigger trg_project_staffing_validate
  before insert or update on project_staffing
  for each row
  execute function public.validate_project_staffing_org();

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

create or replace function public.create_org_project_for_me(
  p_organization_id uuid,
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

  if not public.can_manage_org_projects(p_organization_id) then
    raise exception 'Insufficient organization permissions';
  end if;

  insert into projects (created_by, organization_id, name, payload, client)
  values (
    uid,
    p_organization_id,
    coalesce(nullif(trim(p_name), ''), 'Nowy projekt'),
    coalesce(p_payload, '{}'::jsonb),
    p_client
  )
  returning id into pid;

  insert into project_members (project_id, user_id, role)
  values (pid, uid, 'owner')
  on conflict (project_id, user_id) do nothing;

  return pid;
end;
$$;

create or replace function public.attach_project_to_organization(
  p_project_id uuid,
  p_organization_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_org uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated (auth.uid() is null)';
  end if;

  if not public.can_manage_org_projects(p_organization_id) then
    raise exception 'Insufficient organization permissions';
  end if;

  select organization_id into current_org
  from projects
  where id = p_project_id;

  if current_org is null then
    if public.project_role_of(p_project_id) <> 'owner' then
      raise exception 'Only project owner can attach a personal project to organization';
    end if;
  elsif current_org <> p_organization_id then
    raise exception 'Project already belongs to another organization';
  end if;

  update projects
  set organization_id = p_organization_id
  where id = p_project_id;

  return p_project_id;
end;
$$;

grant execute on function public.create_organization_for_me(text, text) to authenticated, anon;
grant execute on function public.create_org_project_for_me(uuid, text, jsonb, text) to authenticated, anon;
grant execute on function public.attach_project_to_organization(uuid, uuid) to authenticated, anon;

alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table organization_employees enable row level security;
alter table project_staffing enable row level security;

drop policy if exists "organizations_select_member" on organizations;
create policy "organizations_select_member" on organizations
  for select
  using (public.is_org_member(id));

drop policy if exists "organizations_insert" on organizations;
create policy "organizations_insert" on organizations
  for insert
  with check (auth.uid() = created_by);

drop policy if exists "organizations_update_admin" on organizations;
create policy "organizations_update_admin" on organizations
  for update
  using (public.org_role_of(id) in ('owner', 'admin'))
  with check (public.org_role_of(id) in ('owner', 'admin'));

drop policy if exists "organizations_delete_owner" on organizations;
create policy "organizations_delete_owner" on organizations
  for delete
  using (public.org_role_of(id) = 'owner');

drop policy if exists "organization_members_select" on organization_members;
create policy "organization_members_select" on organization_members
  for select
  using (public.is_org_member(organization_id));

drop policy if exists "organization_members_insert_owner" on organization_members;
create policy "organization_members_insert_owner" on organization_members
  for insert
  with check (public.org_role_of(organization_id) = 'owner');

drop policy if exists "organization_members_update_owner" on organization_members;
create policy "organization_members_update_owner" on organization_members
  for update
  using (public.org_role_of(organization_id) = 'owner')
  with check (public.org_role_of(organization_id) = 'owner');

drop policy if exists "organization_members_delete" on organization_members;
create policy "organization_members_delete" on organization_members
  for delete
  using (
    public.org_role_of(organization_id) = 'owner'
    or (user_id = auth.uid() and role <> 'owner')
  );

drop policy if exists "organization_employees_select_member" on organization_employees;
create policy "organization_employees_select_member" on organization_employees
  for select
  using (public.is_org_member(organization_id));

drop policy if exists "organization_employees_insert_manager" on organization_employees;
create policy "organization_employees_insert_manager" on organization_employees
  for insert
  with check (public.can_manage_org_people(organization_id));

drop policy if exists "organization_employees_update_manager" on organization_employees;
create policy "organization_employees_update_manager" on organization_employees
  for update
  using (public.can_manage_org_people(organization_id))
  with check (public.can_manage_org_people(organization_id));

drop policy if exists "organization_employees_delete_manager" on organization_employees;
create policy "organization_employees_delete_manager" on organization_employees
  for delete
  using (public.can_manage_org_people(organization_id));

drop policy if exists "project_staffing_select" on project_staffing;
create policy "project_staffing_select" on project_staffing
  for select
  using (
    public.is_project_member(project_id)
    or public.can_view_project_from_org(project_id)
  );

drop policy if exists "project_staffing_insert_manager" on project_staffing;
create policy "project_staffing_insert_manager" on project_staffing
  for insert
  with check (public.can_manage_project_staffing(project_id));

drop policy if exists "project_staffing_update_manager" on project_staffing;
create policy "project_staffing_update_manager" on project_staffing
  for update
  using (public.can_manage_project_staffing(project_id))
  with check (public.can_manage_project_staffing(project_id));

drop policy if exists "project_staffing_delete_manager" on project_staffing;
create policy "project_staffing_delete_manager" on project_staffing
  for delete
  using (public.can_manage_project_staffing(project_id));

drop policy if exists "projects_select_member" on projects;
create policy "projects_select_member" on projects
  for select
  using (
    public.is_project_member(id)
    or public.can_view_project_from_org(id)
  );

drop policy if exists "projects_insert" on projects;
create policy "projects_insert" on projects
  for insert
  with check (
    auth.uid() = created_by
    and (
      organization_id is null
      or public.can_manage_org_projects(organization_id)
    )
  );

drop policy if exists "projects_update" on projects;
create policy "projects_update" on projects
  for update
  using (
    public.project_role_of(id) in ('owner', 'editor')
    or public.can_manage_project_from_org(id)
  )
  with check (
    public.project_role_of(id) in ('owner', 'editor')
    or public.can_manage_project_from_org(id)
  );

drop policy if exists "projects_delete_owner" on projects;
create policy "projects_delete_owner" on projects
  for delete
  using (
    public.project_role_of(id) = 'owner'
    or (
      organization_id is not null
      and public.org_role_of(organization_id) in ('owner', 'admin')
    )
  );

drop policy if exists "members_select" on project_members;
create policy "members_select" on project_members
  for select
  using (
    public.is_project_member(project_id)
    or public.can_view_project_from_org(project_id)
  );

drop policy if exists "members_insert" on project_members;
create policy "members_insert" on project_members
  for insert
  with check (
    public.project_role_of(project_id) = 'owner'
    or public.can_manage_project_members_from_org(project_id)
    or user_id = auth.uid()
  );

drop policy if exists "members_update_owner" on project_members;
create policy "members_update_owner" on project_members
  for update
  using (
    public.project_role_of(project_id) = 'owner'
    or public.can_manage_project_members_from_org(project_id)
  )
  with check (
    public.project_role_of(project_id) = 'owner'
    or public.can_manage_project_members_from_org(project_id)
  );

drop policy if exists "members_delete" on project_members;
create policy "members_delete" on project_members
  for delete
  using (
    public.project_role_of(project_id) = 'owner'
    or public.can_manage_project_members_from_org(project_id)
    or user_id = auth.uid()
  );

drop policy if exists "invitations_select" on project_invitations;
create policy "invitations_select" on project_invitations
  for select
  using (
    invited_by = auth.uid()
    or public.project_role_of(project_id) = 'owner'
    or public.can_manage_project_members_from_org(project_id)
    or email = auth.email()
  );

drop policy if exists "invitations_insert_owner" on project_invitations;
create policy "invitations_insert_owner" on project_invitations
  for insert
  with check (
    (
      public.project_role_of(project_id) = 'owner'
      or public.can_manage_project_members_from_org(project_id)
    )
    and invited_by = auth.uid()
  );

drop policy if exists "invitations_delete_owner" on project_invitations;
create policy "invitations_delete_owner" on project_invitations
  for delete
  using (
    public.project_role_of(project_id) = 'owner'
    or public.can_manage_project_members_from_org(project_id)
  );

-- ════════════════════════════════════════════════════════════════════
-- Smoke test po migracji:
--   select public.create_organization_for_me('Firma testowa');
--   select * from organizations;
--   select * from organization_members;
--   select * from projects where organization_id is not null;
-- ════════════════════════════════════════════════════════════════════
