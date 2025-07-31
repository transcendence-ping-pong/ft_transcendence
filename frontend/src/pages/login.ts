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
      <generic-modal dismissible="false">
        <div slot="body" class="p-4" id="auth-modal-content"></div>
      </generic-modal>
    </div>
  `;

  let mode = 'login'; // or 'signup'
  const content = container.querySelector('#auth-modal-content');

  function renderAuthComponent() {
    content.innerHTML = '';
    let el;
    if (mode === 'login') {
      el = document.createElement('user-login');
      el.addEventListener('switch-to-signup', () => {
        mode = 'signup';
        renderAuthComponent();
      });
    } else {
      el = document.createElement('user-signup');
      el.addEventListener('switch-to-login', () => {
        mode = 'login';
        renderAuthComponent();
      });
    }
    content.appendChild(el);
  }

  renderAuthComponent();
}