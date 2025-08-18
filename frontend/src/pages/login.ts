import '@/components/navigation/Logo.js';
import '@/components/navigation/ThemeToggle.js';
import '@/components/navigation/LanguagesDropdown.js';
import '@/components/navigation/TopBar.js';
import '@/components/authentication/UserSignin.js';
import '@/components/authentication/UserSignup.js';
import '@/components/authentication/UserToken.js';
import '@/components/_templates/GenericModal.js';

export function renderLogin(containerId: string) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="relative w-screen h-screen">
      <img 
        src="/public/login.png" 
        alt="Login Background"
        class="absolute top-0 left-0 w-full h-full z-20 pointer-events-none"
      />

      <top-bar>
        <pong-logo slot="logo" login></pong-logo>
        <theme-toggle slot="toggle"></theme-toggle>
        <languages-dropdown slot="language"></languages-dropdown>
      </top-bar>

      <generic-modal dismissible="false" appear-delay="1000">
        <div slot="body" class="p-4" id="auth-modal-content"></div>
      </generic-modal>
    </div>
  `;

  let mode = 'login';
  const content = container.querySelector('#auth-modal-content');

  function showSpinner() {
    content.innerHTML = `
      <div class="flex justify-center items-center h-48">
        <div class="w-12 h-12 border-8 border-[var(--loading)] border-t-[var(--accent-tertiary)] rounded-full animate-spin"></div>
      </div>
    `;
  }

  let loginPrefill: { email?: string; password?: string } = {};

  function transitionTo(newMode: string, detail?: { email: string, password: string }) {
    mode = newMode;
    if (detail) loginPrefill = detail;
    showSpinner();
    setTimeout(renderAuthComponent, 400);
  }

  interface UserLoginElement extends HTMLElement {
    emailInput: HTMLInputElement;
    passwordInput: HTMLInputElement;
  }

  function setLoginPrefill(el: UserLoginElement, prefillData: { email?: string; password?: string }) {
    // after signup, prefill fields if details (aka email and password) are present...
    // or after login credentials are provided and token is required
    // ATTENTION: manipulate the DOM after the <user-signin> component is rendered
    setTimeout(() => {
      const loginEl = el;
      if (prefillData.email) loginEl.emailInput.value = prefillData.email;
      if (prefillData.password) loginEl.passwordInput.value = prefillData.password;
      prefillData = {}; // clear prefill data after use
    }, 0);
  }

  function renderAuthComponent() {
    content.innerHTML = '';
    let el: HTMLElement;

    switch (mode) {
      case 'login':
        el = document.createElement('user-signin2');
        el.addEventListener('switch-to-signup', () => transitionTo('signup'));
        el.addEventListener('switch-to-token', (e: CustomEvent) => transitionTo('token', e.detail));

        setLoginPrefill(el as unknown as UserLoginElement, loginPrefill);
        break;
      case 'signup':
        el = document.createElement('user-signup2');
        el.addEventListener('switch-to-login', (e: CustomEvent) => transitionTo('login', e.detail));
        break;
      case 'token':
        el = document.createElement('user-token2');
        setLoginPrefill(el as unknown as UserLoginElement, loginPrefill);
        break;
    }

    content.appendChild(el);
  }

  renderAuthComponent();
}
