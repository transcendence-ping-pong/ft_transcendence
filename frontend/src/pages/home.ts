import '@/components/ThemeToggle.js';
import '@/components/DynamicDropdown.js';
import '@/components/MenuNavigation.js';
import '@/components/NavigationCta.js';
import '@/components/LanguagesDropdown.js';
import '@/components/RadialNav.js';

export function renderHome(containerId: string) {
  const container = document.getElementById(containerId);
  if (container) {
    const nav = [
      { "id": "nav-settings", "icon": "settings", "label": "Settings", "action": "settings", "path": "/settings" },
      { "id": "nav-game", "icon": "game", "label": "Game", "action": "game", "path": "/game" },
      { "id": "nav-logout", "icon": "logout", "label": "Logout", "action": "logout", "path": "/logout" },
      { "id": "nav-ranking", "icon": "ranking", "label": "Ranking", "action": "ranking", "path": "/ranking" }
    ]

    container.innerHTML = `
      <div class="video-bg-container">
        <video class="video-bg" autoplay muted loop playsinline>
          <source src="/public/pong_video_1080.mp4" type="video/mp4" />
        </video>

        <div class="w-full flex items-center justify-between px-8 py-3 min-h-[48px] backdrop-blur-md bg-black/10">
          <div class="flex items-center gap-4">
            <theme-toggle></theme-toggle>
            <languages-dropdown></languages-dropdown>
          </div>
        </div>

        <div class="navbar">
          <radial-nav nav='${JSON.stringify(nav)}'>
            <img slot="logo" src="/logo.png" alt="Logo" />
          </radial-nav>
        </div>
      </div>
    `;
  }
}

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
*/