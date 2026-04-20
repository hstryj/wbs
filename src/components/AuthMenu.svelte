<script lang="ts">
  import { auth, signIn, signUp, signOut, sendMagicLink } from '../lib/state/auth';

  let open = false;
  let mode: 'signin' | 'signup' | 'magic' = 'signin';
  let email = '';
  let password = '';
  let error: string | null = null;
  let info: string | null = null;
  let busy = false;

  $: if (!open) { error = null; info = null; }

  function reset() {
    email = '';
    password = '';
    error = null;
    info = null;
  }

  async function doSignIn() {
    if (!email.trim() || !password) { error = 'Podaj email i hasło'; return; }
    busy = true; error = null;
    const res = await signIn(email.trim(), password);
    busy = false;
    if (res.error) { error = res.error; return; }
    open = false;
    reset();
  }

  async function doSignUp() {
    if (!email.trim() || !password) { error = 'Podaj email i hasło'; return; }
    if (password.length < 6) { error = 'Hasło musi mieć min. 6 znaków'; return; }
    busy = true; error = null;
    const res = await signUp(email.trim(), password);
    busy = false;
    if (res.error) { error = res.error; return; }
    if (res.needsConfirmation) {
      info = 'Sprawdź maila — wysłaliśmy link potwierdzający rejestrację.';
      password = '';
    } else {
      open = false;
      reset();
    }
  }

  async function doMagic() {
    if (!email.trim()) { error = 'Podaj email'; return; }
    busy = true; error = null;
    const res = await sendMagicLink(email.trim());
    busy = false;
    if (res.error) { error = res.error; return; }
    info = 'Link logowania wysłany na ' + email.trim();
  }

  async function doSignOut() {
    await signOut();
    open = false;
  }

  function closeModal() {
    open = false;
  }

  function onWindowKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') open = false;
  }

  function onOverlayKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    }
  }

  function avatar(email: string): string {
    return email.charAt(0).toUpperCase();
  }
</script>

<svelte:window on:keydown={onWindowKeydown} />

{#if !$auth.configured}
  <!-- Supabase not configured — show muted badge z wyjaśnieniem -->
  <span class="auth-badge auth-local" title="Dane trzymane tylko lokalnie w przeglądarce (localStorage). Skonfiguruj .env.local aby włączyć cloud sync.">
    Lokalnie
  </span>
{:else if $auth.loading}
  <span class="auth-badge auth-loading">…</span>
{:else if $auth.user}
  <button class="auth-btn auth-user" on:click={() => (open = !open)} title="Konto" aria-haspopup="true" aria-expanded={open}>
    <span class="auth-avatar">{avatar($auth.user.email || '?')}</span>
    <span class="auth-email">{$auth.user.email}</span>
  </button>

  {#if open}
    <div class="auth-pop" role="menu">
      <div class="auth-pop-info">
        Zalogowany jako<br><strong>{$auth.user.email}</strong>
      </div>
      <button class="auth-pop-item" on:click={doSignOut} role="menuitem">Wyloguj</button>
    </div>
  {/if}
{:else}
  <button class="auth-btn auth-login" on:click={() => (open = true)}>Zaloguj</button>

  {#if open}
    <div
      class="auth-modal-bg"
      on:click|self={closeModal}
      on:keydown|self={onOverlayKeydown}
      role="button"
      tabindex="0"
      aria-label="Zamknij okno logowania"
    >
      <div class="auth-modal" role="dialog" aria-modal="true" aria-label="Logowanie do projektu">
        <header class="auth-modal-hdr">
          <h3>
            {#if mode === 'signin'}Zaloguj się{:else if mode === 'signup'}Utwórz konto{:else}Link logowania{/if}
          </h3>
          <button class="auth-close" on:click={closeModal} aria-label="Zamknij">✕</button>
        </header>

        <div class="auth-modal-body">
          <div class="auth-tabs" role="tablist">
            <button class:active={mode === 'signin'} on:click={() => (mode = 'signin')} role="tab">Logowanie</button>
            <button class:active={mode === 'signup'} on:click={() => (mode = 'signup')} role="tab">Rejestracja</button>
            <button class:active={mode === 'magic'} on:click={() => (mode = 'magic')} role="tab">Magic link</button>
          </div>

          <label class="auth-field">
            Email
            <input type="email" bind:value={email} placeholder="jan@firma.pl" autocomplete="email" />
          </label>

          {#if mode !== 'magic'}
            <label class="auth-field">
              Hasło
              <input type="password" bind:value={password} placeholder="min. 6 znaków" autocomplete={mode === 'signin' ? 'current-password' : 'new-password'} />
            </label>
          {/if}

          {#if error}
            <div class="auth-alert auth-alert-err">{error}</div>
          {/if}
          {#if info}
            <div class="auth-alert auth-alert-ok">{info}</div>
          {/if}

          <button
            class="btn btn-blue auth-submit"
            on:click={mode === 'signin' ? doSignIn : mode === 'signup' ? doSignUp : doMagic}
            disabled={busy}
          >
            {#if busy}…{:else if mode === 'signin'}Zaloguj{:else if mode === 'signup'}Utwórz konto{:else}Wyślij link{/if}
          </button>

          <p class="auth-note">
            {#if mode === 'signin'}
              Nie masz konta? <button class="auth-link" on:click={() => (mode = 'signup')}>Zarejestruj się</button>
            {:else if mode === 'signup'}
              Masz już konto? <button class="auth-link" on:click={() => (mode = 'signin')}>Zaloguj</button>
            {:else}
              Otrzymasz jednorazowy link. Kliknij, aby się zalogować bez hasła.
            {/if}
          </p>
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .auth-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    letter-spacing: .04em;
    text-transform: uppercase;
  }
  .auth-local {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.15);
    cursor: help;
  }
  .auth-loading {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.5);
  }

  .auth-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #fff;
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 500;
    border-radius: var(--radius-sm);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: inherit;
    transition: background .12s, border-color .12s;
  }
  .auth-btn:hover { background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.35); }

  .auth-avatar {
    width: 22px; height: 22px;
    border-radius: 50%;
    background: var(--brand-primary);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .auth-email {
    font-size: 12px;
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .auth-pop {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    padding: 4px;
    min-width: 220px;
    z-index: 1000;
    color: var(--text-primary);
  }
  .auth-pop-info {
    padding: 10px 12px;
    font-size: 11px;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border-subtle);
  }
  .auth-pop-info strong { color: var(--text-primary); }
  .auth-pop-item {
    display: block;
    width: 100%;
    text-align: left;
    background: transparent;
    border: none;
    padding: 8px 12px;
    font-size: 12px;
    color: var(--text-primary);
    font-family: inherit;
    cursor: pointer;
    border-radius: var(--radius-sm);
  }
  .auth-pop-item:hover { background: var(--bg-muted); }

  /* Modal */
  .auth-modal-bg {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(2px);
  }
  .auth-modal {
    background: var(--bg-surface);
    border-radius: var(--radius-md);
    width: min(400px, 92vw);
    color: var(--text-primary);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
  }
  .auth-modal-hdr {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 18px;
    background: var(--bg-muted);
    border-bottom: 1px solid var(--border);
  }
  .auth-modal-hdr h3 { font-size: 14px; font-weight: 700; margin: 0; }
  .auth-close {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 16px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: var(--radius-sm);
  }
  .auth-close:hover { color: var(--text-primary); background: var(--bg-subtle); }

  .auth-modal-body { padding: 18px; display: flex; flex-direction: column; gap: 12px; }

  .auth-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); margin-bottom: 4px; }
  .auth-tabs button {
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    font-family: inherit;
  }
  .auth-tabs button.active { color: var(--brand-primary-dark); border-bottom-color: var(--brand-primary); font-weight: 600; }

  .auth-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
  }
  .auth-field input {
    padding: 8px 10px;
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-family: inherit;
    color: var(--text-primary);
    background: var(--bg-surface);
  }
  .auth-field input:focus {
    outline: none;
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 2px var(--brand-primary-bg);
  }

  .auth-alert {
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    font-size: 12px;
    font-weight: 500;
  }
  .auth-alert-err { background: var(--color-danger-bg); color: var(--color-danger); border: 1px solid var(--color-danger); }
  .auth-alert-ok { background: var(--color-success-bg); color: var(--color-success); border: 1px solid var(--color-success); }

  .auth-submit { justify-content: center; padding: 9px 14px; font-size: 13px; width: 100%; }

  .auth-note {
    font-size: 11px;
    color: var(--text-muted);
    text-align: center;
    margin: 0;
  }
  .auth-link {
    background: transparent;
    border: none;
    color: var(--brand-primary);
    cursor: pointer;
    font-family: inherit;
    font-size: 11px;
    font-weight: 600;
    padding: 0;
  }
  .auth-link:hover { text-decoration: underline; }
</style>
