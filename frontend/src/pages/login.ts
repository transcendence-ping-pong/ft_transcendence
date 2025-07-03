import '@/components/ThemeToggle.js'; // This registers <toggle-switch>
import '@/components/DynamicDropdown.js';
import '@/components/UserLogin.js';

export function renderLogin(containerId: string) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="flex flex-col justify-center items-center gap-4">
        <theme-toggle></theme-toggle>
        <dynamic-dropdown>
          <user-login></user-login>
        </dynamic-dropdown>
      </div>
    `;
  }
}