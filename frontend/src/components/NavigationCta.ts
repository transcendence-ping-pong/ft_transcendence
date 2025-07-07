const navIcons = {
  home: `<img src="https://unpkg.com/pixelarticons@1.8.1/svg/home.svg" />`,
  settings: `<img src="https://unpkg.com/pixelarticons@1.8.1/svg/user.svg" />`,
  game: `<img src="https://unpkg.com/pixelarticons@1.8.1/svg/gamepad.svg" />`,
  ranking: `<img src="https://unpkg.com/pixelarticons@1.8.1/svg/trophy.svg" />`,
  logout: `<img src="https://unpkg.com/pixelarticons@1.8.1/svg/logout.svg" />`,
};

const template = document.createElement('template');
template.innerHTML = `
  <style>
    .nav-btn {
      background: var(--accent);
      border: 1px solid var(--border);
      cursor: pointer;
      width: 2.5rem;
      height: 2.5rem;
      color: var(--border);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin: 0 0.25rem;
      transition: color 0.2s, background 0.2s, transform 0.18s cubic-bezier(.4,2,.6,1);
    }
    .nav-btn:hover, .nav-btn:focus {
      transform: scale(1.5);
      background: var(--nav-hover);
      box-shadow: 0 4px 16px #0004;
    }
    .logout:hover, .logout:focus {
      background: var(--warning);
    }
    .icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.3rem;
      height: 1.3rem;
    }
  </style>
  <button class="nav-btn" id="home" title="Home" aria-label="Home">${navIcons.home}</button>
  <button class="nav-btn" id="home" title="Home" aria-label="Home">${navIcons.settings}</button>
  <button class="nav-btn" id="game" title="Game" aria-label="Game">${navIcons.game}</button>
  <button class="nav-btn" id="game" title="Ranking" aria-label="Game">${navIcons.ranking}</button>
  <button class="nav-btn logout" id="profile" title="Logout" aria-label="Profile">${navIcons.logout}</button>
`;

export class NavigationCta extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.shadowRoot?.getElementById('home')?.addEventListener('click', () => {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new Event('popstate')); // trigger SPA re-render if needed
    });
    this.shadowRoot?.getElementById('game')?.addEventListener('click', () => {
      window.history.pushState({}, '', '/game');
      window.dispatchEvent(new Event('popstate'));
    });
    // this.shadowRoot?.getElementById('tournament')?.addEventListener('click', () => {
    //   window.history.pushState({}, '', '/game');
    //   window.dispatchEvent(new Event('popstate'));
    // });
    // this.shadowRoot?.getElementById('logout')?.addEventListener('click', () => {
    //   window.history.pushState({}, '', '/profile');
    //   window.dispatchEvent(new Event('popstate'));
    // });
  }
}

customElements.define('navigation-cta', NavigationCta);