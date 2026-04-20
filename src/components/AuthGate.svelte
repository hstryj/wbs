<script lang="ts">
  import { auth, signIn, signUp, sendMagicLink } from '../lib/state/auth';

  let mode: 'signin' | 'signup' | 'magic' = 'signin';
  let email = '';
  let password = '';
  let error: string | null = null;
  let info: string | null = null;
  let busy = false;

  $: if (!$auth.configured) {
    error = null;
    info = null;
  }

  function resetFeedback() {
    error = null;
    info = null;
  }

  async function submit() {
    resetFeedback();

    if (!email.trim()) {
      error = 'Podaj adres email.';
      return;
    }

    if (mode !== 'magic' && !password) {
      error = 'Podaj hasło.';
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      error = 'Hasło musi mieć minimum 6 znaków.';
      return;
    }

    busy = true;

    if (mode === 'signin') {
      const res = await signIn(email.trim(), password);
      busy = false;
      if (res.error) {
        error = res.error;
        return;
      }
      password = '';
      return;
    }

    if (mode === 'signup') {
      const res = await signUp(email.trim(), password);
      busy = false;
      if (res.error) {
        error = res.error;
        return;
      }
      if (res.needsConfirmation) {
        info = 'Sprawdź skrzynkę mailową i potwierdź rejestrację.';
        password = '';
        return;
      }
      password = '';
      return;
    }

    const res = await sendMagicLink(email.trim());
    busy = false;
    if (res.error) {
      error = res.error;
      return;
    }
    info = 'Wysłaliśmy jednorazowy link logowania na podany adres.';
  }
</script>

<section class="auth-gate">
  <div class="auth-gate-shell">
    <div class="auth-gate-hero">
      <span class="auth-gate-eyebrow">Cloud Workspace</span>
      <h1>Zaloguj się, aby wejść do projektu</h1>
      <p>Po zalogowaniu od razu wracasz do swojego projektu, a zmiany synchronizują się między urządzeniami.</p>

      <div class="auth-gate-rail">
        <div class="auth-gate-tile">
          <strong>Supabase sync</strong>
          <span>WBS, ryzyka, ludzie i materiały zapisują się w chmurze.</span>
        </div>
        <div class="auth-gate-tile">
          <strong>Mobilna praca</strong>
          <span>Ten sam projekt otworzysz na telefonie i desktopie bez ręcznego eksportu.</span>
        </div>
        <div class="auth-gate-tile">
          <strong>Gotowość do publikacji</strong>
          <span>To jest właściwa warstwa wejścia przed wersją sklepową.</span>
        </div>
      </div>
    </div>

    <div class="auth-gate-card">
      <div class="auth-gate-card-head">
        <span>Wejście do aplikacji</span>
        <strong>{mode === 'signin' ? 'Logowanie' : mode === 'signup' ? 'Nowe konto' : 'Magic link'}</strong>
      </div>

      <div class="auth-gate-tabs" role="tablist" aria-label="Tryb logowania">
        <button type="button" class:active={mode === 'signin'} on:click={() => { mode = 'signin'; resetFeedback(); }}>Logowanie</button>
        <button type="button" class:active={mode === 'signup'} on:click={() => { mode = 'signup'; resetFeedback(); }}>Rejestracja</button>
        <button type="button" class:active={mode === 'magic'} on:click={() => { mode = 'magic'; resetFeedback(); }}>Magic link</button>
      </div>

      <form class="auth-gate-form" on:submit|preventDefault={submit}>
        <label class="auth-gate-field">
          <span>Email</span>
          <input type="email" bind:value={email} placeholder="jan@firma.pl" autocomplete="email" />
        </label>

        {#if mode !== 'magic'}
          <label class="auth-gate-field">
            <span>Hasło</span>
            <input type="password" bind:value={password} placeholder="minimum 6 znaków" autocomplete={mode === 'signin' ? 'current-password' : 'new-password'} />
          </label>
        {/if}

        {#if error}
          <div class="auth-gate-alert auth-gate-alert-err">{error}</div>
        {/if}

        {#if info}
          <div class="auth-gate-alert auth-gate-alert-ok">{info}</div>
        {/if}

        <button type="submit" class="auth-gate-submit" disabled={busy}>
          {#if busy}
            Trwa logowanie…
          {:else if mode === 'signin'}
            Zaloguj się
          {:else if mode === 'signup'}
            Utwórz konto
          {:else}
            Wyślij link logowania
          {/if}
        </button>
      </form>

      <p class="auth-gate-note">
        {#if mode === 'signin'}
          Nie masz jeszcze konta? Przejdź do rejestracji.
        {:else if mode === 'signup'}
          Konto tworzymy tylko raz, potem logowanie wraca już prosto do projektu.
        {:else}
          Magic link otworzy Ci aplikację bez wpisywania hasła.
        {/if}
      </p>
    </div>
  </div>
</section>

<style>
  .auth-gate {
    --auth-page-bg:
      radial-gradient(circle at top left, rgba(46, 117, 182, 0.22), transparent 32%),
      radial-gradient(circle at bottom right, rgba(18, 52, 93, 0.18), transparent 28%),
      linear-gradient(180deg, #f3f8fc 0%, #e8f0f8 100%);
    --auth-card-bg: rgba(255, 255, 255, 0.98);
    --auth-card-border: rgba(20, 53, 95, 0.1);
    --auth-card-shadow: 0 22px 42px rgba(15, 23, 42, 0.1);
    --auth-heading: #172b4d;
    --auth-label: #6b778c;
    --auth-input-bg: #ffffff;
    --auth-input-border: #c7d1db;
    --auth-input-border-hover: #b3bfcd;
    --auth-input-text: #172b4d;
    --auth-input-placeholder: #7a869a;
    --auth-tab-bg: #f4f5f7;
    --auth-tab-border: #dfe1e6;
    --auth-tab-text: #5e6c84;
    --auth-tab-active-bg: #e9f2ff;
    --auth-tab-active-border: #b3d4ff;
    --auth-tab-active-text: #0c66e4;
    --auth-note: #6b778c;
    --auth-submit-bg: linear-gradient(135deg, #0c66e4 0%, #1d7af1 100%);
    --auth-submit-bg-hover: linear-gradient(135deg, #0a5ed1 0%, #136ee0 100%);
    min-height: 100vh;
    min-height: 100svh;
    padding:
      max(24px, env(safe-area-inset-top))
      max(24px, env(safe-area-inset-right))
      max(24px, env(safe-area-inset-bottom))
      max(24px, env(safe-area-inset-left));
    background: var(--auth-page-bg);
    display: flex;
    align-items: stretch;
    justify-content: center;
    overflow: auto;
  }

  :global([data-theme='dark']) .auth-gate {
    --auth-page-bg:
      radial-gradient(circle at top left, rgba(76, 154, 255, 0.18), transparent 34%),
      radial-gradient(circle at bottom right, rgba(17, 43, 77, 0.2), transparent 28%),
      linear-gradient(180deg, #0d1626 0%, #122033 100%);
    --auth-card-bg: rgba(255, 255, 255, 0.97);
    --auth-card-border: rgba(123, 156, 192, 0.18);
    --auth-card-shadow: 0 24px 48px rgba(0, 0, 0, 0.24);
  }

  .auth-gate-shell {
    width: min(1080px, 100%);
    display: grid;
    grid-template-columns: 1.2fr minmax(320px, 420px);
    gap: 20px;
    align-items: stretch;
    margin: auto 0;
    min-width: 0;
  }

  .auth-gate-hero,
  .auth-gate-card {
    border-radius: 32px;
    border: 1px solid var(--auth-card-border);
    box-shadow: var(--auth-card-shadow);
  }

  .auth-gate-hero {
    padding: 34px;
    background: linear-gradient(145deg, #12345d 0%, #255488 100%);
    color: #fff;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .auth-gate-eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.72);
  }

  .auth-gate-hero h1 {
    margin: 0;
    font-size: clamp(32px, 4vw, 52px);
    line-height: 0.96;
    letter-spacing: -0.05em;
  }

  .auth-gate-hero p {
    margin: 0;
    max-width: 560px;
    font-size: 15px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.8);
  }

  .auth-gate-rail {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding-bottom: 2px;
    -webkit-overflow-scrolling: touch;
  }

  .auth-gate-tile {
    flex: 0 0 min(230px, 70vw);
    min-width: 210px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 18px;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.14);
    border: 1px solid rgba(255, 255, 255, 0.16);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  .auth-gate-tile strong {
    font-size: 15px;
  }

  .auth-gate-tile span {
    font-size: 13px;
    line-height: 1.45;
    color: rgba(255, 255, 255, 0.76);
  }

  .auth-gate-card {
    background: var(--auth-card-bg);
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    color: var(--auth-input-text);
    min-width: 0;
    overflow: hidden;
  }

  .auth-gate-card-head {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .auth-gate-card-head span {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--auth-label);
  }

  .auth-gate-card-head strong {
    font-size: 28px;
    line-height: 1;
    letter-spacing: -0.04em;
    color: var(--auth-heading);
  }

  .auth-gate-tabs {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .auth-gate-tabs button {
    min-height: 44px;
    border-radius: 14px;
    border: 1px solid var(--auth-tab-border);
    background: var(--auth-tab-bg);
    color: var(--auth-tab-text);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: border-color .14s ease, background .14s ease, color .14s ease, box-shadow .14s ease;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
  }

  .auth-gate-tabs button:hover {
    border-color: #c1d7f7;
    color: var(--auth-heading);
  }

  .auth-gate-tabs button.active {
    border-color: var(--auth-tab-active-border);
    background: var(--auth-tab-active-bg);
    color: var(--auth-tab-active-text);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.85),
      0 1px 2px rgba(9, 30, 66, 0.08);
  }

  .auth-gate-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .auth-gate-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .auth-gate-field span {
    font-size: 12px;
    font-weight: 700;
    color: var(--auth-label);
  }

  .auth-gate-field input {
    min-height: 48px;
    border-radius: 16px;
    border: 1px solid var(--auth-input-border);
    background: var(--auth-input-bg);
    color: var(--auth-input-text);
    padding: 0 14px;
    font-size: 15px;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.9),
      0 1px 1px rgba(9, 30, 66, 0.04);
    transition: border-color .14s ease, box-shadow .14s ease, background .14s ease;
  }

  .auth-gate-field input::placeholder {
    color: var(--auth-input-placeholder);
    opacity: 1;
  }

  .auth-gate-field input:hover {
    border-color: var(--auth-input-border-hover);
  }

  .auth-gate-field input:focus {
    outline: none;
    border-color: #0c66e4;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.92),
      0 0 0 3px rgba(12, 102, 228, 0.18);
  }

  .auth-gate-alert {
    padding: 12px 14px;
    border-radius: 14px;
    font-size: 13px;
    line-height: 1.45;
  }

  .auth-gate-alert-err {
    background: var(--color-danger-bg);
    color: var(--color-danger);
    border: 1px solid rgba(192, 57, 43, 0.16);
  }

  .auth-gate-alert-ok {
    background: var(--color-success-bg);
    color: var(--color-success);
    border: 1px solid rgba(59, 122, 30, 0.16);
  }

  .auth-gate-submit {
    min-height: 48px;
    border: none;
    border-radius: 18px;
    background: var(--auth-submit-bg);
    color: #fff;
    font-size: 14px;
    font-weight: 800;
    cursor: pointer;
    transition: filter .14s ease, transform .08s ease, box-shadow .14s ease;
    box-shadow: 0 10px 20px rgba(12, 102, 228, 0.18);
  }

  .auth-gate-submit:hover:not(:disabled) {
    background: var(--auth-submit-bg-hover);
    box-shadow: 0 14px 24px rgba(12, 102, 228, 0.22);
  }

  .auth-gate-submit:disabled {
    opacity: 0.68;
    cursor: wait;
  }

  .auth-gate-submit:active:not(:disabled) {
    transform: translateY(1px);
  }

  .auth-gate-note {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--auth-note);
  }

  @media (max-width: 900px) {
    .auth-gate {
      padding:
        max(14px, env(safe-area-inset-top))
        max(14px, env(safe-area-inset-right))
        max(14px, env(safe-area-inset-bottom))
        max(14px, env(safe-area-inset-left));
    }

    .auth-gate-shell {
      grid-template-columns: 1fr;
      gap: 14px;
    }

    .auth-gate-hero,
    .auth-gate-card {
      border-radius: 28px;
    }

    .auth-gate-hero {
      padding: 24px 20px;
    }

    .auth-gate-card {
      padding: 20px 16px calc(20px + env(safe-area-inset-bottom));
    }
  }

  @media (max-width: 640px) {
    .auth-gate {
      padding:
        max(10px, env(safe-area-inset-top))
        max(10px, env(safe-area-inset-right))
        max(12px, env(safe-area-inset-bottom))
        max(10px, env(safe-area-inset-left));
      background:
        radial-gradient(circle at top center, rgba(46, 117, 182, 0.16), transparent 36%),
        linear-gradient(180deg, #eef4fa 0%, #e7eef6 100%);
    }

    .auth-gate-shell {
      gap: 12px;
      min-height: 100svh;
      overflow-x: clip;
    }

    .auth-gate-card {
      order: -1;
      position: relative;
      z-index: 2;
      margin-top: -18px;
      padding: 18px 14px calc(18px + env(safe-area-inset-bottom));
      border-radius: 24px;
      box-shadow: 0 18px 34px rgba(15, 23, 42, 0.1);
    }

    .auth-gate-hero {
      padding: 20px 16px 32px;
      border-radius: 24px;
    }

    .auth-gate-hero h1 {
      font-size: clamp(30px, 11vw, 38px);
      line-height: 0.98;
    }

    .auth-gate-tabs {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      overflow: visible;
      padding-bottom: 0;
    }

    .auth-gate-tabs button {
      min-width: 0;
      width: 100%;
      padding: 0 10px;
      line-height: 1.2;
    }

    .auth-gate-tabs button:last-child {
      grid-column: 1 / -1;
    }

    .auth-gate-rail {
      display: grid;
      grid-template-columns: 1fr;
      overflow: visible;
      gap: 10px;
    }

    .auth-gate-tile {
      flex-basis: auto;
      min-width: 0;
    }

    .auth-gate-card-head strong {
      font-size: 24px;
    }
  }

  @media (max-width: 420px) {
    .auth-gate {
      padding:
        max(8px, env(safe-area-inset-top))
        max(8px, env(safe-area-inset-right))
        max(10px, env(safe-area-inset-bottom))
        max(8px, env(safe-area-inset-left));
    }

    .auth-gate-shell {
      gap: 10px;
    }

    .auth-gate-hero {
      padding: 18px 14px 30px;
      gap: 14px;
    }

    .auth-gate-card {
      margin-top: -16px;
      padding: 16px 12px calc(16px + env(safe-area-inset-bottom));
    }

    .auth-gate-card-head {
      gap: 6px;
    }

    .auth-gate-card-head strong {
      font-size: 22px;
      line-height: 1.05;
    }

    .auth-gate-tabs {
      grid-template-columns: 1fr;
    }

    .auth-gate-tabs button:last-child {
      grid-column: auto;
    }

    .auth-gate-tabs button,
    .auth-gate-submit {
      min-height: 46px;
    }

    .auth-gate-hero p,
    .auth-gate-tile span,
    .auth-gate-note {
      font-size: 13px;
    }

    .auth-gate-field input {
      font-size: 16px;
    }
  }
</style>
