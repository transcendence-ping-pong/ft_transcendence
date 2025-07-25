import '@/components/ThemeToggle.js'; // This registers <toggle-switch>
import '@/components/GenericModal.js';
import '@/components/UserLogin.js';

export function renderLogin(containerId: string) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
       <div class="relative w-screen h-screen">
        <img 
          src="/public/login.png" 
          alt="Login Background"
          class="absolute top-0 left-0 w-full h-full z-20 pointer-events-none"
        />
        <generic-modal dismissible="false">
          <div slot="header" class="text-center text-2xl font-bold">Login</div>
          <div slot="body" class="p-4">
            <user-login></user-login>
          </div>
        </generic-modal>
      </div>
    `;
  }
}