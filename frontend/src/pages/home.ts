import '@/components/navigation/ThemeToggle.js';
import '@/components/navigation/LanguagesDropdown.js';
import '@/components/navigation/TopBar.js';
import '@/components/navigation/StartGameButton.js';
import '@/components/navigation/Logo.js';
import '@/components/notification/ToogleChatBox.js';

// chat-box removed from delivery scope
import { logout } from '@/services/authService.js';

export function renderHome(containerId: string) {
  const container = document.getElementById(containerId);
  let onLastMatchSummary: ((e: any) => void) | undefined;
  let onLogoutBtnClick: (() => void) | undefined;

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
      onLogoutBtnClick = async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          await logout(refreshToken);
        } else {
          window.dispatchEvent(new CustomEvent('logout', { bubbles: true, composed: true }));
        }
      };
      logoutBtn.addEventListener('click', onLogoutBtnClick);
    }
  }

  // show last match summary if any
  try {
    const showSummary = (summary) => {
      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:5000;background:rgba(0,0,0,0.6);color:white;padding:8px 12px;border-radius:8px;';
      const reason = summary?.reason === 'opponentLeft' ? 'opponent left' : 'score';
      const scoreText = summary?.score ? `${summary.score.LEFT}–${summary.score.RIGHT}` : '';
      el.textContent = `Match ended: ${summary.winner}${scoreText ? ' ' + scoreText : ''}${reason ? ' (' + reason + ')' : ''}`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3500);

      // also enqueue a system message into chat storage and ping chat-panel
      try {
        const msgText = `Match ended: ${summary.host ?? ''}${summary.host && summary.guest ? ' vs ' : ''}${summary.guest ?? ''} — Winner: ${summary.winner}${scoreText ? ' (' + scoreText + ')' : ''}${reason ? ' - ' + reason : ''}`.replace(/\s+/g, ' ').trim();
        const stored = localStorage.getItem('chatMessages');
        const arr = stored ? JSON.parse(stored) : [];
        arr.push({ sender: '', message: msgText, type: 'system', category: 'global', timestamp: Date.now() });
        localStorage.setItem('chatMessages', JSON.stringify(arr));
        window.dispatchEvent(new CustomEvent('chatSystemMessage', { detail: { message: msgText, timestamp: Date.now() } }));
      } catch { }
    };

    onLastMatchSummary = (e: any) => showSummary(e.detail);
    window.addEventListener('lastMatchSummary', onLastMatchSummary);

    const cached = localStorage.getItem('lastMatchSummary');
    if (cached) {
      const s = JSON.parse(cached);
      showSummary(s);
      localStorage.removeItem('lastMatchSummary');
    }
  } catch { }

  // Expose cleanup for router navigation or hot reload
  (window as any).cleanupHome = () => {
    // Remove event listeners to prevent leaks
    if (onLastMatchSummary) {
      window.removeEventListener('lastMatchSummary', onLastMatchSummary);
    }
    const container = document.getElementById(containerId);
    if (container && onLogoutBtnClick) {
      const logoutBtn = container.querySelector('#logoutBtn');
      if (logoutBtn) {
        logoutBtn.removeEventListener('click', onLogoutBtnClick);
      }
    }
  };
}
