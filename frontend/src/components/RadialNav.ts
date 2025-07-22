import { navigate } from '@/main.js';

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
    :host {
      position: fixed;
      top: 10rem;
      left: 50%;
      z-index: 2000;
      user-select: none;
      transform: translateX(-50%);
    }
    .radial-nav__container {
      position: relative;
      width: 200px;
      height: 200px;
    }
    .radial-nav__logo {
      position: absolute;
      width: 64px;
      height: 64px;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      background: var(--accent, #b8a77a);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 8px #0002;
      z-index: 2;
    }
    .radial-nav__logo img {
      width: 48px;
      height: 48px;
      border-radius: 50%;
    }
    .radial-nav__shadow {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 350px;
      height: 350px;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      pointer-events: none;
      opacity: 0;
      z-index: 0;
      background: radial-gradient(circle, rgba(0, 0, 0, 0.65) 0%, transparent 60%, transparent 100%);
      transition: opacity 0.35s cubic-bezier(.4,2,.6,1);
    }
    .radial-nav__container.open .radial-nav__shadow {
      opacity: 1;
    }
    .radial-nav__buttons {
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      z-index: 1;
      pointer-events: none;
    }
    .radial-nav__button {
      position: absolute;
      min-width: 90px;
      height: 38px;
      border: 1px solid var(--border);
      background: var(--body);
      box-shadow: 0 2px 8px #0002;
      cursor: pointer;
      opacity: 0;
      pointer-events: auto;
      transition: opacity 0.2s, transform 0.2s;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 0.5rem;
      padding: 0 0.9rem 0 0.5rem;
      white-space: nowrap;
    }
    .radial-nav__button:hover,
    .radial-nav__button:focus {
      transform: scale(1.05);
      box-shadow: 0 4px 16px #0004;
      background: var(--accent);
    }
    .radial-nav__button img {
      width: 22px;
      height: 22px;
      filter: invert(var(--invert));
      margin-right: 0.3rem;
    }
    .radial-nav__container.open .radial-nav__button {
      opacity: 1;
    }
    .radial-nav__button span {
      font-size: 1rem;
      font-weight: 500;
      color: var(--border);
      letter-spacing: 0.5px;
    }
  </style>

  <div class="radial-nav__container">
    <div class="radial-nav__logo" tabindex="0">
      <slot name="logo">
        <img src="https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg" alt="Logo" />
      </slot>
    </div>
    <div class="radial-nav__shadow"></div>
    <div class="radial-nav__buttons"></div>
  </div>
`;

export class RadialNav extends HTMLElement {
  static get observedAttributes() { return ['nav']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this._renderMenu();
    const container = this.shadowRoot.querySelector('.radial-nav__container');
    const logo = this.shadowRoot.querySelector('.radial-nav__logo');
    const buttons = this.shadowRoot.querySelector('.radial-nav__buttons');
    // open menu on hover/focus
    logo.addEventListener('mouseenter', () => container.classList.add('open'));
    logo.addEventListener('mouseleave', () => container.classList.remove('open'));
    logo.addEventListener('focus', () => container.classList.add('open'));
    logo.addEventListener('blur', () => container.classList.remove('open'));
    // keep menu open when hovering menu itself
    buttons.addEventListener('mouseenter', () => container.classList.add('open'));
    buttons.addEventListener('mouseleave', () => container.classList.remove('open'));
    // logo click: go home by default
    logo.addEventListener('click', () => {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new Event('popstate'));
    });
  }

  attributeChangedCallback() {
    this._renderMenu();
  }

  _renderMenu() {
    const navAttr = this.getAttribute('nav');
    const buttons = this.shadowRoot.querySelector('.radial-nav__buttons');
    buttons.innerHTML = '';
    if (!navAttr) return;
    let items = [];
    try {
      items = JSON.parse(navAttr);
    } catch { }
    const baseGap = 24; // left/right gap for buttons spacing
    const minGap = -4; // top/bottom gap for buttons spacing
    const logoRadius = 32;
    const buttonHeight = 38;
    const buttonMinWidth = 90;
    const center = { x: 100, y: 100 };
    const totalItems = items.length;

    items.forEach((item, i) => {
      const angle = (2 * Math.PI / totalItems) * i - Math.PI / 2;
      const btn = document.createElement('button');
      btn.className = 'radial-nav__button';
      btn.id = item.id;
      btn.title = item.label;
      btn.innerHTML = `${navIcons[item.icon] || ''}<span>${item.label}</span>`;
      buttons.appendChild(btn);
      const btnRect = btn.getBoundingClientRect();
      const btnWidth = btnRect.width || buttonMinWidth;
      const btnHalfWidth = btnWidth / 2;
      const btnHalfHeight = buttonHeight / 2;
      buttons.removeChild(btn);

      const gap = minGap + (baseGap - minGap) * Math.pow(Math.cos(angle), 2);

      const distance = logoRadius + gap + btnHalfWidth;
      const x = center.x + distance * Math.cos(angle) - btnHalfWidth;
      const y = center.y + distance * Math.sin(angle) - btnHalfHeight;

      btn.style.left = `${x}px`;
      btn.style.top = `${y}px`;

      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (item.path) {
          navigate(item.path);
        }
        this.dispatchEvent(new CustomEvent('action', { detail: item.action, bubbles: true }));
      });

      buttons.appendChild(btn);
    });
  }
}
customElements.define('radial-nav', RadialNav);
