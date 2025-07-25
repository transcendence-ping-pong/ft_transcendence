import '@/components/ThemeToggle.js';
import '@/components/DynamicDropdown.js';
import '@/components/MenuNavigation.js';
import '@/components/NavigationCta.js';

export function renderHome(containerId: string) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `
      <div class="video-bg-container">
        <video class="video-bg" autoplay muted loop playsinline>
          <source src="/public/pong_video_1080.mp4" type="video/mp4" />
        </video>
        <div class="content">
          <!-- Your content here -->
          <div class="w-full flex items-center justify-between px-8 py-3 border-b-2 border-[color:var(--border)] bg-[color:var(--body)] min-h-[56px]">
            <dynamic-dropdown>
              <navigation-cta slot="nav-buttons"></navigation-cta>
              <span slot="app-name">FOUR PING TWO PONG</span>
              <menu-navigation></menu-navigation>
            </dynamic-dropdown>
            <theme-toggle class="ml-6"></theme-toggle>
          </div>
          // HOME CONTENT >>>
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