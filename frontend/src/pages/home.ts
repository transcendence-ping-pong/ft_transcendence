import '@/components/ThemeToggle.js';
import '@/components/LanguagesDropdown.js';
import '@/components/TopBar.js';
import '@/components/NotificationsBar.js';

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
        <img slot="logo" src="https://api.dicebear.com/7.x/pixel-art/svg?seed=octopus" alt="Logo" />
        <span slot="title">FOUR PING TWO PONG</span>
        <theme-toggle slot="toggle"></theme-toggle>
        <languages-dropdown slot="language"></languages-dropdown>
      </top-bar>

      <notifications-bar></notifications-bar>

      <section class="screen-1 relative flex items-center justify-center h-screen w-screen">
        <div class="intro-text text-4xl text-white text-center z-10">[PLACEHOLDER]</div>
      </section>
    `;
  }
}

// <img slot="avatar" src="https://api.dicebear.com/7.x/pixel-art/svg?seed=robot" alt="Avatar" />

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