import '@/components/navigation/ThemeToggle.js';
import '@/components/navigation/LanguagesDropdown.js';
import '@/components/navigation/TopBar.js';
import '@/components/navigation/StartGameButton.js';
import '@/components/navigation/Logo.js';
import '@/components/notification/ToogleChatBox.js';

import { logout } from '@/services/authService.js';

export function renderHome(containerId: string) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="video-bg-container w-full h-screen relative overflow-hidden">
        <video class="video-bg absolute top-0 left-0 w-full h-full object-cover z-0" autoplay muted loop playsinline>
          <source src="/public/pong_video_1080.mp4" type="video/mp4" />
        </video>
        <div class="fade-bottom"></div>
      </div>

      <top-bar>
        <pong-logo slot="logo"></pong-logo>
        <theme-toggle slot="toggle"></theme-toggle>
        <languages-dropdown slot="language"></languages-dropdown>

        <start-game-button slot="logo-center"></start-game-button>

        <img slot="avatar" src="https://api.dicebear.com/7.x/pixel-art/svg?seed=robot" alt="Avatar" />
        <button slot="logout" id="logoutBtn">
          <img src="https://unpkg.com/pixelarticons@1.8.1/svg/logout.svg" alt="Logout" style="width:22px;height:22px;filter:invert(1);" />
          Logout
        </button>
      </top-bar>

      <toggle-chat-box></toggle-chat-box>

      <section class="screen-1 relative flex items-center justify-center h-screen w-screen">
        <div class="intro-text text-4xl text-white text-center z-10">[PLACEHOLDER]</div>
      </section>

      <section class="screen-2 h-screen w-screen"></section>

      <section class="footer">
        <div class="fade-top"></div>
        <img 
          src="/public/footer.png"
          alt="Footer Background"
          class="footer-img"
        />
      </section>
    `;

    const logoutBtn = container.querySelector('#logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          await logout(refreshToken);
        } else {
          window.dispatchEvent(new CustomEvent('logout', { bubbles: true, composed: true }));
        }
      });
    }
  }
}
