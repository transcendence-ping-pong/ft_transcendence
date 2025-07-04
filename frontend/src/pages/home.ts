import '@/components/ThemeToggle.js';
import '@/components/DynamicDropdown.js';
import '@/components/MenuNavigation.js';

export function renderHome(containerId: string) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="w-full flex items-center justify-between px-8 py-3 border-b-2 border-[color:var(--border)] bg-[color:var(--body)] min-h-[56px]">
        <dynamic-dropdown>
          <span slot="app-name">FOUR PING TWO PONG</span>
          <menu-navigation></menu-navigation>
        </dynamic-dropdown>
        <theme-toggle class="ml-6"></theme-toggle>
      </div>
      // HOME CONTENT >>>
    `;
  }
}