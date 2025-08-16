import * as authService from '@/services/authService.js';
import '@/components/ThemeToggle.js';
import '@/components/LanguagesDropdown.js';
import '@/components/TopBar.js';
import '@/components/UserSignin.js';
import '@/components/UserSignup.js';
import '@/components/GenericModal.js';

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
        <img slot="logo" src="https://api.dicebear.com/7.x/pixel-art/svg?seed=octopus" alt="Logo" />
        <span slot="title">FOUR PING TWO PONG</span>
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

  function renderAuthComponent() {
    content.innerHTML = '';
    let el: HTMLElement;

    switch (mode) {
      case 'login':
        el = document.createElement('user-signin');
        el.addEventListener('switch-to-signup', () => transitionTo('signup'));

        // prefill fields if details (aka email and password) are present
        setTimeout(() => {
          const loginEl = el as unknown as UserLoginElement;
          if (loginPrefill.email) loginEl.emailInput.value = loginPrefill.email;
          if (loginPrefill.password) loginEl.passwordInput.value = loginPrefill.password;
          loginPrefill = {};
        }, 0);
        break;
      case 'signup':
        el = document.createElement('user-signup');
        el.addEventListener('switch-to-login', (e: CustomEvent) => transitionTo('login', e.detail));
        break;
      case 'token':
    }

    content.appendChild(el);
  }

  renderAuthComponent();
}
