import '@/components/navigation/ThemeToggle.js';
import '@/components/navigation/LanguagesDropdown.js';
import '@/components/navigation/TopBar.js';
import '@/components/navigation/StartGameButton.js';
import '@/components/navigation/Logo.js';
// notifications UI removed for delivery scope

import '@/components/notification/FriendsList.js';
import '@/components/notification/ChatBox.js'
import { logout } from '@/services/authService.js';
import { state } from '@/state.js';

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

      

      <section class="screen-1 relative flex items-center justify-center h-screen w-screen">
        <div class="intro-text text-4xl text-white text-center z-10">[PLACEHOLDER]</div>
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

  // show last match summary if any
  try {
    const container = document.getElementById(containerId);
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
      } catch {}
    };
    window.addEventListener('lastMatchSummary', (e: any) => showSummary(e.detail));
    const cached = localStorage.getItem('lastMatchSummary');
    if (cached) {
      const s = JSON.parse(cached);
      showSummary(s);
      localStorage.removeItem('lastMatchSummary');
    }
  } catch {}
}

// <friends-list slot="friends-list" mode="full"></friends-list>

/*
TODO:
add friends bar
add online players bar

<section class="screen-2 flex items-center justify-center h-screen w-screen bg-[var(--body)]">
  <div class="second-screen-content max-w-xl mx-auto text-center text-[var(--text)]">
    <h2 class="text-2xl font-bold mb-4">About the Game</h2>
    <p>Challenge your friends in a new pong experience!</p>
  </div>
</section>
*/

// TODO: Lets play??

/*
TODO: image fallback and video sources for different resolutions
<video autoplay muted loop playsinline>
  <source src="video-1080p.mp4" media="(min-width: 768px)">
  <source src="video-480p.mp4" media="(max-width: 767px)">
  Your browser does not support the video tag.
</video>
*/

/*
OBSOLETE NAVIGATION BAR VERSION
<dynamic-dropdown>
  <navigation-cta slot="nav-buttons"></navigation-cta>
  <span slot="app-name">FOUR PING TWO PONG</span>
  <menu-navigation></menu-navigation>
</dynamic-dropdown>

<div class="w-full flex items-center justify-between px-8 py-3 min-h-[48px] backdrop-blur-md bg-black/10">
  <div class="flex items-center gap-4">
    <theme-toggle></theme-toggle>
    <languages-dropdown></languages-dropdown>
  </div>
</div>
*/