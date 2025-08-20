import '@/components/navigation/TopBar.js';
import '@/components/navigation/Logo.js';
import '@/components/navigation/StartGameButton.js';
import '@/components/navigation/ThemeToggle.js';
import '@/components/authentication/UserSignin.js';
import '@/components/navigation/LanguagesDropdown.js';
import '@/components/profile/UserProfileForm.js';
import '@/components/profile/AtariBadge.js';
import '@/components/_templates/GenericModal.js';
import '@/components/profile/MatchesHistory.js';
import '@/components/profile/DeleteProfile.js';
import '@/components/profile/QrAuthentication.js';
import * as friendsService from '@/services/friendsService.js';
import { state } from '@/state.js';

// keep reference to handlers so we can remove them later
let lastContainer: HTMLElement | null = null;

// TODO: doesnt this event listener needs to be global?
// improvement: couldnt I just add it to the component?
function handleDeleteProfile(e: CustomEvent) {
  if (!lastContainer) return;
  lastContainer.insertAdjacentHTML('beforeend', `
    <generic-modal dismissible="true" appear-delay="500">
      <delete-profile slot="body"></delete-profile>
    </generic-modal>
  `);
}

function handleEnable2fa() {
  if (!lastContainer) return;
  lastContainer.insertAdjacentHTML('beforeend', `
    <generic-modal dismissible="true" appear-delay="500">
      <qr-authentication slot="body"></qr-authentication>
    </generic-modal>
  `);
}

export async function renderProfile(containerId: string, params: Record<string, string> = {}) {
  let userData: {};
  const container = document.getElementById(containerId);
  lastContainer = container; // update reference for handlers

  if (setCurrentProfile(params.username)) {
    userData = state.userData;
  } else {
    userData = await friendsService.getUserProfile(params.username);
  }

  if (container) {
    container.innerHTML = `
      <top-bar>
        <pong-logo slot="logo"></pong-logo>
        <start-game-button slot="logo-center"></start-game-button>
        <theme-toggle slot="toggle"></theme-toggle>
        <languages-dropdown slot="language"></languages-dropdown>
        <img slot="avatar" src="https://api.dicebear.com/7.x/pixel-art/svg?seed=robot" alt="Avatar" />
        <button slot="logout" id="logoutBtn">
          <img src="https://unpkg.com/pixelarticons@1.8.1/svg/logout.svg" alt="Logout" style="width:22px;height:22px;filter:invert(1);" />
          Logout
        </button>
      </top-bar>
      <section class="screen-1 h-screen w-screen">
        <div class="page-container flex justify-between items-center">
          <atari-badge userdata='${JSON.stringify(userData)}'></atari-badge>
          <user-profile-form userdata='${JSON.stringify(userData)}'></user-profile-form>          
        </div>
      </section>
      <section class="screen-2 h-screen w-screen">
        <div class="page-container">
          <matches-history userdata='${JSON.stringify(userData)}'></matches-history>
        </div>
      </section>
    `;

    // always remove previous listeners before adding new ones
    window.removeEventListener('delete-profile', handleDeleteProfile as EventListener);
    window.removeEventListener('config-enable2fa', handleEnable2fa as EventListener);

    window.addEventListener('delete-profile', handleDeleteProfile as EventListener);
    window.addEventListener('config-enable2fa', handleEnable2fa as EventListener);
  }
}

// check if the current path is the user's profile...
// ...as there are features specific to admin rights, e.g. delete account
// we are going to show profile differently if it's a visitor
function setCurrentProfile(paramsUsername: string) {
  const mainUsername = state.userData?.username || '';
  return paramsUsername === mainUsername;
}
