import '@/components/ThemeToggle.js';
import '@/components/LanguagesDropdown.js';
import '@/components/TopBar.js';
import '@/components/UserLogin.js';
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

  function transitionTo(newMode: string) {
    mode = newMode;
    showSpinner();
    setTimeout(renderAuthComponent, 400);
  }

  function renderAuthComponent() {
    content.innerHTML = '';
    let el: HTMLElement;

    switch (mode) {
      case 'login':
        el = document.createElement('user-login');
        el.addEventListener('switch-to-signup', () => transitionTo('signup'));
        break;
      case 'signup':
        el = document.createElement('user-signup');
        el.addEventListener('switch-to-login', () => transitionTo('login'));
        el.addEventListener('signup-success', () => transitionTo('login'));
        break;
    }

    content.appendChild(el);
  }

  renderAuthComponent();
}

/*
this.addEventListener('switch-to-login', (e: CustomEvent) => {
  if (e.detail?.email) this.emailInput.value = e.detail.email;
  if (e.detail?.password) this.passwordInput.value = e.detail.password;
});
*/