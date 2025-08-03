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
      <generic-modal dismissible="false" appear-delay="1000">
        <div slot="body" class="p-4" id="auth-modal-content"></div>
      </generic-modal>
    </div>
  `;

  let mode = 'login'; // or 'signup'
  const content = container.querySelector('#auth-modal-content');

  function showSpinner() {
    content.innerHTML = `
      <div class="flex justify-center items-center h-48">
        <div class="w-12 h-12 border-8 border-[var(--loading)] border-t-[var(--accent-tertiary)] rounded-full animate-spin"></div>
      </div>
    `;
  }

  function renderAuthComponent() {
    content.innerHTML = '';
    let el;
    if (mode === 'login') {
      el = document.createElement('user-login');
      el.addEventListener('switch-to-signup', () => {
        mode = 'signup';
        showSpinner();
        setTimeout(renderAuthComponent, 800);
      });
      el.addEventListener('login-success', () => {
        showSpinner();
        setTimeout(() => {
          window.location.href = '/';
        }, 1200);
      });
    } else {
      el = document.createElement('user-signup');
      el.addEventListener('switch-to-login', () => {
        mode = 'login';
        showSpinner();
        setTimeout(renderAuthComponent, 800);
      });
      el.addEventListener('signup-success', () => {
        mode = 'login';
        showSpinner();
        setTimeout(renderAuthComponent, 800);
      });
    }
    content.appendChild(el);
  }

  renderAuthComponent();
}
