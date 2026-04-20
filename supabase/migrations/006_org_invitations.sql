-- ════════════════════════════════════════════════════════════════════
-- 006_org_invitations.sql
--
-- Dostęp do organizacji po mailu:
-- - organization_invitations
-- - RPC accept_org_invitation(...)
-- - policy invite/revoke dla owner/admin
--
-- Cel: owner firmy może zaprosić ludzi do swojej organizacji,
-- a użytkownik po zalogowaniu może automatycznie zaakceptować
-- zaproszenie na podstawie adresu email.
-- ════════════════════════════════════════════════════════════════════

create table if not exists organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role organization_role not null default 'member',
  invited_by uuid references auth.users(id) on delete set null,
  token uuid not null default gen_random_uuid() unique,
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_org_invitations_org on organization_invitations(organization_id);
create index if not exists idx_org_invitations_email on organization_invitations(lower(email));
create index if not exists idx_org_invitations_token on organization_invitations(token);

create or replace function public.accept_org_invitation(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv organization_invitations%rowtype;
  uid uuid;
  user_email text;
begin
  uid := auth.uid();
  user_email := auth.email();

  if uid is null then
    raise exception 'Not authenticated (auth.uid() is null)';
  end if;

  if user_email is null then
    raise exception 'Authenticated user has no email';
  end if;

  select *
  into inv
  from organization_invitations
  where id = p_invitation_id
    and accepted_at is null
    and expires_at > now()
    and lower(email) = lower(user_email)
  limit 1;

  if not found then
    raise exception 'Invitation not found, expired, or not assigned to current email';
  end if;

  insert into organization_members (organization_id, user_id, role)
  values (inv.organization_id, uid, inv.role)
  on conflict (organization_id, user_id) do nothing;

  update organization_invitations
  set accepted_at = now()
  where id = inv.id
    and accepted_at is null;

  return inv.organization_id;
end;
$$;

grant execute on function public.accept_org_invitation(uuid) to authenticated;

alter table organization_invitations enable row level security;

drop policy if exists "organization_invitations_select" on organization_invitations;
create policy "organization_invitations_select" on organization_invitations
  for select
  using (
    invited_by = auth.uid()
    or public.org_role_of(organization_id) in ('owner', 'admin')
    or lower(email) = lower(auth.email())
  );

drop policy if exists "organization_invitations_insert" on organization_invitations;
create policy "organization_invitations_insert" on organization_invitations
  for insert
  with check (
    invited_by = auth.uid()
    and (
      public.org_role_of(organization_id) = 'owner'
      or (
        public.org_role_of(organization_id) = 'admin'
        and role in ('hr', 'coord_manager', 'member')
      )
    )
  );

drop policy if exists "organization_invitations_delete" on organization_invitations;
create policy "organization_invitations_delete" on organization_invitations
  for delete
  using (
    invited_by = auth.uid()
    or public.org_role_of(organization_id) in ('owner', 'admin')
  );

-- ════════════════════════════════════════════════════════════════════
-- Smoke test:
--   select * from organization_invitations;
--   select public.accept_org_invitation('<uuid>');
-- ════════════════════════════════════════════════════════════════════
