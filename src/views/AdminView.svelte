<script lang="ts">
  import { auth } from '../lib/state/auth';
  import { currentProject } from '../lib/state/currentProject';
  import { projectMeta } from '../lib/state/project';
  import {
    attachProjectToOrganization,
    assignEmployeeToProject,
    createEmployee,
    createOrganization,
    createOrganizationProject,
    deleteOrganizationInvitation,
    getMyPlatformAdminStatus,
    inviteOrganizationMemberByEmail,
    listEmployees,
    listOrganizationInvitations,
    listOrganizationMembers,
    listOrganizationProjects,
    listOrganizations,
    listProjectStaffing,
    removeEmployeeFromProject,
    removeEmployee,
    updateEmployee,
    updateOrganizationMemberRole,
    type CloudEmployee,
    type CloudOrganization,
    type CloudOrganizationInvitation,
    type CloudOrganizationMember,
    type CloudProjectStaffing,
    type OrganizationRole
  } from '../lib/cloud/admin';
  import type { CloudProject } from '../lib/cloud/projects';

  type AdminSection = 'context' | 'projects' | 'employees' | 'access';

  let organizations: CloudOrganization[] = [];
  let orgProjects: CloudProject[] = [];
  let orgMembers: CloudOrganizationMember[] = [];
  let orgInvitations: CloudOrganizationInvitation[] = [];
  let employees: CloudEmployee[] = [];
  let staffing: CloudProjectStaffing[] = [];

  let selectedOrgId = '';
  let adminSection: AdminSection = 'context';
  let loading = false;
  let saving = false;
  let schemaReady = true;
  let inviteFeaturesReady = true;
  let platformAdminReady = true;
  let isPlatformAdmin = false;
  let error: string | null = null;
  let notice: string | null = null;
  let lastUserId: string | null = null;

  let newOrgName = '';
  let newOrgSlug = '';

  let newProjectName = '';
  let newProjectClient = '';

  let newEmployeeName = '';
  let newEmployeeEmail = '';
  let newEmployeePhone = '';
  let newEmployeeTitle = '';
  let newEmployeeDepartment = '';
  let newEmployeeCode = '';
  let selectedInviteEmployeeId = '';
  let newInviteEmail = '';
  let newInviteRole: OrganizationRole = 'member';

  let employeeFilter = '';
  let selectedEmployeeId = '';
  let staffingRole = '';
  let staffingAllocation = 100;

  let editingEmployeeId: string | null = null;
  let employeeDraftTitle = '';
  let employeeDraftDepartment = '';
  let employeeDraftActive = true;

  const ROLE_LABEL: Record<OrganizationRole, string> = {
    owner: 'Owner',
    admin: 'Admin',
    hr: 'Kadry',
    coord_manager: 'Koordynacja',
    member: 'Członek'
  };

  const ADMIN_SECTIONS: Array<{ id: AdminSection; label: string; meta: string }> = [
    { id: 'context', label: 'Kontekst', meta: 'firma i uprawnienia' },
    { id: 'projects', label: 'Projekty', meta: 'lista, podpięcie i staffing' },
    { id: 'employees', label: 'Pracownicy', meta: 'katalog i edycja' },
    { id: 'access', label: 'Dostęp', meta: 'zaproszenia i role' }
  ];

  const SUPER_ADMIN_FALLBACK_EMAILS = new Set(['starghz@icloud.com']);

  function clearFeedback() {
    error = null;
    notice = null;
  }

  function normalizeSlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function isSetupError(message?: string | null, code?: string | null): boolean {
    const text = String(message || '').toLowerCase();
    return code === '42P01'
      || code === '42883'
      || text.includes('does not exist')
      || text.includes('could not find the table')
      || text.includes('function public.create_organization_for_me')
      || text.includes('function public.is_platform_admin')
      || text.includes('platform_admins');
  }

  function isKnownSuperAdmin(email?: string | null): boolean {
    return SUPER_ADMIN_FALLBACK_EMAILS.has(String(email || '').trim().toLowerCase());
  }

  function handleLoadError(message?: string | null, code?: string | null): boolean {
    if (isSetupError(message, code)) {
      schemaReady = false;
      error = 'Warstwa admina nie jest jeszcze aktywna w bazie Supabase. Trzeba uruchomić migrację 005_admin_organizations.sql w SQL Editor.';
      organizations = [];
      orgProjects = [];
      orgMembers = [];
      orgInvitations = [];
      employees = [];
      staffing = [];
      return true;
    }
    return false;
  }

  function handleInvitationFeatureError(message?: string | null, code?: string | null): boolean {
    if (isSetupError(message, code)) {
      inviteFeaturesReady = false;
      orgInvitations = [];
      return true;
    }
    return false;
  }

  function handlePlatformAdminError(message?: string | null, code?: string | null): boolean {
    if (isSetupError(message, code)) {
      platformAdminReady = false;
      isPlatformAdmin = isKnownSuperAdmin($auth.user?.email);
      return true;
    }
    return false;
  }

  function resetData() {
    organizations = [];
    orgProjects = [];
    orgMembers = [];
    orgInvitations = [];
    employees = [];
    staffing = [];
    selectedOrgId = '';
    schemaReady = true;
    inviteFeaturesReady = true;
    platformAdminReady = true;
    isPlatformAdmin = false;
    adminSection = 'context';
    clearFeedback();
  }

  $: activeOrganization = organizations.find((org) => org.id === selectedOrgId) ?? null;
  $: activeProjectId = $currentProject.id;
  $: activeProjectName = $projectMeta.name.trim() || $currentProject.name || 'Aktywny projekt';
  $: activeProjectCode = $projectMeta.code.trim();
  $: activeOrgRole = orgMembers.find((member) => member.user_id === $auth.user?.id)?.role ?? null;
  $: activeRoleLabel = activeOrgRole ? ROLE_LABEL[activeOrgRole] : null;
  $: canManageMembers = activeOrgRole === 'owner';
  $: canInviteMembers = activeOrgRole === 'owner' || activeOrgRole === 'admin';
  $: inviteRoleOptions = activeOrgRole === 'owner'
    ? (['admin', 'hr', 'coord_manager', 'member'] as OrganizationRole[])
    : (['hr', 'coord_manager', 'member'] as OrganizationRole[]);
  $: if (!inviteRoleOptions.includes(newInviteRole)) {
    newInviteRole = inviteRoleOptions[inviteRoleOptions.length - 1] ?? 'member';
  }
  $: inviteableEmployees = employees.filter((employee) => employee.active && Boolean(employee.email?.trim()));
  $: if (selectedInviteEmployeeId && !inviteableEmployees.some((employee) => employee.id === selectedInviteEmployeeId)) {
    selectedInviteEmployeeId = '';
  }
  $: currentOrgProject = orgProjects.find((project) => project.id === activeProjectId) ?? null;
  $: currentProjectAttached = Boolean(currentOrgProject);
  $: filteredEmployees = employees.filter((employee) => {
    const q = employeeFilter.trim().toLowerCase();
    if (!q) return true;
    return [
      employee.full_name,
      employee.email || '',
      employee.title || '',
      employee.department || '',
      employee.employee_code || ''
    ].some((part) => part.toLowerCase().includes(q));
  });
  $: staffingRows = staffing.map((row) => ({
    ...row,
    employee: employees.find((employee) => employee.id === row.employee_id) ?? null
  }));
  $: if (!selectedEmployeeId && employees.length > 0) {
    selectedEmployeeId = employees.find((employee) => employee.active)?.id ?? employees[0].id;
  }

  $: {
    const userId = $auth.user?.id ?? null;
    if (userId !== lastUserId) {
      lastUserId = userId;
      if (userId) {
        void refreshAll(selectedOrgId);
      } else {
        resetData();
      }
    }
  }

  $: if (activeProjectId && selectedOrgId && lastUserId) {
    void refreshStaffingOnly();
  }

  async function refreshAll(preferredOrgId = selectedOrgId) {
    if (!$auth.user) return;
    loading = true;
    schemaReady = true;
    inviteFeaturesReady = true;
    platformAdminReady = true;
    clearFeedback();

    const [orgRes, platformAdminRes] = await Promise.all([
      listOrganizations(),
      getMyPlatformAdminStatus()
    ]);

    if (platformAdminRes.error) {
      if (!handlePlatformAdminError(platformAdminRes.error.message, platformAdminRes.error.code)) {
        error = platformAdminRes.error.message;
      }
    } else {
      isPlatformAdmin = platformAdminRes.data;
    }

    if (orgRes.error) {
      if (!handleLoadError(orgRes.error.message, orgRes.error.code)) {
        error = orgRes.error.message;
      }
      loading = false;
      return;
    }

    organizations = orgRes.data;
    const nextOrgId =
      preferredOrgId && orgRes.data.some((org) => org.id === preferredOrgId)
        ? preferredOrgId
        : orgRes.data[0]?.id ?? '';
    selectedOrgId = nextOrgId;

    if (nextOrgId) {
      await loadOrganization(nextOrgId);
    } else {
      orgProjects = [];
      orgMembers = [];
      orgInvitations = [];
      employees = [];
      staffing = [];
    }

    loading = false;
  }

  async function loadOrganization(orgId: string) {
    if (!orgId) return;

    const [projectsRes, membersRes, employeesRes] = await Promise.all([
      listOrganizationProjects(orgId),
      listOrganizationMembers(orgId),
      listEmployees(orgId)
    ]);

    const firstError = [projectsRes.error, membersRes.error, employeesRes.error].find(Boolean);
    if (firstError) {
      if (!handleLoadError(firstError.message, firstError.code)) {
        error = firstError.message;
      }
      return;
    }

    orgProjects = projectsRes.data;
    orgMembers = membersRes.data;
    employees = employeesRes.data;
    await refreshInvitationsOnly(orgId);
    await refreshStaffingOnly();
  }

  async function refreshInvitationsOnly(orgId = selectedOrgId) {
    if (!orgId) {
      orgInvitations = [];
      return;
    }

    inviteFeaturesReady = true;
    const invitesRes = await listOrganizationInvitations(orgId);
    if (invitesRes.error) {
      if (!handleInvitationFeatureError(invitesRes.error.message, invitesRes.error.code)) {
        error = invitesRes.error.message;
      }
      return;
    }

    orgInvitations = invitesRes.data;
  }

  async function refreshStaffingOnly() {
    if (!selectedOrgId || !activeProjectId || !orgProjects.some((project) => project.id === activeProjectId)) {
      staffing = [];
      return;
    }

    const staffingRes = await listProjectStaffing(activeProjectId);
    if (staffingRes.error) {
      if (!handleLoadError(staffingRes.error.message, staffingRes.error.code)) {
        error = staffingRes.error.message;
      }
      return;
    }
    staffing = staffingRes.data;
  }

  async function onCreateOrganization() {
    clearFeedback();
    if (!isPlatformAdmin) {
      error = 'Dodawanie organizacji jest dostępne tylko dla super admina platformy.';
      return;
    }
    const name = newOrgName.trim();
    if (!name) {
      error = 'Podaj nazwę organizacji.';
      return;
    }

    saving = true;
    const res = await createOrganization(name, normalizeSlug(newOrgSlug));
    saving = false;
    if (res.error) {
      if (!handleLoadError(res.error.message, res.error.code)) {
        error = res.error.message;
      }
      return;
    }

    newOrgName = '';
    newOrgSlug = '';
    await refreshAll(res.data?.id || selectedOrgId);
    notice = 'Organizacja została utworzona.';
  }

  async function onCreateProject() {
    clearFeedback();
    if (!selectedOrgId) {
      error = 'Najpierw wybierz organizację.';
      return;
    }
    const name = newProjectName.trim();
    if (!name) {
      error = 'Podaj nazwę projektu.';
      return;
    }

    saving = true;
    const res = await createOrganizationProject(selectedOrgId, name, {}, newProjectClient.trim() || undefined);
    saving = false;
    if (res.error) {
      error = res.error.message;
      return;
    }

    newProjectName = '';
    newProjectClient = '';
    await refreshAll(selectedOrgId);
    notice = 'Projekt został dodany do organizacji.';
  }

  async function onAttachCurrentProject() {
    clearFeedback();
    if (!selectedOrgId || !activeProjectId) {
      error = 'Brak aktywnego projektu do podpięcia.';
      return;
    }

    saving = true;
    const res = await attachProjectToOrganization(activeProjectId, selectedOrgId);
    saving = false;
    if (res.error) {
      error = res.error.message;
      return;
    }

    await refreshAll(selectedOrgId);
    notice = 'Aktywny projekt został podpięty do organizacji.';
  }

  async function onCreateEmployee() {
    clearFeedback();
    if (!selectedOrgId) {
      error = 'Najpierw wybierz organizację.';
      return;
    }
    if (!newEmployeeName.trim()) {
      error = 'Podaj imię i nazwisko pracownika.';
      return;
    }

    saving = true;
    const res = await createEmployee(selectedOrgId, {
      full_name: newEmployeeName.trim(),
      email: newEmployeeEmail.trim() || null,
      phone: newEmployeePhone.trim() || null,
      title: newEmployeeTitle.trim() || null,
      department: newEmployeeDepartment.trim() || null,
      employee_code: newEmployeeCode.trim() || null,
      company: activeOrganization?.name || null
    });
    saving = false;
    if (res.error) {
      error = res.error.message;
      return;
    }

    newEmployeeName = '';
    newEmployeeEmail = '';
    newEmployeePhone = '';
    newEmployeeTitle = '';
    newEmployeeDepartment = '';
    newEmployeeCode = '';
    await refreshAll(selectedOrgId);
    notice = 'Pracownik został dodany do katalogu firmy.';
  }

  async function onInviteMember() {
    clearFeedback();
    if (!selectedOrgId) {
      error = 'Najpierw wybierz organizację.';
      return;
    }
    if (!canInviteMembers) {
      error = 'Tylko owner lub admin organizacji może wysyłać zaproszenia.';
      return;
    }
    if (!newInviteEmail.trim()) {
      error = 'Podaj adres email osoby do zaproszenia.';
      return;
    }

    saving = true;
    const res = await inviteOrganizationMemberByEmail(selectedOrgId, newInviteEmail, newInviteRole);
    saving = false;
    if (res.error) {
      if (!handleInvitationFeatureError(res.error.message, res.error.code)) {
        error = res.error.message;
      }
      return;
    }

    newInviteEmail = '';
    selectedInviteEmployeeId = '';
    newInviteRole = 'member';
    await refreshInvitationsOnly(selectedOrgId);
    notice = 'Zaproszenie do organizacji zostało wysłane.';
  }

  async function onDeleteInvitation(invitationId: string) {
    clearFeedback();
    saving = true;
    const res = await deleteOrganizationInvitation(invitationId);
    saving = false;
    if (res.error) {
      if (!handleInvitationFeatureError(res.error.message, res.error.code)) {
        error = res.error.message;
      }
      return;
    }
    await refreshInvitationsOnly(selectedOrgId);
    notice = 'Zaproszenie zostało odwołane.';
  }

  function startEmployeeEdit(employee: CloudEmployee) {
    editingEmployeeId = employee.id;
    employeeDraftTitle = employee.title || '';
    employeeDraftDepartment = employee.department || '';
    employeeDraftActive = employee.active;
    clearFeedback();
  }

  function cancelEmployeeEdit() {
    editingEmployeeId = null;
    employeeDraftTitle = '';
    employeeDraftDepartment = '';
  }

  async function saveEmployeeEdit(employee: CloudEmployee) {
    clearFeedback();
    saving = true;
    const res = await updateEmployee(employee.id, {
      title: employeeDraftTitle.trim() || null,
      department: employeeDraftDepartment.trim() || null,
      active: employeeDraftActive
    });
    saving = false;
    if (res.error) {
      error = res.error.message;
      return;
    }
    cancelEmployeeEdit();
    await refreshAll(selectedOrgId);
    notice = 'Dane pracownika zostały zaktualizowane.';
  }

  async function onRemoveEmployee(employeeId: string) {
    clearFeedback();
    saving = true;
    const res = await removeEmployee(employeeId);
    saving = false;
    if (res.error) {
      error = res.error.message;
      return;
    }
    await refreshAll(selectedOrgId);
    notice = 'Pracownik został usunięty z katalogu.';
  }

  async function onAssignEmployee() {
    clearFeedback();
    if (!selectedOrgId || !activeProjectId) {
      error = 'Brak aktywnego projektu.';
      return;
    }
    if (!currentProjectAttached) {
      error = 'Najpierw podepnij aktywny projekt do wybranej organizacji.';
      return;
    }
    if (!selectedEmployeeId) {
      error = 'Wybierz pracownika do przypisania.';
      return;
    }

    saving = true;
    const res = await assignEmployeeToProject({
      organizationId: selectedOrgId,
      projectId: activeProjectId,
      employeeId: selectedEmployeeId,
      staffingRole: staffingRole.trim() || null,
      allocationPct: Number(staffingAllocation) || 100
    });
    saving = false;
    if (res.error) {
      error = res.error.message;
      return;
    }

    staffingRole = '';
    staffingAllocation = 100;
    await refreshStaffingOnly();
    notice = 'Pracownik został przypisany do aktywnego projektu.';
  }

  async function onRemoveStaffing(employeeId: string) {
    if (!activeProjectId) return;
    clearFeedback();
    saving = true;
    const res = await removeEmployeeFromProject(activeProjectId, employeeId);
    saving = false;
    if (res.error) {
      error = res.error.message;
      return;
    }
    await refreshStaffingOnly();
    notice = 'Przypisanie zostało usunięte.';
  }

  async function onChangeMemberRole(userId: string, role: OrganizationRole) {
    if (!selectedOrgId) return;
    clearFeedback();
    saving = true;
    const res = await updateOrganizationMemberRole(selectedOrgId, userId, role);
    saving = false;
    if (res.error) {
      error = res.error.message;
      return;
    }
    await refreshAll(selectedOrgId);
    notice = 'Rola w organizacji została zaktualizowana.';
  }

  function handleMemberRoleSelect(userId: string, event: Event) {
    const role = (event.currentTarget as HTMLSelectElement).value as OrganizationRole;
    void onChangeMemberRole(userId, role);
  }

  function handleInviteEmployeeSelect(event: Event) {
    selectedInviteEmployeeId = (event.currentTarget as HTMLSelectElement).value;
    const employee = inviteableEmployees.find((item) => item.id === selectedInviteEmployeeId);
    if (employee?.email) {
      newInviteEmail = employee.email;
      clearFeedback();
    }
  }

  function projectBadge(project: CloudProject): string {
    return project.id === activeProjectId ? 'Aktywny teraz' : 'Projekt organizacji';
  }

  function goToSection(sectionId: AdminSection) {
    adminSection = sectionId;
    clearFeedback();
  }
</script>

<div class="admin-pane">
  <div class="admin-shell">
    <section class="admin-hero">
      <div class="admin-hero-copy">
        <span class="admin-eyebrow">Panel administracyjny</span>
        <strong>Firma, projekty i obsada w jednym miejscu</strong>
        <p>Tu budujemy warstwę dla kadr i koordynacji: lista projektów, katalog pracowników i przypisania do aktywnego projektu bez ręcznego wpisywania ludzi w środku WBS.</p>
      </div>

      <div class="admin-hero-rail">
        <article class="admin-kpi">
          <span>Organizacje</span>
          <strong>{organizations.length}</strong>
          <small>kontekstów firmowych</small>
        </article>
        <article class="admin-kpi">
          <span>Projekty</span>
          <strong>{orgProjects.length}</strong>
          <small>w wybranej organizacji</small>
        </article>
        <article class="admin-kpi">
          <span>Pracownicy</span>
          <strong>{employees.length}</strong>
          <small>w katalogu firmy</small>
        </article>
        <article class="admin-kpi">
          <span>Obsada</span>
          <strong>{staffing.length}</strong>
          <small>w aktywnym projekcie</small>
        </article>
      </div>
    </section>

    {#if !$auth.configured}
      <section class="admin-card admin-empty">
        <strong>Panel admina wymaga Supabase</strong>
        <p>Najpierw skonfiguruj `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY`, a potem zaloguj się do aplikacji.</p>
      </section>
    {:else if !$auth.user}
      <section class="admin-card admin-empty">
        <strong>Zaloguj się, aby wejść do panelu admina</strong>
        <p>Po sesji pokażemy Twoje organizacje, projekty i katalog pracowników.</p>
      </section>
    {:else}
      {#if error}
        <section class="admin-card admin-alert admin-alert-error">
          <strong>{schemaReady ? 'Coś poszło nie tak' : 'Baza nie jest jeszcze gotowa pod admina'}</strong>
          <p>{error}</p>
          {#if !schemaReady}
            <p>Gotowy plik do wklejenia w SQL Editor to `supabase/migrations/005_admin_organizations.sql`.</p>
          {/if}
        </section>
      {/if}

      {#if notice}
        <section class="admin-card admin-alert admin-alert-ok">
          <strong>Zmiana zapisana</strong>
          <p>{notice}</p>
        </section>
      {/if}

      <section class="admin-context-strip">
        <div class="admin-context-copy">
          <span>Aktywny kontekst</span>
          <strong>{activeOrganization ? activeOrganization.name : 'Brak wybranej organizacji'}</strong>
          <p>
            {#if activeOrganization}
              {#if activeRoleLabel}
                Twoja rola w tej organizacji: {activeRoleLabel}.
              {:else}
                Ta organizacja nie ma jeszcze przypisanej Ci roli.
              {/if}
              {#if isPlatformAdmin}
                Masz też dostęp super admina do konfiguracji firm.
              {/if}
            {:else if isPlatformAdmin}
              Wybierz organizację z listy albo utwórz nową firmę jako super admin platformy.
            {:else}
              Wybierz organizację z listy, żeby przejść do projektów, pracowników i dostępu.
            {/if}
          </p>
        </div>

        <div class="admin-context-actions">
          <label class="admin-select-wrap admin-select-inline">
            <span>Aktywna organizacja</span>
            <select bind:value={selectedOrgId} on:change={() => refreshAll(selectedOrgId)} disabled={loading || saving || organizations.length === 0}>
              {#if organizations.length === 0}
                <option value="">Brak organizacji</option>
              {/if}
              {#each organizations as organization}
                <option value={organization.id}>{organization.name}</option>
              {/each}
            </select>
          </label>

          <button class="admin-ghost-btn" type="button" on:click={() => refreshAll(selectedOrgId)} disabled={loading || saving}>
            {loading ? 'Ładowanie…' : 'Odśwież'}
          </button>
        </div>
      </section>

      <nav class="admin-section-nav" aria-label="Sekcje panelu admina">
        {#each ADMIN_SECTIONS as section}
          <button
            type="button"
            class="admin-section-btn"
            class:active={adminSection === section.id}
            on:click={() => goToSection(section.id)}
          >
            <span>{section.label}</span>
            <small>{section.meta}</small>
          </button>
        {/each}
      </nav>

      {#if adminSection === 'context'}
        <section class="admin-grid admin-grid-context">
          <article class="admin-card">
            <div class="admin-card-head">
              <div>
                <span>Organizacje</span>
                <strong>Konfiguracja firmy</strong>
              </div>
              <div class="admin-chip-stack">
                {#if isPlatformAdmin}
                  <span class="admin-chip admin-chip-accent">Super admin</span>
                {/if}
                {#if activeRoleLabel}
                  <span class="admin-chip">{activeRoleLabel}</span>
                {/if}
              </div>
            </div>

            <div class="admin-summary-grid">
              <article class="admin-summary-item">
                <span>Organizacje</span>
                <strong>{organizations.length}</strong>
                <small>dostępne w Twoim kontekście</small>
              </article>
              <article class="admin-summary-item">
                <span>Projekty</span>
                <strong>{orgProjects.length}</strong>
                <small>w wybranej firmie</small>
              </article>
              <article class="admin-summary-item">
                <span>Pracownicy</span>
                <strong>{employees.length}</strong>
                <small>w katalogu firmy</small>
              </article>
            </div>

            {#if isPlatformAdmin}
              <form class="admin-form" on:submit|preventDefault={onCreateOrganization}>
                <div class="admin-form-head">
                  <strong>Dodaj organizację</strong>
                  <small>tylko super admin może tworzyć nowe firmy</small>
                </div>
                <div class="admin-form-grid">
                  <label>
                    <span>Nazwa firmy</span>
                    <input bind:value={newOrgName} placeholder="np. Knur Energy" />
                  </label>
                  <label>
                    <span>Slug</span>
                    <input bind:value={newOrgSlug} placeholder="np. knur-energy" />
                  </label>
                </div>
                <button class="admin-primary-btn" type="submit" disabled={saving}>Utwórz organizację</button>
              </form>

              {#if !platformAdminReady}
                <div class="admin-footnote admin-footnote-info">
                  Front rozpoznaje Cię już jako super admina, ale backendową blokadę warto jeszcze domknąć migracją `007_platform_admins.sql`.
                </div>
              {/if}
            {:else}
              <div class="admin-footnote admin-footnote-locked">
                Dodawanie organizacji jest dostępne tylko dla super admina platformy. Dla zwykłych ról firmowych zostają projekty, pracownicy i dostęp w istniejącej organizacji.
              </div>
            {/if}
          </article>

          <article class="admin-card">
            <div class="admin-card-head">
              <div>
                <span>Stan wybranej firmy</span>
                <strong>{activeOrganization ? activeOrganization.name : 'Najpierw wybierz organizację'}</strong>
              </div>
            </div>

            {#if activeOrganization}
              <div class="admin-list">
                <article class="admin-list-card">
                  <div>
                    <strong>Slug organizacji</strong>
                    <span>{activeOrganization.slug || 'Brak zdefiniowanego slugu'}</span>
                  </div>
                  <div class="admin-chip-stack">
                    <span class="admin-chip admin-chip-muted">{new Date(activeOrganization.updated_at).toLocaleDateString('pl-PL')}</span>
                  </div>
                </article>
                <article class="admin-list-card">
                  <div>
                    <strong>Aktywny projekt w workspace</strong>
                    <span>{activeProjectName}</span>
                  </div>
                  <div class="admin-chip-stack">
                    {#if activeProjectCode}
                      <span class="admin-chip">Kod: {activeProjectCode}</span>
                    {/if}
                    <span class="admin-chip">{currentProjectAttached ? 'Podpięty do firmy' : 'Projekt osobisty'}</span>
                  </div>
                </article>
                <article class="admin-list-card">
                  <div>
                    <strong>Zespół i dostęp</strong>
                    <span>{employees.filter((employee) => employee.active).length} aktywnych pracowników • {orgMembers.length} członków organizacji</span>
                  </div>
                  <div class="admin-chip-stack">
                    <span class="admin-chip admin-chip-muted">{staffing.length} przypisań do aktywnego projektu</span>
                  </div>
                </article>
              </div>
            {:else}
              <div class="admin-empty-inline">
                Nie ma jeszcze wybranej organizacji. Wybierz ją w górnym pasku, a potem przejdź do sekcji `Projekty`, `Pracownicy` albo `Dostęp`.
              </div>
            {/if}
          </article>
        </section>
      {:else if adminSection === 'projects'}
        <section class="admin-grid admin-grid-projects">
          <article class="admin-card">
            <div class="admin-card-head">
              <div>
                <span>Aktywny projekt</span>
                <strong>{activeProjectName}</strong>
              </div>
              <div class="admin-chip-stack">
                {#if activeProjectCode}
                  <span class="admin-chip">Kod: {activeProjectCode}</span>
                {/if}
                <span class="admin-chip">{currentProjectAttached ? 'Podpięty do organizacji' : 'Projekt osobisty'}</span>
              </div>
            </div>

            <div class="admin-active-project">
              <p>Najpierw podepnij bieżący projekt do wybranej organizacji, a potem dodawaj kolejne projekty firmowe i przypisuj do nich ludzi z katalogu.</p>
              <button class="admin-primary-btn" type="button" disabled={!selectedOrgId || !activeProjectId || currentProjectAttached || saving} on:click={onAttachCurrentProject}>
                {currentProjectAttached ? 'Projekt jest już w tej organizacji' : 'Podepnij aktywny projekt do organizacji'}
              </button>
            </div>

            <form class="admin-form" on:submit|preventDefault={onCreateProject}>
              <div class="admin-form-head">
                <strong>Dodaj nowy projekt organizacji</strong>
                <small>nowy wpis od razu trafia do firmowej listy projektów</small>
              </div>
              <div class="admin-form-grid">
                <label>
                  <span>Nazwa projektu</span>
                  <input bind:value={newProjectName} placeholder="np. Moderna Elektro — rozbudowa hali" />
                </label>
                <label>
                  <span>Klient</span>
                  <input bind:value={newProjectClient} placeholder="np. ElektroPro Sp. z o.o." />
                </label>
              </div>
              <button class="admin-primary-btn" type="submit" disabled={!selectedOrgId || saving}>Dodaj projekt do organizacji</button>
            </form>
          </article>

          <article class="admin-card">
            <div class="admin-card-head">
              <div>
                <span>Projekty organizacji</span>
                <strong>{activeOrganization ? activeOrganization.name : 'Brak wybranej organizacji'}</strong>
              </div>
            </div>

            {#if !selectedOrgId}
              <div class="admin-empty-inline">Najpierw wybierz organizację, żeby zobaczyć listę projektów firmowych.</div>
            {:else if orgProjects.length === 0}
              <div class="admin-empty-inline">Ta organizacja nie ma jeszcze żadnych projektów.</div>
            {:else}
              <div class="admin-list">
                {#each orgProjects as project}
                  <article class="admin-list-card" data-active={project.id === activeProjectId ? '1' : '0'}>
                    <div>
                      <strong>{project.name}</strong>
                      <span>{project.client || 'Bez przypisanego klienta'}</span>
                    </div>
                    <div class="admin-chip-stack">
                      <span class="admin-chip">{projectBadge(project)}</span>
                      <span class="admin-chip admin-chip-muted">{new Date(project.updated_at).toLocaleDateString('pl-PL')}</span>
                    </div>
                  </article>
                {/each}
              </div>
            {/if}
          </article>
        </section>

        <section class="admin-grid admin-grid-single">
          <article class="admin-card">
            <div class="admin-card-head">
              <div>
                <span>Obsada aktywnego projektu</span>
                <strong>{activeProjectName}</strong>
              </div>
              <div class="admin-chip-stack">
                <span class="admin-chip">{currentProjectAttached ? 'Gotowy do staffingu' : 'Najpierw podepnij projekt'}</span>
              </div>
            </div>

            <form class="admin-form" on:submit|preventDefault={onAssignEmployee}>
              <div class="admin-form-grid admin-form-grid-3">
                <label>
                  <span>Pracownik</span>
                  <select bind:value={selectedEmployeeId} disabled={employees.length === 0}>
                    {#each employees as employee}
                      <option value={employee.id}>{employee.full_name}</option>
                    {/each}
                  </select>
                </label>
                <label>
                  <span>Rola w projekcie</span>
                  <input bind:value={staffingRole} placeholder="np. Kierownik projektu" />
                </label>
                <label>
                  <span>Obłożenie (%)</span>
                  <input bind:value={staffingAllocation} type="number" min="0" max="100" />
                </label>
              </div>
              <button class="admin-primary-btn" type="submit" disabled={!currentProjectAttached || employees.length === 0 || saving}>
                Przypisz pracownika do aktywnego projektu
              </button>
            </form>

            {#if staffingRows.length === 0}
              <div class="admin-empty-inline">Brak przypisań dla aktywnego projektu w tej organizacji.</div>
            {:else}
              <div class="admin-list">
                {#each staffingRows as row}
                  <article class="admin-list-card">
                    <div>
                      <strong>{row.employee?.full_name || 'Nieznany pracownik'}</strong>
                      <span>{row.staffing_role || row.employee?.title || 'Bez roli w projekcie'} • {Number(row.allocation_pct).toFixed(0)}%</span>
                    </div>
                    <button class="admin-danger-btn" type="button" on:click={() => onRemoveStaffing(row.employee_id)} disabled={saving}>Usuń</button>
                  </article>
                {/each}
              </div>
            {/if}
          </article>
        </section>
      {:else if adminSection === 'employees'}
        <section class="admin-grid admin-grid-employees">
          <article class="admin-card">
            <div class="admin-card-head">
              <div>
                <span>Katalog pracowników</span>
                <strong>Dodaj pracownika do firmy</strong>
              </div>
              <div class="admin-chip-stack">
                <span class="admin-chip">{employees.filter((employee) => employee.active).length} aktywnych</span>
              </div>
            </div>

            <form class="admin-form" on:submit|preventDefault={onCreateEmployee}>
              <div class="admin-form-head">
                <strong>Nowa osoba w katalogu</strong>
                <small>ten katalog zasila później przypisania do projektów</small>
              </div>
              <div class="admin-form-grid admin-form-grid-3">
                <label>
                  <span>Imię i nazwisko</span>
                  <input bind:value={newEmployeeName} placeholder="np. Hanna Stryjewska" />
                </label>
                <label>
                  <span>Email</span>
                  <input bind:value={newEmployeeEmail} type="email" placeholder="np. hanna@firma.pl" />
                </label>
                <label>
                  <span>Telefon</span>
                  <input bind:value={newEmployeePhone} placeholder="np. 600 700 800" />
                </label>
                <label>
                  <span>Stanowisko</span>
                  <input bind:value={newEmployeeTitle} placeholder="np. Kierownik koordynacji" />
                </label>
                <label>
                  <span>Dział</span>
                  <input bind:value={newEmployeeDepartment} placeholder="np. Kadry" />
                </label>
                <label>
                  <span>Kod pracownika</span>
                  <input bind:value={newEmployeeCode} placeholder="np. EMP-014" />
                </label>
              </div>
              <button class="admin-primary-btn" type="submit" disabled={!selectedOrgId || saving}>Dodaj do katalogu</button>
            </form>
          </article>

          <article class="admin-card">
            <div class="admin-card-head">
              <div>
                <span>Pracownicy firmy</span>
                <strong>Lista i edycja</strong>
              </div>
            </div>

            <label class="admin-search">
              <span>Filtr pracowników</span>
              <input bind:value={employeeFilter} placeholder="Szukaj po nazwie, mailu, dziale lub kodzie" />
            </label>

            {#if !selectedOrgId}
              <div class="admin-empty-inline">Najpierw wybierz organizację, żeby zarządzać katalogiem pracowników.</div>
            {:else if filteredEmployees.length === 0}
              <div class="admin-empty-inline">Brak pracowników pasujących do filtra.</div>
            {:else}
              <div class="admin-list">
                {#each filteredEmployees as employee}
                  <article class="admin-list-card admin-list-card-stack">
                    <div class="admin-employee-head">
                      <div>
                        <strong>{employee.full_name}</strong>
                        <span>{employee.title || 'Bez stanowiska'}{employee.department ? ` • ${employee.department}` : ''}</span>
                      </div>
                      <div class="admin-chip-stack">
                        {#if employee.employee_code}
                          <span class="admin-chip admin-chip-muted">{employee.employee_code}</span>
                        {/if}
                        <span class:admin-chip-muted={!employee.active} class="admin-chip">{employee.active ? 'Aktywny' : 'Nieaktywny'}</span>
                      </div>
                    </div>

                    {#if editingEmployeeId === employee.id}
                      <div class="admin-inline-form">
                        <label>
                          <span>Stanowisko</span>
                          <input bind:value={employeeDraftTitle} placeholder="np. Inżynier projektu" />
                        </label>
                        <label>
                          <span>Dział</span>
                          <input bind:value={employeeDraftDepartment} placeholder="np. Koordynacja" />
                        </label>
                        <label class="admin-toggle">
                          <input type="checkbox" bind:checked={employeeDraftActive} />
                          <span>Aktywny w katalogu</span>
                        </label>
                        <div class="admin-inline-actions">
                          <button class="admin-primary-btn" type="button" on:click={() => saveEmployeeEdit(employee)} disabled={saving}>Zapisz</button>
                          <button class="admin-ghost-btn" type="button" on:click={cancelEmployeeEdit}>Anuluj</button>
                        </div>
                      </div>
                    {:else}
                      <div class="admin-inline-meta">
                        <span>{employee.email || 'Brak emaila'}</span>
                        <span>{employee.phone || 'Brak telefonu'}</span>
                      </div>
                      <div class="admin-inline-actions">
                        <button class="admin-ghost-btn" type="button" on:click={() => startEmployeeEdit(employee)}>Edytuj</button>
                        <button class="admin-danger-btn" type="button" on:click={() => onRemoveEmployee(employee.id)} disabled={saving}>Usuń</button>
                      </div>
                    {/if}
                  </article>
                {/each}
              </div>
            {/if}
          </article>
        </section>
      {:else}
        <section class="admin-grid admin-grid-single">
          <article class="admin-card">
            <div class="admin-card-head">
              <div>
                <span>Dostęp do organizacji</span>
                <strong>Zaproszenia i role</strong>
              </div>
              <div class="admin-chip-stack">
                <span class="admin-chip">{activeRoleLabel || 'Brak roli'}</span>
              </div>
            </div>

            {#if inviteFeaturesReady}
              <form class="admin-form" on:submit|preventDefault={onInviteMember}>
                <div class="admin-form-head">
                  <strong>Zaproś osobę do firmy</strong>
                  <small>po pierwszym logowaniu zostanie automatycznie dodana do organizacji</small>
                </div>
                <div class="admin-form-grid">
                  <label class="admin-form-span-2">
                    <span>Pracownik z katalogu</span>
                    <select bind:value={selectedInviteEmployeeId} on:change={handleInviteEmployeeSelect} disabled={!canInviteMembers || inviteableEmployees.length === 0}>
                      <option value="">Wybierz istniejącego pracownika z organizacji</option>
                      {#each inviteableEmployees as employee}
                        <option value={employee.id}>{employee.full_name} — {employee.email}</option>
                      {/each}
                    </select>
                  </label>
                  <label>
                    <span>Email</span>
                    <input bind:value={newInviteEmail} type="email" placeholder="np. osoba@firma.pl" disabled={!canInviteMembers} />
                  </label>
                  <label>
                    <span>Rola startowa</span>
                    <select bind:value={newInviteRole} disabled={!canInviteMembers}>
                      {#each inviteRoleOptions as role}
                        <option value={role}>{ROLE_LABEL[role]}</option>
                      {/each}
                    </select>
                  </label>
                </div>
                {#if inviteableEmployees.length === 0}
                  <div class="admin-footnote">
                    W katalogu tej organizacji nie ma jeszcze aktywnego pracownika z adresem email, więc zaproszenie trzeba wpisać ręcznie.
                  </div>
                {/if}
                <button class="admin-primary-btn" type="submit" disabled={!canInviteMembers || saving}>Wyślij zaproszenie</button>
              </form>

              {#if orgInvitations.length > 0}
                <div class="admin-list">
                  {#each orgInvitations as invitation}
                    <article class="admin-list-card">
                      <div>
                        <strong>{invitation.email}</strong>
                        <span>{ROLE_LABEL[invitation.role]} • ważne do {new Date(invitation.expires_at).toLocaleDateString('pl-PL')}</span>
                      </div>
                      <button class="admin-danger-btn" type="button" on:click={() => onDeleteInvitation(invitation.id)} disabled={!canInviteMembers || saving}>
                        Odwołaj
                      </button>
                    </article>
                  {/each}
                </div>
              {:else}
                <div class="admin-empty-inline">Brak oczekujących zaproszeń do tej organizacji.</div>
              {/if}
            {:else}
              <div class="admin-footnote admin-footnote-info">
                Zaproszenia do organizacji włączą się po uruchomieniu migracji `006_org_invitations.sql`.
              </div>
            {/if}

            {#if orgMembers.length === 0}
              <div class="admin-empty-inline">Brak członków w wybranej organizacji.</div>
            {:else}
              <div class="admin-list">
                {#each orgMembers as member}
                  <article class="admin-list-card">
                    <div>
                      <strong>{member.user_id === $auth.user?.id ? 'Ty' : member.user_id}</strong>
                      <span>Dołączył {new Date(member.joined_at).toLocaleDateString('pl-PL')}</span>
                    </div>
                    <label class="admin-member-role">
                      <span>Rola</span>
                      <select
                        value={member.role}
                        disabled={!canManageMembers || member.user_id === $auth.user?.id || saving}
                        on:change={(event) => handleMemberRoleSelect(member.user_id, event)}
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="hr">Kadry</option>
                        <option value="coord_manager">Koordynacja</option>
                        <option value="member">Członek</option>
                      </select>
                    </label>
                  </article>
                {/each}
              </div>
            {/if}

            <div class="admin-footnote">
              Owner może zmieniać role istniejących członków. Admin może wysyłać nowe zaproszenia, ale bez nadawania roli `owner`.
            </div>
          </article>
        </section>
      {/if}
    {/if}
  </div>
</div>

<style>
  .admin-pane {
    --admin-page-bg:
      radial-gradient(circle at top left, rgba(46, 117, 182, 0.14), transparent 32%),
      linear-gradient(180deg, #f4f8fc 0%, #edf4fb 100%);
    --admin-card-bg: rgba(255, 255, 255, 0.96);
    --admin-card-border: rgba(20, 53, 95, 0.1);
    --admin-card-shadow: 0 18px 34px rgba(15, 23, 42, 0.08);
    --admin-soft-bg: linear-gradient(180deg, rgba(244, 248, 252, 0.98) 0%, rgba(236, 243, 251, 0.98) 100%);
    --admin-subtle-bg: rgba(245, 248, 252, 0.98);
    --admin-input-bg: #ffffff;
    --admin-input-border: #c8d4e3;
    --admin-strong-text: #12345d;
    --admin-body-text: #334862;
    --admin-muted-text: #74849b;
    --admin-muted-strong: #5f7087;
    --admin-chip-bg: rgba(46, 117, 182, 0.12);
    --admin-chip-text: #174171;
    --admin-ghost-bg: rgba(46, 117, 182, 0.08);
    --admin-ghost-border: rgba(46, 117, 182, 0.2);
    --admin-danger-bg: rgba(192, 57, 43, 0.08);
    --admin-danger-border: rgba(192, 57, 43, 0.18);
    --admin-list-active: linear-gradient(180deg, rgba(46, 117, 182, 0.1), rgba(255, 255, 255, 0.98));
    background:
      var(--admin-page-bg);
    border: 1px solid var(--border);
    border-top: none;
  }

  :global([data-theme='dark']) .admin-pane {
    --admin-page-bg:
      radial-gradient(circle at top left, rgba(46, 117, 182, 0.18), transparent 34%),
      linear-gradient(180deg, #081423 0%, #0d1c2f 54%, #102238 100%);
    --admin-card-bg: linear-gradient(180deg, rgba(12, 22, 38, 0.97) 0%, rgba(16, 29, 48, 0.97) 100%);
    --admin-card-border: rgba(114, 145, 181, 0.18);
    --admin-card-shadow: 0 20px 38px rgba(0, 0, 0, 0.24);
    --admin-soft-bg: linear-gradient(180deg, rgba(17, 33, 55, 0.98) 0%, rgba(13, 27, 45, 0.98) 100%);
    --admin-subtle-bg: rgba(19, 34, 55, 0.88);
    --admin-input-bg: rgba(7, 18, 33, 0.94);
    --admin-input-border: #435a74;
    --admin-strong-text: #f4f8ff;
    --admin-body-text: #dbe7f6;
    --admin-muted-text: #a9bbd4;
    --admin-muted-strong: #c1d0e2;
    --admin-chip-bg: rgba(70, 134, 204, 0.18);
    --admin-chip-text: #dcebff;
    --admin-ghost-bg: rgba(63, 123, 188, 0.16);
    --admin-ghost-border: rgba(96, 149, 205, 0.28);
    --admin-danger-bg: rgba(192, 57, 43, 0.16);
    --admin-danger-border: rgba(227, 99, 80, 0.24);
    --admin-list-active: linear-gradient(180deg, rgba(46, 117, 182, 0.16), rgba(16, 29, 48, 0.98));
    border-color: rgba(83, 110, 145, 0.35);
  }

  .admin-shell {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px;
  }

  .admin-hero {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 22px;
    border-radius: 30px;
    background: linear-gradient(135deg, #12345d 0%, #255488 100%);
    color: #fff;
    box-shadow: 0 18px 36px rgba(17, 53, 94, 0.16);
  }

  .admin-hero-copy {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 760px;
  }

  .admin-eyebrow {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.68);
  }

  .admin-hero-copy strong {
    font-size: clamp(28px, 4vw, 44px);
    line-height: 0.98;
    letter-spacing: -0.05em;
  }

  .admin-hero-copy p {
    margin: 0;
    font-size: 15px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.82);
  }

  .admin-hero-rail {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding-bottom: 2px;
    -webkit-overflow-scrolling: touch;
  }

  .admin-kpi {
    flex: 0 0 min(220px, 70vw);
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px 18px;
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.16);
  }

  .admin-kpi span,
  .admin-kpi small {
    color: rgba(255, 255, 255, 0.72);
  }

  .admin-kpi span {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .admin-kpi strong {
    font-size: 28px;
    line-height: 1;
    letter-spacing: -0.04em;
  }

  .admin-kpi small {
    font-size: 12px;
  }

  .admin-grid {
    display: grid;
    gap: 16px;
  }

  .admin-grid-context,
  .admin-grid-projects,
  .admin-grid-employees {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .admin-grid-single {
    grid-template-columns: minmax(0, 1fr);
  }

  .admin-context-strip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 18px 20px;
    border-radius: 26px;
    background: var(--admin-card-bg);
    border: 1px solid var(--admin-card-border);
    box-shadow: var(--admin-card-shadow);
  }

  .admin-context-copy {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .admin-context-copy > span {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--admin-muted-text);
  }

  .admin-context-copy strong {
    font-size: clamp(22px, 3vw, 30px);
    line-height: 1.02;
    letter-spacing: -0.04em;
    color: var(--admin-strong-text);
  }

  .admin-context-copy p {
    margin: 0;
    max-width: 720px;
    font-size: 14px;
    line-height: 1.55;
    color: var(--admin-body-text);
  }

  .admin-context-actions {
    display: grid;
    grid-template-columns: minmax(280px, 1fr) auto;
    align-items: end;
    gap: 12px;
    flex: 1;
    min-width: min(100%, 440px);
  }

  .admin-select-inline {
    min-width: 0;
  }

  .admin-section-nav {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .admin-section-btn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    min-height: 76px;
    padding: 14px 16px;
    border-radius: 22px;
    border: 1px solid var(--admin-card-border);
    background: var(--admin-card-bg);
    box-shadow: var(--admin-card-shadow);
    color: var(--admin-body-text);
    text-align: left;
    cursor: pointer;
    transition: transform .08s ease, border-color .14s ease, box-shadow .14s ease, background .14s ease;
  }

  .admin-section-btn:hover {
    border-color: rgba(46, 117, 182, 0.26);
    box-shadow: 0 14px 28px rgba(31, 56, 100, 0.12);
  }

  .admin-section-btn.active {
    border-color: rgba(46, 117, 182, 0.32);
    background: linear-gradient(135deg, rgba(46, 117, 182, 0.14) 0%, rgba(255, 255, 255, 0.98) 100%);
  }

  :global([data-theme='dark']) .admin-section-btn.active {
    background: linear-gradient(135deg, rgba(46, 117, 182, 0.2) 0%, rgba(16, 29, 48, 0.98) 100%);
  }

  .admin-section-btn span {
    font-size: 18px;
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.03em;
    color: var(--admin-strong-text);
  }

  .admin-section-btn small {
    font-size: 12px;
    line-height: 1.4;
    color: var(--admin-muted-strong);
  }

  .admin-card {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px;
    border-radius: 28px;
    background: var(--admin-card-bg);
    border: 1px solid var(--admin-card-border);
    box-shadow: var(--admin-card-shadow);
  }

  .admin-empty {
    align-items: flex-start;
  }

  .admin-empty strong,
  .admin-alert strong {
    font-size: 18px;
    color: var(--text-primary);
  }

  .admin-empty p,
  .admin-alert p,
  .admin-active-project p,
  .admin-footnote {
    margin: 0;
    font-size: 14px;
    line-height: 1.55;
    color: var(--admin-body-text);
  }

  .admin-alert-error {
    border-color: rgba(192, 57, 43, 0.16);
    background: linear-gradient(180deg, rgba(255, 245, 245, 0.96), rgba(255, 255, 255, 0.98));
  }

  .admin-alert-ok {
    border-color: rgba(59, 122, 30, 0.16);
    background: linear-gradient(180deg, rgba(240, 250, 240, 0.98), rgba(255, 255, 255, 0.98));
  }

  :global([data-theme='dark']) .admin-alert-error {
    border-color: rgba(227, 99, 80, 0.26);
    background: linear-gradient(180deg, rgba(76, 24, 24, 0.72), rgba(16, 29, 48, 0.98));
  }

  :global([data-theme='dark']) .admin-alert-ok {
    border-color: rgba(81, 163, 101, 0.24);
    background: linear-gradient(180deg, rgba(22, 64, 39, 0.72), rgba(16, 29, 48, 0.98));
  }

  .admin-card-head,
  .admin-form-head,
  .admin-employee-head,
  .admin-active-project {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .admin-card-head > div:first-child,
  .admin-form-head {
    min-width: 0;
  }

  .admin-card-head span,
  .admin-form-head small {
    display: block;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--admin-muted-text);
  }

  .admin-card-head strong,
  .admin-form-head strong {
    display: block;
    margin-top: 4px;
    font-size: 24px;
    line-height: 1.05;
    letter-spacing: -0.04em;
    color: var(--admin-strong-text);
  }

  .admin-summary-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .admin-summary-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px 18px;
    border-radius: 20px;
    background: var(--admin-soft-bg);
    border: 1px solid var(--admin-card-border);
  }

  .admin-summary-item span {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--admin-muted-text);
  }

  .admin-summary-item strong {
    font-size: 28px;
    line-height: 1;
    letter-spacing: -0.04em;
    color: var(--admin-strong-text);
  }

  .admin-summary-item small {
    font-size: 12px;
    line-height: 1.45;
    color: var(--admin-body-text);
  }

  .admin-form,
  .admin-inline-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border-radius: 22px;
    background: var(--admin-soft-bg);
    border: 1px solid var(--admin-card-border);
  }

  .admin-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .admin-form-grid-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .admin-form-span-2 {
    grid-column: 1 / -1;
  }

  .admin-form label,
  .admin-select-wrap,
  .admin-search,
  .admin-inline-form label,
  .admin-member-role {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .admin-form label span,
  .admin-select-wrap span,
  .admin-search span,
  .admin-inline-form label span,
  .admin-member-role span {
    font-size: 12px;
    font-weight: 700;
    color: var(--admin-body-text);
  }

  .admin-form input,
  .admin-form select,
  .admin-select-wrap select,
  .admin-search input,
  .admin-inline-form input,
  .admin-member-role select {
    min-height: 46px;
    padding: 0 14px;
    border-radius: 16px;
    border: 1px solid var(--admin-input-border);
    background: var(--admin-input-bg);
    color: var(--admin-strong-text);
    font-size: 14px;
    font-family: inherit;
  }

  .admin-form input::placeholder,
  .admin-search input::placeholder,
  .admin-inline-form input::placeholder {
    color: var(--admin-muted-text);
    opacity: 0.9;
  }

  .admin-form input:focus,
  .admin-form select:focus,
  .admin-select-wrap select:focus,
  .admin-search input:focus,
  .admin-inline-form input:focus,
  .admin-member-role select:focus {
    outline: 2px solid var(--brand-primary);
    outline-offset: 1px;
  }

  .admin-select-wrap {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .admin-primary-btn,
  .admin-ghost-btn,
  .admin-danger-btn {
    min-height: 46px;
    border-radius: 16px;
    font-size: 13px;
    font-weight: 800;
    font-family: inherit;
    cursor: pointer;
    transition: transform .08s ease, box-shadow .12s ease, filter .12s ease;
  }

  .admin-primary-btn:hover,
  .admin-ghost-btn:hover,
  .admin-danger-btn:hover {
    box-shadow: 0 12px 24px rgba(31, 56, 100, 0.12);
  }

  .admin-primary-btn:active,
  .admin-ghost-btn:active,
  .admin-danger-btn:active {
    transform: translateY(1px);
  }

  .admin-primary-btn:disabled,
  .admin-ghost-btn:disabled,
  .admin-danger-btn:disabled {
    opacity: 0.62;
    cursor: not-allowed;
    box-shadow: none;
  }

  .admin-primary-btn {
    border: none;
    padding: 0 16px;
    background: linear-gradient(135deg, #12345d 0%, #2e75b6 100%);
    color: #fff;
  }

  .admin-ghost-btn {
    border: 1px solid var(--admin-ghost-border);
    padding: 0 14px;
    background: var(--admin-ghost-bg);
    color: var(--admin-strong-text);
  }

  .admin-danger-btn {
    border: 1px solid var(--admin-danger-border);
    padding: 0 14px;
    background: var(--admin-danger-bg);
    color: #8b1a1a;
  }

  :global([data-theme='dark']) .admin-danger-btn {
    color: #ffc4bc;
  }

  .admin-chip-stack,
  .admin-inline-actions,
  .admin-inline-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .admin-chip {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    background: var(--admin-chip-bg);
    color: var(--admin-chip-text);
    font-size: 11px;
    font-weight: 800;
  }

  .admin-chip-muted {
    background: var(--admin-subtle-bg);
    color: var(--admin-muted-strong);
  }

  .admin-chip-accent {
    background: linear-gradient(135deg, rgba(18, 52, 93, 0.98) 0%, rgba(46, 117, 182, 0.98) 100%);
    color: #fff;
  }

  .admin-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .admin-list-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 20px;
    background: var(--admin-soft-bg);
    border: 1px solid var(--admin-card-border);
  }

  .admin-list-card-stack {
    align-items: stretch;
    flex-direction: column;
  }

  .admin-list-card[data-active='1'] {
    border-color: rgba(46, 117, 182, 0.28);
    background: var(--admin-list-active);
  }

  .admin-list-card strong {
    display: block;
    font-size: 16px;
    color: var(--admin-strong-text);
  }

  .admin-list-card span {
    display: block;
    margin-top: 4px;
    font-size: 13px;
    line-height: 1.45;
    color: var(--admin-body-text);
  }

  .admin-empty-inline {
    padding: 14px 16px;
    border-radius: 18px;
    background: var(--admin-soft-bg);
    border: 1px solid var(--admin-card-border);
    color: var(--admin-body-text);
    font-size: 14px;
  }

  .admin-search {
    margin-top: 4px;
  }

  .admin-toggle {
    flex-direction: row !important;
    align-items: center;
    gap: 10px !important;
  }

  .admin-toggle input {
    width: 18px;
    height: 18px;
    min-height: 18px;
    padding: 0;
  }

  .admin-footnote {
    padding: 14px 16px;
    border-radius: 18px;
    background: var(--admin-soft-bg);
    border: 1px solid var(--admin-card-border);
  }

  .admin-footnote-info {
    border-color: rgba(46, 117, 182, 0.22);
  }

  .admin-footnote-locked {
    border-color: rgba(245, 158, 11, 0.3);
    background: linear-gradient(180deg, rgba(255, 247, 230, 0.96), rgba(255, 255, 255, 0.98));
  }

  :global([data-theme='dark']) .admin-footnote-locked {
    background: linear-gradient(180deg, rgba(74, 49, 12, 0.42), rgba(16, 29, 48, 0.98));
  }

  .admin-inline-meta span {
    color: var(--admin-muted-strong);
  }

  @media (max-width: 1100px) {
    .admin-grid-context,
    .admin-grid-projects,
    .admin-grid-employees,
    .admin-summary-grid,
    .admin-section-nav,
    .admin-context-actions {
      grid-template-columns: 1fr;
    }

    .admin-context-strip {
      flex-direction: column;
      align-items: stretch;
    }
  }

  @media (max-width: 820px) {
    .admin-shell {
      padding: 14px;
      gap: 14px;
    }

    .admin-hero,
    .admin-card {
      border-radius: 24px;
    }

    .admin-hero {
      padding: 18px;
    }

    .admin-card {
      padding: 16px;
    }

    .admin-section-btn {
      min-height: 68px;
      border-radius: 18px;
    }

    .admin-card-head strong,
    .admin-form-head strong,
    .admin-context-copy strong {
      font-size: 20px;
    }

    .admin-form-grid,
    .admin-form-grid-3,
    .admin-summary-grid {
      grid-template-columns: 1fr;
    }

    .admin-list-card,
    .admin-card-head,
    .admin-form-head,
    .admin-active-project,
    .admin-employee-head {
      flex-direction: column;
      align-items: stretch;
    }
  }

  @media (max-width: 520px) {
    .admin-pane {
      border-left: none;
      border-right: none;
    }

    .admin-shell {
      padding: 0 0 calc(14px + env(safe-area-inset-bottom));
      gap: 12px;
    }

    .admin-hero {
      border-radius: 0 0 28px 28px;
      padding: 18px 16px 20px;
    }

    .admin-card {
      margin: 0 12px;
      padding: 16px 14px;
      border-radius: 22px;
    }

    .admin-context-strip,
    .admin-section-nav {
      margin: 0 12px;
    }

    .admin-hero-copy strong {
      font-size: 32px;
    }

    .admin-kpi {
      flex-basis: min(78vw, 220px);
    }
  }
</style>
