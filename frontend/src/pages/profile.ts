import '@/components/ThemeToggle.js'; // This registers <toggle-switch>
import '@/components/UserSignin.js';
import '@/components/LanguagesDropdown.js';

export function renderProfile(containerId: string, params: Record<string, string> = {}) {
  const container = document.getElementById(containerId);
  const username = params.username;
  if (container) {
    container.innerHTML = `
      <section class="profile-page flex flex-col items-center justify-center h-screen w-screen bg-[var(--body)]">
        <div class="profile-card bg-[var(--accent)] p-8 rounded-lg shadow-lg text-center">
          <img src="https://api.dicebear.com/7.x/pixel-art/svg?seed=${username}" alt="Avatar" class="mx-auto mb-4 w-24 h-24 rounded-full" />
          <h2 class="text-3xl font-bold mb-2">${username}</h2>
          <p class="text-lg text-[var(--text)]">Welcome to ${username}'s profile page!</p>
        </div>
      </section>
    `;
  }
}