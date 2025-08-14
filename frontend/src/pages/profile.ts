import { t } from '@/locales/Translations';
import '@/components/TopBar.js';
import '@/components/ThemeToggle.js';
import '@/components/UserSignin.js';
import '@/components/LanguagesDropdown.js';
import '@/components/UserProfileForm.js';
import '@/components/AtariBadge.js';
import '@/components/GenericModal.js';

export function renderProfile(containerId: string, params: Record<string, string> = {}) {
  document.body.classList.add('overflow-hidden'); // prevent scrolling during the profile view
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

      <section class="screen-1 h-screen w-screen">
        <div class="page-container">
          <div class="flex justify-between items-center">
            <atari-badge username="${username}"></atari-badge>
            <user-profile-form></user-profile-form>
          </div>
        </div>
      </section>
    `;

    window.addEventListener('view-matches-history', (e: CustomEvent) => {
      // show the modal with matches history
      container.insertAdjacentHTML('beforeend', `
        <generic-modal dismissible="true" appear-delay="500">
          <div slot="body">HELLO</div>
        </generic-modal>
      `);
    });
  }
}
