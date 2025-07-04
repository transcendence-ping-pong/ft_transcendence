import '@/components/ThemeToggle.js'; // This registers <toggle-switch>
import '@/components/DynamicDropdown.js';
import '@/components/MenuNavigation.js';

export function renderHome(containerId: string) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="flex flex-col justify-center items-center gap-4">
        <theme-toggle></theme-toggle>
        <dynamic-dropdown>
          <span slot="app-name">FOUR PING TWO PONG</span>
          <menu-navigation></menu-navigation>
        </dynamic-dropdown>
      </div>
    `;
  }
}
