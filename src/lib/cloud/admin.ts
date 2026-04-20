/**
 * Cloud API — warstwa organizacji / panelu admina.
 * Obejmuje organizacje, katalog pracowników, staffing projektów
 * i firmowe tworzenie projektów.
 */
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '../supabase/client';
import type { CloudProject } from './projects';

export type OrganizationRole = 'owner' | 'admin' | 'hr' | 'coord_manager' | 'member';

export interface CloudOrganization {
  id: string;
  name: string;
  slug: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CloudOrganizationMember {
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  joined_at: string;
}

export interface CloudOrganizationInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: OrganizationRole;
  invited_by: string | null;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface CloudEmployee {
  id: string;
  organization_id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  department: string | null;
  employee_code: string | null;
  company: string | null;
  group_name: string | null;
  color: string | null;
  avatar_url: string | null;
  notes: string | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CloudProjectStaffing {
  id: string;
  organization_id: string;
  project_id: string;
  employee_id: string;
  staffing_role: string | null;
  allocation_pct: number;
  assigned_by: string | null;
  assigned_at: string;
  created_at: string;
  updated_at: string;
}

type EmployeeDraft = Partial<Omit<CloudEmployee, 'id' | 'organization_id' | 'created_at' | 'updated_at'>> & Pick<CloudEmployee, 'full_name'>;

function requireClient() {
  if (!supabase) throw new Error('Supabase nie skonfigurowany');
  return supabase;
}

// ── Organizations ────────────────────────────────────────────────

export async function listOrganizations(): Promise<{ data: CloudOrganization[]; error: PostgrestError | null }> {
  const c = requireClient();
  const res = await c.from('organizations').select('*').order('name', { ascending: true });
  return { data: (res.data || []) as CloudOrganization[], error: res.error };
}

export async function getOrganization(id: string): Promise<{ data: CloudOrganization | null; error: PostgrestError | null }> {
  const c = requireClient();
  const res = await c.from('organizations').select('*').eq('id', id).single();
  return { data: res.data as CloudOrganization | null, error: res.error };
}

export async function getMyPlatformAdminStatus(): Promise<{ data: boolean; error: PostgrestError | null }> {
  const c = requireClient();
  const user = (await c.auth.getUser()).data.user;
  if (!user) return { data: false, error: null };

  const res = await c
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  return { data: Boolean(res.data), error: res.error };
}

export async function createOrganization(name: string, slug?: string): Promise<{ data: CloudOrganization | null; error: PostgrestError | null }> {
  const c = requireClient();
  const rpcRes = await c.rpc('create_organization_for_me', {
    p_name: name || 'Moja organizacja',
    p_slug: slug ?? null
  });
  if (rpcRes.error) return { data: null, error: rpcRes.error };
  const oid = rpcRes.data as string;
  const sel = await c.from('organizations').select('*').eq('id', oid).single();
  return { data: sel.data as CloudOrganization | null, error: sel.error };
}

export async function updateOrganization(id: string, patch: Partial<Pick<CloudOrganization, 'name' | 'slug'>>): Promise<{ error: PostgrestError | null }> {
  const c = requireClient();
  const res = await c.from('organizations').update(patch).eq('id', id);
  return { error: res.error };
}

// ── Organization members ────────────────────────────────────────

export async function listOrganizationMembers(organizationId: string): Promise<{ data: CloudOrganizationMember[]; error: PostgrestError | null }> {
  const c = requireClient();
  const res = await c
    .from('organization_members')
    .select('*')
    .eq('organization_id', organizationId)
    .order('joined_at', { ascending: true });
  return { data: (res.data || []) as CloudOrganizationMember[], error: res.error };
}

export async function updateOrganizationMemberRole(organizationId: string, userId: string, role: OrganizationRole): Promise<{ error: PostgrestError | null }> {
  const c = requireClient();
  const res = await c
    .from('organization_members')
    .update({ role })
    .eq('organization_id', organizationId)
    .eq('user_id', userId);
  return { error: res.error };
}

export async function removeOrganizationMember(organizationId: string, userId: string): Promise<{ error: PostgrestError | null }> {
  const c = requireClient();
  const res = await c
    .from('organization_members')
    .delete()
    .eq('organization_id', organizationId)
    .eq('user_id', userId);
  return { error: res.error };
}

// ── Organization invitations ────────────────────────────────────

export async function inviteOrganizationMemberByEmail(
  organizationId: string,
  email: string,
  role: OrganizationRole = 'member'
): Promise<{ data: CloudOrganizationInvitation | null; error: PostgrestError | null }> {
  const c = requireClient();
  const user = (await c.auth.getUser()).data.user;
  if (!user) throw new Error('Wymagane logowanie');
  const res = await c
    .from('organization_invitations')
    .insert({
      organization_id: organizationId,
      email: email.trim().toLowerCase(),
      role,
      invited_by: user.id
    })
    .select()
    .single();
  return { data: res.data as CloudOrganizationInvitation | null, error: res.error };
}

export async function listOrganizationInvitations(organizationId: string): Promise<{ data: CloudOrganizationInvitation[]; error: PostgrestError | null }> {
  const c = requireClient();
  const res = await c
    .from('organization_invitations')
    .select('*')
    .eq('organization_id', organizationId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false });
  return { data: (res.data || []) as CloudOrganizationInvitation[], error: res.error };
}

export async function deleteOrganizationInvitation(invitationId: string): Promise<{ error: PostgrestError | null }> {
  const c = requireClient();
  const res = await c.from('organization_invitations').delete().eq('id', invitationId);
  return { error: res.error };
}

export async function myPendingOrganizationInvitations(): Promise<{ data: CloudOrganizationInvitation[]; error: PostgrestError | null }> {
  const c = requireClient();
  const email = (await c.auth.getUser()).data.user?.email;
  if (!email) return { data: [], error: null };
  const res = await c
    .from('organization_invitations')
    .select('*')
    .eq('email', email.toLowerCase())
    .is('accepted_at', null)
    .order('created_at', { ascending: false });
  return { data: (res.data || []) as CloudOrganizationInvitation[], error: res.error };
}

export async function acceptOrganizationInvitation(invitationId: string): Promise<{ error: string | null }> {
  const c = requireClient();
  const res = await c.rpc('accept_org_invitation', {
    p_invitation_id: invitationId
  });
  return { error: res.error?.message ?? null };
}

export async function acceptAllPendingOrganizationInvitations(): Promise<{ accepted: number; error: string | null }> {
  const listRes = await myPendingOrganizationInvitations();
  if (listRes.error) {
    return { accepted: 0, error: listRes.error.message };
  }

  let accepted = 0;
  for (const invitation of listRes.data) {
    const res = await acceptOrganizationInvitation(invitation.id);
    if (res.error) {
      return { accepted, error: res.error };
    }
    accepted += 1;
  }

  return { accepted, error: null };
}

// ── Organization projects ───────────────────────────────────────

export async function listOrganizationProjects(organizationId: string): Promise<{ data: CloudProject[]; error: PostgrestError | null }> {
  const c = requireClient();
  const res = await c
    .from('projects')
    .select('*')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false });
  return { data: (res.data || []) as CloudProject[], error: res.error };
}

export async function createOrganizationProject(
  organizationId: string,
  name: string,
  payload: Record<string, unknown> = {},
  client?: string
): Promise<{ data: CloudProject | null; error: PostgrestError | null }> {
  const c = requireClient();
  const rpcRes = await c.rpc('create_org_project_for_me', {
    p_organization_id: organizationId,
    p_name: name || 'Nowy projekt',
    p_payload: payload,
    p_client: client ?? null
  });
  if (rpcRes.error) return { data: null, error: rpcRes.error };
  const pid = rpcRes.data as string;
  const sel = await c.from('projects').select('*').eq('id', pid).single();
  return { data: sel.data as CloudProject | null, error: sel.error };
}

export async function attachProjectToOrganization(projectId: string, organizationId: string): Promise<{ error: PostgrestError | null }> {
  const c = requireClient();
  const res = await c.rpc('attach_project_to_organization', {
    p_project_id: projectId,
    p_organization_id: organizationId
  });
  return { error: res.error };
}

// ── Employee directory ──────────────────────────────────────────

export async function listEmployees(organizationId: string): Promise<{ data: CloudEmployee[]; error: PostgrestError | null }> {
  const c = requireClient();
  const res = await c
    .from('organization_employees')
    .select('*')
    .eq('organization_id', organizationId)
    .order('full_name', { ascending: true });
  return { data: (res.data || []) as CloudEmployee[], error: res.error };
}

export async function createEmployee(organizationId: string, draft: EmployeeDraft): Promise<{ data: CloudEmployee | null; error: PostgrestError | null }> {
  const c = requireClient();
  const user = (await c.auth.getUser()).data.user;
  if (!user) throw new Error('Wymagane logowanie');
  const res = await c
    .from('organization_employees')
    .insert({
      organization_id: organizationId,
      created_by: user.id,
      ...draft,
      email: draft.email?.trim().toLowerCase() ?? null
    })
    .select()
    .single();
  return { data: res.data as CloudEmployee | null, error: res.error };
}

export async function updateEmployee(employeeId: string, patch: Partial<Omit<CloudEmployee, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>): Promise<{ error: PostgrestError | null }> {
  const c = requireClient();
  const normalizedPatch = {
    ...patch,
    email: patch.email === undefined ? undefined : patch.email?.trim().toLowerCase() ?? null
  };
  const res = await c.from('organization_employees').update(normalizedPatch).eq('id', employeeId);
  return { error: res.error };
}

export async function removeEmployee(employeeId: string): Promise<{ error: PostgrestError | null }> {
  const c = requireClient();
  const res = await c.from('organization_employees').delete().eq('id', employeeId);
  return { error: res.error };
}

// ── Project staffing ────────────────────────────────────────────

export async function listProjectStaffing(projectId: string): Promise<{ data: CloudProjectStaffing[]; error: PostgrestError | null }> {
  const c = requireClient();
  const res = await c
    .from('project_staffing')
    .select('*')
    .eq('project_id', projectId)
    .order('assigned_at', { ascending: true });
  return { data: (res.data || []) as CloudProjectStaffing[], error: res.error };
}

export async function assignEmployeeToProject(input: {
  organizationId: string;
  projectId: string;
  employeeId: string;
  staffingRole?: string | null;
  allocationPct?: number;
}): Promise<{ error: PostgrestError | null }> {
  const c = requireClient();
  const user = (await c.auth.getUser()).data.user;
  if (!user) throw new Error('Wymagane logowanie');
  const res = await c.from('project_staffing').upsert(
    {
      organization_id: input.organizationId,
      project_id: input.projectId,
      employee_id: input.employeeId,
      staffing_role: input.staffingRole ?? null,
      allocation_pct: input.allocationPct ?? 100,
      assigned_by: user.id,
      assigned_at: new Date().toISOString()
    },
    {
      onConflict: 'project_id,employee_id'
    }
  );
  return { error: res.error };
}

export async function removeEmployeeFromProject(projectId: string, employeeId: string): Promise<{ error: PostgrestError | null }> {
  const c = requireClient();
  const res = await c
    .from('project_staffing')
    .delete()
    .eq('project_id', projectId)
    .eq('employee_id', employeeId);
  return { error: res.error };
}
