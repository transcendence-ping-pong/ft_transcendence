import { t } from '@/locales/Translations';
import '@/components/TopBar.js';
import '@/components/ThemeToggle.js'; // This registers <toggle-switch>
import '@/components/UserSignin.js';
import '@/components/LanguagesDropdown.js';
import '@/components/UserProfileForm.js';
import '@/components/AtariBadge.js';

export function renderProfile(containerId: string, params: Record<string, string> = {}) {
  const container = document.getElementById(containerId);
  const username = params.username;
  if (container) {
    container.innerHTML = `
    <top-bar>
        <img slot="logo" src="/public/logo.png" alt="Logo" />
        <span slot="title">FOUR PING TWO PONG</span>
        <theme-toggle slot="toggle"></theme-toggle>
        <languages-dropdown slot="language"></languages-dropdown>
        <img slot="avatar" src="https://api.dicebear.com/7.x/pixel-art/svg?seed=robot" alt="Avatar" />
        <button slot="logout" id="logoutBtn">
          <img src="https://unpkg.com/pixelarticons@1.8.1/svg/logout.svg" alt="Logout" style="width:22px;height:22px;filter:invert(1);" />
          Logout
        </button>
      </top-bar>

      <section class="screen-1 relative flex items-center justify-center h-screen w-screen">
        <atari-badge username="${username}" style="--badge-x: 60%;"></atari-badge>
      </section>
    `;
  }
}
