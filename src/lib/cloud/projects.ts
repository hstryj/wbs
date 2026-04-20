/**
 * Cloud API — projekty, członkowie, zaproszenia.
 * Wszystkie funkcje rzucają lub zwracają { data, error }.
 * RLS egzekwuje dostęp — tutaj tylko proste wywołania.
 */
import { supabase } from '../supabase/client';
import type { PostgrestError } from '@supabase/supabase-js';

export type Role = 'owner' | 'editor' | 'viewer';

export interface CloudProject {
  id: string;
  created_by: string | null;
  name: string;
  client: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CloudMember {
  project_id: string;
  user_id: string;
  role: Role;
  joined_at: string;
}

export interface CloudInvitation {
  id: string;
  project_id: string;
  email: string;
  role: Role;
  invited_by: string | null;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

function requireClient() {
  if (!supabase) throw new Error('Supabase nie skonfigurowany');
  return supabase;
}

// ── Projects ──────────────────────────────────────────────────────

/** Wszystkie projekty widoczne dla zalogowanego usera (RLS: members only) */
export async function listProjects(): Promise<{ data: CloudProject[]; error: PostgrestError | null }> {
  const c = requireClient();
  const res = await c.from('projects').select('*').order('updated_at', { ascending: false });
  return { data: (res.data || []) as CloudProject[], error: res.error };
}

export async function getProject(id: string): Promise<{ data: CloudProject | null; error: PostgrestError | null }> {
  const c = requireClient();
  const res = await c.from('projects').select('*').eq('id', id).single();
  return { data: res.data as CloudProject | null, error: res.error };
}

/** Utwórz nowy projekt przez RPC `create_project_for_me` (SECURITY DEFINER —
 * omija RLS issue z publishable keys). Zwraca pełny rekord projektu. */
export async function createProject(name: string, payload: Record<string, unknown> = {}, client?: string): Promise<{ data: CloudProject | null; error: PostgrestError | null }> {
  const c = requireClient();
  // RPC tworzy projekt i dodaje usera jako owner'a, bypass RLS
  const rpcRes = await c.rpc('create_project_for_me', {
    p_name: name || 'Nowy projekt',
    p_payload: payload,
    p_client: client ?? null
  });
  if (rpcRes.error) {
    return { data: null, error: rpcRes.error };
  }
  const newId = rpcRes.data as string;
  // Teraz odczytaj pełny rekord (SELECT z RLS — user jest teraz członkiem)
  const sel = await c.from('projects').select('*').eq('id', newId).single();
  return { data: sel.data as CloudProject | null, error: sel.error };
}

/** Aktualizuj payload projektu (atomic JSONB replace). */
export async function updateProjectPayload(id: string, payload: Record<string, unknown>): Promise<{ error: PostgrestError | null }> {
  const c = requireClient();
  const res = await c.from('projects').update({ payload }).eq('id', id);
  return { error: res.error };
}

export async function updateProjectMeta(id: string, patch: Partial<Pick<CloudProject, 'name' | 'client'>>): Promise<{ error: PostgrestError | null }> {
  const c = requireClient();
  const res = await c.from('projects').update(patch).eq('id', id);
  return { error: res.error };
}

export async function deleteProject(id: string): Promise<{ error: PostgrestError | null }> {
  const c = requireClient();
  const res = await c.from('projects').delete().eq('id', id);
  return { error: res.error };
}

// ── Members ───────────────────────────────────────────────────────

export async function listMembers(projectId: string): Promise<{ data: CloudMember[]; error: PostgrestError | null }> {
  const c = requireClient();
  const res = await c.from('project_members').select('*').eq('project_id', projectId);
  return { data: (res.data || []) as CloudMember[], error: res.error };
}

export async function updateMemberRole(projectId: string, userId: string, role: Role): Promise<{ error: PostgrestError | null }> {
  const c = requireClient();
  const res = await c.from('project_members').update({ role }).eq('project_id', projectId).eq('user_id', userId);
  return { error: res.error };
}

export async function removeMember(projectId: string, userId: string): Promise<{ error: PostgrestError | null }> {
  const c = requireClient();
  const res = await c.from('project_members').delete().eq('project_id', projectId).eq('user_id', userId);
  return { error: res.error };
}

// ── Invitations ───────────────────────────────────────────────────

export async function inviteByEmail(projectId: string, email: string, role: Role = 'editor'): Promise<{ data: CloudInvitation | null; error: PostgrestError | null }> {
  const c = requireClient();
  const user = (await c.auth.getUser()).data.user;
  if (!user) throw new Error('Wymagane logowanie');
  const res = await c.from('project_invitations').insert({
    project_id: projectId,
    email: email.trim().toLowerCase(),
    role,
    invited_by: user.id
  }).select().single();
  return { data: res.data as CloudInvitation | null, error: res.error };
}

export async function listInvitations(projectId: string): Promise<{ data: CloudInvitation[]; error: PostgrestError | null }> {
  const c = requireClient();
  const res = await c.from('project_invitations')
    .select('*')
    .eq('project_id', projectId)
    .is('accepted_at', null);
  return { data: (res.data || []) as CloudInvitation[], error: res.error };
}

/** Zaakceptuj zaproszenie (dla zalogowanego usera po jego email'u) */
export async function acceptInvitation(invitationId: string): Promise<{ error: string | null }> {
  const c = requireClient();
  const user = (await c.auth.getUser()).data.user;
  if (!user) return { error: 'Wymagane logowanie' };

  // 1. Znajdź zaproszenie
  const invRes = await c.from('project_invitations').select('*').eq('id', invitationId).single();
  if (invRes.error || !invRes.data) return { error: invRes.error?.message || 'Nie znaleziono zaproszenia' };
  const inv = invRes.data as CloudInvitation;

  // 2. Dodaj jako członka (policy pozwala user_id=auth.uid())
  const memRes = await c.from('project_members').insert({
    project_id: inv.project_id,
    user_id: user.id,
    role: inv.role
  });
  if (memRes.error) return { error: memRes.error.message };

  // 3. Oznacz zaproszenie jako zaakceptowane
  const updRes = await c.from('project_invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitationId);
  return { error: updRes.error?.message ?? null };
}

export async function deleteInvitation(id: string): Promise<{ error: PostgrestError | null }> {
  const c = requireClient();
  const res = await c.from('project_invitations').delete().eq('id', id);
  return { error: res.error };
}

/** Pending zaproszenia dla zalogowanego usera (po jego email) */
export async function myPendingInvitations(): Promise<{ data: CloudInvitation[]; error: PostgrestError | null }> {
  const c = requireClient();
  const email = (await c.auth.getUser()).data.user?.email;
  if (!email) return { data: [], error: null };
  const res = await c.from('project_invitations')
    .select('*')
    .eq('email', email.toLowerCase())
    .is('accepted_at', null);
  return { data: (res.data || []) as CloudInvitation[], error: res.error };
}
