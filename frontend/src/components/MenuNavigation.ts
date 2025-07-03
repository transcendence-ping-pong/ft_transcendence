const template = document.createElement('template');
template.innerHTML = `
  <style>
    nav a, nav button {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--accent, #5be9b9);
      text-decoration: none;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      text-align: left;
      padding: 0.25rem 0;
      transition: color 0.2s;
    }
    nav a:hover, nav button:hover {
      color: var(--border, #222);
    }
    label {
      font-size: 0.9rem;
      color: var(--border, #222);
    }
    select {
      margin-left: 0.5rem;
      font-size: 1rem;
    }
  </style>
  <nav>
    <a href="/" class="block mb-2">Home</a>
    <a href="/game" class="block mb-2">Game</a>
    <a href="/settings" class="block mb-2">Settings</a>
    <button>Logout</button>
    <div class="mt-2">
      <label>Language:
        <select>
          <option>EN</option>
          <option>ES</option>
        </select>
      </label>
    </div>
  </nav>
`;

export class MenuNavigation extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
  }
}

customElements.define('menu-navigation', MenuNavigation);
