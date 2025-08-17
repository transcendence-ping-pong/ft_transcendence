import { t } from '@/locales/Translations';
import * as authService from '@/services/authService.js';
import '@/components/navigation/TopBar.js';
import '@/components/navigation/ThemeToggle.js';
import '@/components/authentication/UserSignin.js';
import '@/components/navigation/LanguagesDropdown.js';
import '@/components/profile/UserProfileForm.js';
import '@/components/profile/AtariBadge.js';
import '@/components/_templates/GenericModal.js';
import '@/components/MatchesHistory.js';
import '@/components/profile/DeleteProfile.js';
import '@/components/profile/QrAuthentication.js';

export function renderProfile(containerId: string, params: Record<string, string> = {}) {
  // document.body.classList.add('overflow-hidden'); // prevent scrolling
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

      <section class="screen-2 h-screen w-screen">
        <div class="page-container">
          <matches-history></matches-history>
        </div>
    `;

    window.addEventListener('delete-profile', (e: CustomEvent) => {
      if (!container) return;
      container.insertAdjacentHTML('beforeend', `
      <generic-modal dismissible="true" small appear-delay="500">
        <delete-profile slot="body"></delete-profile>
      </generic-modal>
    `);
    });

    function handleEnable2fa() {
      if (!container) return;
      container.insertAdjacentHTML('beforeend', `
      <generic-modal dismissible="true" large appear-delay="500">
        <qr-authentication slot="body"></qr-authentication>
      </generic-modal>
    `);
    }
    window.removeEventListener('configenable2fa', handleEnable2fa);
    window.addEventListener('config-enable2fa', handleEnable2fa);
  }
}
