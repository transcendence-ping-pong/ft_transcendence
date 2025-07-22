import '@/components/ThemeToggle.js'; // This registers <toggle-switch>
import '@/components/DynamicDropdown.js';
import '@/components/UserLogin.js';

export function renderLogin(containerId: string) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="w-full flex items-center justify-between px-8 py-3 border-b-2 border-[color:var(--border)] bg-[color:var(--body)] min-h-[56px]">
        <theme-toggle></theme-toggle>
        <dynamic-dropdown>
        <span slot="app-name">FOUR PING TWO PONG</span>
          <user-login></user-login>
        </dynamic-dropdown>
      </div>
    `;
  }
}